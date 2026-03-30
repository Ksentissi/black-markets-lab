"""
In-memory multiplayer room and player state management.

Rooms are ephemeral: they live only while the server process is running.
Each room contains shared game data (same simulation for all players) and
per-player state (balance, portfolio, transactions, insights).
"""

import secrets
import threading
from typing import Optional

from config import (
    INITIAL_CAPITAL,
    INSIGHT_COST,
    ROOM_ID_LENGTH,
    NET_WORTH_SAMPLE_EVERY,
)


# ─── In-memory store ───────────────────────────────────────────────────────────
# rooms: { room_id: RoomState }
rooms: dict[str, dict] = {}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def generate_room_id() -> str:
    """Generate a short, uppercase alphanumeric room code (e.g. 'A3F9C1')."""
    while True:
        code = secrets.token_hex(ROOM_ID_LENGTH // 2).upper()
        if code not in rooms:
            return code


def create_player_state(name: str) -> dict:
    return {
        "name": name,
        "balance": INITIAL_CAPITAL,
        "portfolio": {},           # { stock_name: shares_owned }
        "cost_basis": {},          # { stock_name: avg_cost_per_share }
        "transactions": [],        # list of trade records
        "purchased_insights": [],  # list of revealed insight dicts
        "realized_pnl": 0.0,
        "net_worth_history": [],   # sampled { index, value } pairs
    }


def create_room(host_sid: str, player_name: str, config: dict) -> dict:
    """
    Create a new room and return the room dict.
    """
    room_id = generate_room_id()
    room = {
        "room_id": room_id,
        "host_sid": host_sid,
        "status": "waiting",       # waiting | reflection | playing | finished
        "config": config,          # { difficulty, numStocks, stocks }
        "game_data": None,
        "insight_schedule": [],
        "current_index": 0,
        "time_left": 180,
        "players": {
            host_sid: create_player_state(player_name),
        },
        "lock": threading.Lock(),
        "_tick_task": None,        # background thread handle
    }
    rooms[room_id] = room
    return room


def get_room(room_id: str) -> Optional[dict]:
    return rooms.get(room_id)


def remove_room(room_id: str) -> None:
    rooms.pop(room_id, None)


def add_player(room: dict, sid: str, player_name: str) -> bool:
    """Add a player to an existing room. Returns False if room is full or started."""
    from config import MAX_PLAYERS_PER_ROOM
    if room["status"] != "waiting":
        return False
    if len(room["players"]) >= MAX_PLAYERS_PER_ROOM:
        return False
    room["players"][sid] = create_player_state(player_name)
    return True


def remove_player(room: dict, sid: str) -> None:
    room["players"].pop(sid, None)


# ─── Finance helpers ──────────────────────────────────────────────────────────

def get_current_price(room: dict, stock: str) -> float:
    """Return the current simulated price for a stock at the room's current index."""
    idx = room["current_index"]
    for s in room["game_data"]["series"]:
        if s["name"] == stock:
            values = s["values"]
            return float(values[min(idx, len(values) - 1)])
    return 0.0


def compute_net_worth(player: dict, room: dict) -> float:
    net = player["balance"]
    for stock, qty in player["portfolio"].items():
        net += qty * get_current_price(room, stock)
    return net


def compute_unrealized_pnl(player: dict, room: dict) -> float:
    total = 0.0
    for stock, qty in player["portfolio"].items():
        basis = player["cost_basis"].get(stock, 0.0)
        current = get_current_price(room, stock)
        total += qty * (current - basis)
    return total


def compute_leaderboard(room: dict) -> list[dict]:
    """
    Return sorted leaderboard snapshot for the current game state.
    """
    entries = []
    for sid, player in room["players"].items():
        net_worth = compute_net_worth(player, room)
        entries.append(
            {
                "name": player["name"],
                "netWorth": round(net_worth, 2),
                "profit": round(net_worth - INITIAL_CAPITAL, 2),
                "balance": round(player["balance"], 2),
                "realizedPnl": round(player["realized_pnl"], 2),
                "unrealizedPnl": round(compute_unrealized_pnl(player, room), 2),
            }
        )
    entries.sort(key=lambda e: e["netWorth"], reverse=True)
    for i, e in enumerate(entries):
        e["rank"] = i + 1
    return entries


def get_room_players(room: dict) -> list[dict]:
    return [
        {"name": p["name"], "isHost": sid == room["host_sid"]}
        for sid, p in room["players"].items()
    ]


# ─── Trade execution ──────────────────────────────────────────────────────────

def execute_buy(player: dict, stock: str, quantity: int, price: float) -> tuple[bool, str]:
    cost = quantity * price
    if player["balance"] < cost:
        return False, "Insufficient balance"

    player["balance"] -= cost

    prev_qty = player["portfolio"].get(stock, 0)
    prev_basis = player["cost_basis"].get(stock, 0.0)
    new_qty = prev_qty + quantity

    # Update weighted-average cost basis
    player["cost_basis"][stock] = (
        (prev_qty * prev_basis + quantity * price) / new_qty
    )
    player["portfolio"][stock] = new_qty

    player["transactions"].append(
        {"type": "buy", "stock": stock, "qty": quantity, "price": round(price, 2)}
    )
    return True, "ok"


def execute_sell(player: dict, stock: str, quantity: int, price: float) -> tuple[bool, str]:
    owned = player["portfolio"].get(stock, 0)
    if owned < quantity:
        return False, "Insufficient shares"

    revenue = quantity * price
    basis = player["cost_basis"].get(stock, 0.0)
    player["realized_pnl"] += quantity * (price - basis)
    player["balance"] += revenue

    new_qty = owned - quantity
    if new_qty == 0:
        player["portfolio"].pop(stock, None)
        player["cost_basis"].pop(stock, None)
    else:
        player["portfolio"][stock] = new_qty

    player["transactions"].append(
        {"type": "sell", "stock": stock, "qty": quantity, "price": round(price, 2)}
    )
    return True, "ok"


def execute_buy_insight(player: dict, insight: dict) -> tuple[bool, str]:
    """Deduct insight cost and record the purchased insight. Never modifies prices."""
    if player["balance"] < INSIGHT_COST:
        return False, "Insufficient balance for insight"
    player["balance"] -= INSIGHT_COST
    player["purchased_insights"].append(insight)
    return True, "ok"


def sample_net_worth(player: dict, room: dict) -> None:
    """Record a net-worth snapshot if at a sampling boundary."""
    idx = room["current_index"]
    if idx % NET_WORTH_SAMPLE_EVERY == 0:
        nw = compute_net_worth(player, room)
        player["net_worth_history"].append({"index": idx, "value": round(nw, 2)})


def serialize_player_state(player: dict, room: dict) -> dict:
    """Return the player's full state for sending to the client."""
    return {
        "balance": round(player["balance"], 2),
        "portfolio": dict(player["portfolio"]),
        "costBasis": {k: round(v, 2) for k, v in player["cost_basis"].items()},
        "transactions": player["transactions"][-50:],  # last 50 trades
        "purchasedInsights": player["purchased_insights"],
        "realizedPnl": round(player["realized_pnl"], 2),
        "unrealizedPnl": round(compute_unrealized_pnl(player, room), 2),
        "netWorthHistory": player["net_worth_history"],
    }
