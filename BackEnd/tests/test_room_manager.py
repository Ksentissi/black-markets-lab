"""
Tests for multiplayer room management:
  - room creation / joining
  - independent player portfolios
  - leaderboard computation
  - trade execution
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from room_manager import (
    create_room,
    add_player,
    remove_player,
    execute_buy,
    execute_sell,
    execute_buy_insight,
    compute_leaderboard,
    create_player_state,
    get_room_players,
    rooms,
)
from config import INITIAL_CAPITAL, INSIGHT_COST


# ─── Fixtures ─────────────────────────────────────────────────────────────────

def _make_room_with_data(n_players=2):
    """Create a room pre-populated with synthetic game data."""
    import threading
    config = {"difficulty": "Medium", "numStocks": 2, "stocks": ["StockA", "StockB"]}
    room = create_room("sid_host", "Host", config)

    for i in range(1, n_players):
        add_player(room, f"sid_{i}", f"Player{i}")

    # Inject minimal game_data
    n = 200
    room["game_data"] = {
        "timestamps": list(range(n)),
        "series": [
            {"name": "StockA", "values": [100.0] * n, "volatility": 0.2, "metadata": {}},
            {"name": "StockB", "values": [200.0] * n, "volatility": 0.3, "metadata": {}},
        ],
    }
    room["current_index"] = 50

    return room


def teardown_function():
    """Clean up rooms dict between tests."""
    rooms.clear()


# ─── Room lifecycle ────────────────────────────────────────────────────────────

class TestRoomLifecycle:

    def test_create_room_returns_dict(self):
        r = create_room("s1", "Alice", {})
        assert "room_id" in r
        assert r["host_sid"] == "s1"
        assert r["status"] == "waiting"

    def test_room_is_stored_in_registry(self):
        r = create_room("s2", "Bob", {})
        assert r["room_id"] in rooms

    def test_room_ids_are_unique(self):
        ids = {create_room(f"s{i}", "P", {})["room_id"] for i in range(20)}
        assert len(ids) == 20

    def test_host_added_as_player(self):
        r = create_room("s3", "Carol", {})
        assert "s3" in r["players"]
        assert r["players"]["s3"]["name"] == "Carol"

    def test_add_player_success(self):
        r = create_room("s4", "Host", {})
        ok = add_player(r, "s5", "Guest")
        assert ok
        assert "s5" in r["players"]

    def test_add_player_fails_when_not_waiting(self):
        r = create_room("s6", "Host", {})
        r["status"] = "playing"
        ok = add_player(r, "s7", "Late")
        assert not ok
        assert "s7" not in r["players"]

    def test_remove_player(self):
        r = create_room("s8", "H", {})
        add_player(r, "s9", "G")
        remove_player(r, "s9")
        assert "s9" not in r["players"]

    def test_get_room_players_marks_host(self):
        r = create_room("s10", "H", {})
        add_player(r, "s11", "G")
        players = get_room_players(r)
        host_entry = next(p for p in players if p["isHost"])
        assert host_entry["name"] == "H"


# ─── Independent player portfolios ────────────────────────────────────────────

class TestIndependentPortfolios:

    def test_each_player_starts_with_initial_capital(self):
        r = _make_room_with_data(n_players=3)
        for player in r["players"].values():
            assert player["balance"] == INITIAL_CAPITAL

    def test_buy_only_affects_buying_player(self):
        r = _make_room_with_data(n_players=2)
        sids = list(r["players"].keys())
        buyer, other = sids[0], sids[1]

        ok, _ = execute_buy(r["players"][buyer], "StockA", 10, 100.0)
        assert ok
        assert r["players"][buyer]["portfolio"].get("StockA", 0) == 10
        assert r["players"][other]["portfolio"].get("StockA", 0) == 0

    def test_sell_only_affects_selling_player(self):
        r = _make_room_with_data(n_players=2)
        sids = list(r["players"].keys())
        seller, other = sids[0], sids[1]
        p = r["players"][seller]

        execute_buy(p, "StockA", 5, 100.0)
        ok, _ = execute_sell(p, "StockA", 5, 120.0)

        assert ok
        assert p["portfolio"].get("StockA", 0) == 0
        assert r["players"][other]["portfolio"].get("StockA", 0) == 0

    def test_balances_diverge_after_different_trades(self):
        r = _make_room_with_data(n_players=2)
        sids = list(r["players"].keys())
        p1 = r["players"][sids[0]]
        p2 = r["players"][sids[1]]

        execute_buy(p1, "StockA", 100, 100.0)
        # p2 does nothing

        assert p1["balance"] < p2["balance"]


# ─── Trade execution ──────────────────────────────────────────────────────────

class TestTradeExecution:

    def test_buy_deducts_balance(self):
        p = create_player_state("P")
        ok, _ = execute_buy(p, "X", 10, 50.0)
        assert ok
        assert p["balance"] == INITIAL_CAPITAL - 500.0

    def test_buy_updates_portfolio(self):
        p = create_player_state("P")
        execute_buy(p, "X", 10, 50.0)
        assert p["portfolio"]["X"] == 10

    def test_buy_records_transaction(self):
        p = create_player_state("P")
        execute_buy(p, "X", 5, 100.0)
        assert len(p["transactions"]) == 1
        assert p["transactions"][0]["type"] == "buy"
        assert p["transactions"][0]["qty"] == 5

    def test_buy_fails_insufficient_balance(self):
        p = create_player_state("P")
        ok, msg = execute_buy(p, "X", 99_999, 1_000.0)
        assert not ok

    def test_sell_adds_revenue(self):
        p = create_player_state("P")
        execute_buy(p, "X", 10, 100.0)
        balance_after_buy = p["balance"]
        execute_sell(p, "X", 10, 150.0)
        assert p["balance"] == balance_after_buy + 1500.0

    def test_sell_records_realized_pnl(self):
        p = create_player_state("P")
        execute_buy(p, "X", 10, 100.0)
        execute_sell(p, "X", 10, 150.0)
        assert p["realized_pnl"] == pytest.approx(500.0)

    def test_sell_fails_insufficient_shares(self):
        p = create_player_state("P")
        ok, msg = execute_sell(p, "X", 5, 100.0)
        assert not ok

    def test_sell_removes_stock_when_fully_sold(self):
        p = create_player_state("P")
        execute_buy(p, "X", 5, 100.0)
        execute_sell(p, "X", 5, 100.0)
        assert "X" not in p["portfolio"]

    def test_cost_basis_updated_on_buy(self):
        p = create_player_state("P")
        execute_buy(p, "X", 10, 100.0)
        execute_buy(p, "X", 10, 200.0)
        # Weighted average = (10*100 + 10*200) / 20 = 150
        assert p["cost_basis"]["X"] == pytest.approx(150.0)


# ─── Leaderboard ─────────────────────────────────────────────────────────────

class TestLeaderboard:

    def test_leaderboard_has_entry_per_player(self):
        r = _make_room_with_data(n_players=3)
        lb = compute_leaderboard(r)
        assert len(lb) == 3

    def test_leaderboard_sorted_by_net_worth_desc(self):
        r = _make_room_with_data(n_players=2)
        sids = list(r["players"].keys())
        # Player 0 buys a lot at $100, stock stays at $100 — no gain
        execute_buy(r["players"][sids[1]], "StockB", 100, 200.0)
        # Actually StockB is 200 so that's 20000 out but same value in portfolio

        lb = compute_leaderboard(r)
        assert lb[0]["netWorth"] >= lb[1]["netWorth"]

    def test_leaderboard_includes_rank(self):
        r = _make_room_with_data(n_players=2)
        lb = compute_leaderboard(r)
        assert lb[0]["rank"] == 1
        assert lb[1]["rank"] == 2

    def test_leaderboard_profit_equals_net_worth_minus_capital(self):
        r = _make_room_with_data(n_players=1)
        lb = compute_leaderboard(r)
        entry = lb[0]
        assert entry["profit"] == pytest.approx(entry["netWorth"] - INITIAL_CAPITAL)

    def test_leaderboard_net_worth_includes_portfolio_value(self):
        r = _make_room_with_data(n_players=1)
        sid = list(r["players"].keys())[0]
        p = r["players"][sid]

        # Buy 100 shares of StockA at $100 = $10,000 outflow, same value in portfolio
        execute_buy(p, "StockA", 100, 100.0)
        lb = compute_leaderboard(r)
        # Net worth should still be ~INITIAL_CAPITAL (bought at market price)
        assert lb[0]["netWorth"] == pytest.approx(INITIAL_CAPITAL, rel=1e-3)

    def test_leaderboard_profit_reflects_price_gain(self):
        r = _make_room_with_data(n_players=1)
        sid = list(r["players"].keys())[0]
        p = r["players"][sid]

        # Buy 100 shares of StockA at $100
        execute_buy(p, "StockA", 100, 100.0)

        # Simulate price doubling by modifying game_data (allowed in tests only)
        for s in r["game_data"]["series"]:
            if s["name"] == "StockA":
                s["values"] = [200.0] * len(s["values"])

        lb = compute_leaderboard(r)
        # Net worth = (INITIAL_CAPITAL - 10000) + 100*200 = INITIAL_CAPITAL + 10000
        assert lb[0]["profit"] == pytest.approx(10_000.0, rel=1e-3)
