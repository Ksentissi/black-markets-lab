"""
Main application server — Flask + Flask-SocketIO.

Serves:
  REST  POST /api/simulate    — pre-compute a full price simulation
  WS    Socket.IO             — multiplayer room management + real-time game ticks

Run with:
    python app.py
"""

import random
import threading
import time

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

from calculs import simulate_stock_prices
from config import (
    AVAILABLE_STOCKS,
    EVENTS_DATABASE,
    GAME_DURATION_SECONDS,
    GAME_SIMULATION_STEPS,
    INITIAL_CAPITAL,
    INSIGHT_COST,
    REFLECTION_PERIOD_SECONDS,
    STOCK_METADATA,
)
from insights import generate_insight_schedule
from room_manager import (
    add_player,
    compute_leaderboard,
    create_room,
    execute_buy,
    execute_buy_insight,
    execute_sell,
    get_room,
    get_room_players,
    remove_player,
    sample_net_worth,
    serialize_player_state,
)

# ─── Flask + SocketIO setup ───────────────────────────────────────────────────

app = Flask(__name__)
app.config["SECRET_KEY"] = "black-scholes-game-secret"

CORS(
    app,
    resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}},
)

socketio = SocketIO(
    app,
    cors_allowed_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    async_mode="threading",
    logger=False,
    engineio_logger=False,
)

# ─── Simulation helpers ────────────────────────────────────────────────────────

_SIM_TIME = 2          # years (Black-Scholes time horizon)

def _build_simulation(stock_configs: list[dict], stock_names: list[str], num_steps: int) -> dict:
    prices, volatilities = simulate_stock_prices(
        num_simulations=len(stock_configs),
        time=_SIM_TIME,
        num_steps=num_steps,
        stock_configs=stock_configs,
    )
    timeline = np.linspace(0, _SIM_TIME, num_steps).tolist()
    series = [
        {
            "name": stock_names[i],
            "volatility": float(volatilities[i]),
            "values": prices[i].tolist(),
            "metadata": STOCK_METADATA.get(stock_names[i], {}),
        }
        for i in range(len(stock_names))
    ]
    return {
        "timestamps": timeline,
        "series": series,
        "max_y": float(prices.max() * 1.2),
        "events": EVENTS_DATABASE,
    }


# ─── REST endpoint ─────────────────────────────────────────────────────────────

@app.route("/api/simulate", methods=["GET", "POST"])
def api_simulate():
    """
    Returns a complete pre-computed simulation.

    POST body (optional):
        { "stocks": [...], "num_steps": 252 }

    Stocks can be a list of strings (names) or dicts
        { "name", "volatility", "initial_price" }.
    """
    stock_configs: list[dict] = []
    output_names: list[str] = []

    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        stocks_input = data.get("stocks", [])
        num_steps = int(data.get("num_steps", 252))

        if stocks_input and isinstance(stocks_input[0], dict):
            for s in stocks_input:
                name = s.get("name", "Unknown")
                output_names.append(name)
                cfg: dict = {}
                if "initial_price" in s:
                    cfg["initial_price"] = float(s["initial_price"])
                if "volatility" in s:
                    cfg["volatility"] = float(s["volatility"])
                stock_configs.append(cfg)
        elif stocks_input and isinstance(stocks_input[0], str):
            for name in stocks_input:
                if name in AVAILABLE_STOCKS:
                    output_names.append(name)
                    stock_configs.append({})
    else:
        num_steps = 252

    if not stock_configs:
        output_names = AVAILABLE_STOCKS[:5]
        stock_configs = [{} for _ in output_names]

    game_data = _build_simulation(stock_configs, output_names, num_steps)
    # Include insight schedule so the client can use it in solo mode
    game_data["insightSchedule"] = generate_insight_schedule(game_data)
    return jsonify(game_data)


# ─── Socket.IO — Room lifecycle ───────────────────────────────────────────────

@socketio.on("room:create")
def handle_create_room(data):
    player_name = (data.get("playerName") or "Host").strip()[:30]
    difficulty = data.get("difficulty", "Medium")
    num_stocks = min(int(data.get("numStocks", 4)), 6)

    selected = random.sample(AVAILABLE_STOCKS, num_stocks)
    config = {"difficulty": difficulty, "numStocks": num_stocks, "stocks": selected}

    room = create_room(request.sid, player_name, config)
    room_id = room["room_id"]

    join_room(room_id)

    emit("room:created", {
        "roomId": room_id,
        "players": get_room_players(room),
        "isHost": True,
        "config": config,
    })


@socketio.on("room:join")
def handle_join_room(data):
    room_id = (data.get("roomId") or "").upper().strip()
    player_name = (data.get("playerName") or "Player").strip()[:30]

    room = get_room(room_id)
    if room is None:
        emit("error", {"message": f"Room {room_id} not found."})
        return

    if not add_player(room, request.sid, player_name):
        emit("error", {"message": "Cannot join room — it may be full or already started."})
        return

    join_room(room_id)

    # Notify everyone in the room (including the new joiner)
    socketio.emit("room:player_joined", {
        "players": get_room_players(room),
        "roomId": room_id,
    }, room=room_id)

    emit("room:joined", {
        "roomId": room_id,
        "players": get_room_players(room),
        "isHost": False,
        "config": room["config"],
    })


@socketio.on("room:leave")
def handle_leave_room(data):
    room_id = (data.get("roomId") or "").upper()
    room = get_room(room_id)
    if not room:
        return

    with room["lock"]:
        remove_player(room, request.sid)
        leave_room(room_id)

        if not room["players"]:
            from room_manager import remove_room
            remove_room(room_id)
            return

        # Transfer host if needed
        if room["host_sid"] == request.sid and room["players"]:
            room["host_sid"] = next(iter(room["players"]))

    socketio.emit("room:player_left", {"players": get_room_players(room)}, room=room_id)


@socketio.on("disconnect")
def handle_disconnect():
    # Clean up any rooms this player is in
    sid = request.sid
    for room in list(rooms_snapshot()):
        if sid in room["players"]:
            handle_leave_room({"roomId": room["room_id"]})
            break


def rooms_snapshot():
    """Thread-safe snapshot of all rooms (avoids dict-size-change during iteration)."""
    from room_manager import rooms
    return list(rooms.values())


# ─── Socket.IO — Game lifecycle ───────────────────────────────────────────────

@socketio.on("game:start_session")
def handle_start_session(data):
    """Host triggers game start. Server builds simulation and broadcasts game data."""
    room_id = (data.get("roomId") or "").upper()
    room = get_room(room_id)

    if room is None or request.sid != room["host_sid"]:
        emit("error", {"message": "Only the host can start the game."})
        return

    if room["status"] != "waiting":
        emit("error", {"message": "Game already started."})
        return

    config = room["config"]
    stock_configs = [{"initial_price": random.uniform(75, 300)} for _ in config["stocks"]]

    game_data = _build_simulation(stock_configs, config["stocks"], GAME_SIMULATION_STEPS)
    insight_schedule = generate_insight_schedule(game_data)

    with room["lock"]:
        room["game_data"] = game_data
        room["insight_schedule"] = insight_schedule
        room["status"] = "reflection"
        room["current_index"] = 0
        room["time_left"] = GAME_DURATION_SECONDS

    # Reset all player states so re-starts are clean
    for player in room["players"].values():
        player.update(create_fresh_player_fields())

    socketio.emit("game:reflection", {
        "gameData": game_data,
        "insightSchedule": insight_schedule,
        "reflectionSeconds": REFLECTION_PERIOD_SECONDS,
    }, room=room_id)

    # Start the tick loop after the reflection period
    task = threading.Thread(
        target=_run_game_loop,
        args=(room_id, REFLECTION_PERIOD_SECONDS),
        daemon=True,
    )
    room["_tick_task"] = task
    task.start()


def create_fresh_player_fields() -> dict:
    return {
        "balance": INITIAL_CAPITAL,
        "portfolio": {},
        "cost_basis": {},
        "transactions": [],
        "purchased_insights": [],
        "realized_pnl": 0.0,
        "net_worth_history": [],
    }


def _run_game_loop(room_id: str, initial_delay: float) -> None:
    """
    Background thread that drives the multiplayer game tick.

    Waits for the reflection period, then advances currentIndex at a rate
    that maps GAME_SIMULATION_STEPS steps to GAME_DURATION_SECONDS seconds.
    """
    time.sleep(initial_delay)

    room = get_room(room_id)
    if room is None:
        return

    total_steps = len(room["game_data"]["timestamps"])
    tick_interval = GAME_DURATION_SECONDS / total_steps

    with room["lock"]:
        room["status"] = "playing"

    socketio.emit("game:start", {}, room=room_id)

    while True:
        time.sleep(tick_interval)

        room = get_room(room_id)
        if room is None:
            return

        with room["lock"]:
            if room["status"] != "playing":
                break

            room["current_index"] += 1
            idx = room["current_index"]
            elapsed_frac = idx / total_steps
            room["time_left"] = max(0, int(GAME_DURATION_SECONDS * (1 - elapsed_frac)))

            # Record net-worth history for each player
            for player in room["players"].values():
                sample_net_worth(player, room)

            leaderboard = compute_leaderboard(room)

        socketio.emit("game:tick", {
            "currentIndex": idx,
            "timeLeft": room["time_left"],
            "leaderboard": leaderboard,
        }, room=room_id)

        if room["time_left"] <= 0 or idx >= total_steps - 1:
            break

    room = get_room(room_id)
    if room is None:
        return

    with room["lock"]:
        room["status"] = "finished"

    socketio.emit("game:over", {
        "leaderboard": compute_leaderboard(room),
    }, room=room_id)


# ─── Socket.IO — Trade actions ────────────────────────────────────────────────

@socketio.on("trade:buy")
def handle_buy(data):
    room_id, room, player = _resolve_player(data)
    if player is None:
        return

    stock = data.get("stock", "")
    quantity = int(data.get("quantity", 0))
    if quantity <= 0:
        emit("error", {"message": "Invalid quantity."})
        return

    with room["lock"]:
        price = _current_price(room, stock)
        ok, msg = execute_buy(player, stock, quantity, price)

    if not ok:
        emit("error", {"message": msg})
        return

    emit("trade:confirmed", serialize_player_state(player, room))
    # Broadcast leaderboard update to the room
    socketio.emit("leaderboard:update", {
        "leaderboard": compute_leaderboard(room),
    }, room=room_id)


@socketio.on("trade:sell")
def handle_sell(data):
    room_id, room, player = _resolve_player(data)
    if player is None:
        return

    stock = data.get("stock", "")
    quantity = int(data.get("quantity", 0))
    if quantity <= 0:
        emit("error", {"message": "Invalid quantity."})
        return

    with room["lock"]:
        price = _current_price(room, stock)
        ok, msg = execute_sell(player, stock, quantity, price)

    if not ok:
        emit("error", {"message": msg})
        return

    emit("trade:confirmed", serialize_player_state(player, room))
    socketio.emit("leaderboard:update", {
        "leaderboard": compute_leaderboard(room),
    }, room=room_id)


@socketio.on("insight:buy")
def handle_buy_insight(data):
    """
    Player purchases an insight.  The insight is informational only —
    it never modifies the simulation data.
    """
    room_id, room, player = _resolve_player(data)
    if player is None:
        return

    step = int(data.get("step", -1))
    insight = next(
        (i for i in room["insight_schedule"] if i["step"] == step), None
    )
    if insight is None:
        emit("error", {"message": "Insight not found."})
        return

    with room["lock"]:
        ok, msg = execute_buy_insight(player, insight)

    if not ok:
        emit("error", {"message": msg})
        return

    # Send the insight content only to the purchasing player
    emit("insight:purchased", {
        "insight": insight,
        "balance": round(player["balance"], 2),
    })


# ─── Socket.IO helpers ────────────────────────────────────────────────────────

def _resolve_player(data: dict):
    """Return (room_id, room, player) or (None, None, None) if lookup fails."""
    room_id = (data.get("roomId") or "").upper()
    room = get_room(room_id)
    if room is None:
        emit("error", {"message": "Room not found."})
        return None, None, None
    player = room["players"].get(request.sid)
    if player is None:
        emit("error", {"message": "Player not in room."})
        return None, None, None
    if room["status"] != "playing":
        emit("error", {"message": "Game is not in progress."})
        return None, None, None
    return room_id, room, player


def _current_price(room: dict, stock: str) -> float:
    idx = room["current_index"]
    for s in room["game_data"]["series"]:
        if s["name"] == stock:
            values = s["values"]
            return float(values[min(idx, len(values) - 1)])
    return 0.0


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=8050, debug=True)
