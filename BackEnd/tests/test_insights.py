"""
Tests for the insight generation module.

Key invariant: insights are read-only — buying one must never change the
underlying simulation data.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
import copy
from insights import generate_insight_schedule
from config import INSIGHT_COST, INSIGHT_TRIGGER_FRACTIONS


# ─── Fixtures ─────────────────────────────────────────────────────────────────

def make_game_data(n_steps=2000, n_stocks=4):
    """Minimal synthetic game_data dict."""
    import numpy as np
    np.random.seed(42)
    timestamps = list(range(n_steps))
    series = []
    for i in range(n_stocks):
        prices = [100.0]
        for _ in range(n_steps - 1):
            prices.append(prices[-1] * (1 + np.random.normal(0, 0.02)))
        series.append({
            "name": f"Stock{i}",
            "volatility": 0.3,
            "values": prices,
            "metadata": {},
        })
    return {"timestamps": timestamps, "series": series}


# ─── Tests ────────────────────────────────────────────────────────────────────

class TestInsightGeneration:

    def test_returns_list(self):
        gd = make_game_data()
        schedule = generate_insight_schedule(gd)
        assert isinstance(schedule, list)

    def test_number_of_insights(self):
        gd = make_game_data()
        schedule = generate_insight_schedule(gd)
        # Should have one insight per trigger fraction
        assert len(schedule) == len(INSIGHT_TRIGGER_FRACTIONS)

    def test_insight_fields_present(self):
        gd = make_game_data()
        for insight in generate_insight_schedule(gd):
            assert "step" in insight
            assert "stock" in insight
            assert "direction" in insight
            assert "message" in insight
            assert "cost" in insight

    def test_insight_cost_matches_config(self):
        gd = make_game_data()
        for insight in generate_insight_schedule(gd):
            assert insight["cost"] == INSIGHT_COST

    def test_insight_direction_valid(self):
        gd = make_game_data()
        for insight in generate_insight_schedule(gd):
            assert insight["direction"] in ("up", "down", "sideways")

    def test_insight_step_within_bounds(self):
        gd = make_game_data(n_steps=2000)
        for insight in generate_insight_schedule(gd):
            assert 0 <= insight["step"] < 2000

    def test_insight_does_not_modify_game_data(self):
        """
        CORE INVARIANT: generating insights must not alter the price series.
        """
        gd = make_game_data()
        original_values = [s["values"][:] for s in gd["series"]]

        generate_insight_schedule(gd)

        for i, s in enumerate(gd["series"]):
            assert s["values"] == original_values[i], (
                f"Series {s['name']} was mutated by generate_insight_schedule"
            )

    def test_insight_purchase_does_not_modify_game_data(self):
        """
        Simulates the full buy-insight flow: deducting cost + recording insight
        must not touch game_data prices.
        """
        from room_manager import create_player_state, execute_buy_insight

        gd = make_game_data()
        schedule = generate_insight_schedule(gd)
        original_values = copy.deepcopy([s["values"] for s in gd["series"]])

        player = create_player_state("TestPlayer")
        insight = schedule[0]

        ok, msg = execute_buy_insight(player, insight)
        assert ok, f"execute_buy_insight failed: {msg}"

        # Prices untouched
        for i, s in enumerate(gd["series"]):
            assert s["values"] == original_values[i]

    def test_empty_game_data_returns_empty(self):
        assert generate_insight_schedule({}) == []
        assert generate_insight_schedule({"timestamps": [], "series": []}) == []


class TestInsightPurchase:

    def test_deducts_cost_from_balance(self):
        from room_manager import create_player_state, execute_buy_insight
        gd = make_game_data()
        schedule = generate_insight_schedule(gd)
        player = create_player_state("P")
        initial_balance = player["balance"]

        ok, _ = execute_buy_insight(player, schedule[0])
        assert ok
        assert player["balance"] == initial_balance - INSIGHT_COST

    def test_records_insight_in_player_state(self):
        from room_manager import create_player_state, execute_buy_insight
        gd = make_game_data()
        schedule = generate_insight_schedule(gd)
        player = create_player_state("P")

        execute_buy_insight(player, schedule[0])
        assert len(player["purchased_insights"]) == 1
        assert player["purchased_insights"][0]["step"] == schedule[0]["step"]

    def test_fails_when_insufficient_balance(self):
        from room_manager import create_player_state, execute_buy_insight
        gd = make_game_data()
        schedule = generate_insight_schedule(gd)
        player = create_player_state("P")
        player["balance"] = 0   # no money

        ok, msg = execute_buy_insight(player, schedule[0])
        assert not ok
        assert "balance" in msg.lower() or "insufficient" in msg.lower()
