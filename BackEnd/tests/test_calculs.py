"""
Tests for the core Black-Scholes / GBM price simulation engine.

Key invariants:
  - shapes match the requested number of simulations and steps
  - prices stay strictly positive (GBM via exp() can never cross zero)
  - explicit stock_configs (initial_price / volatility) are respected exactly
  - randomly-generated volatilities stay within the configured bounds
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import numpy as np
import pytest
from calculs import simulate_stock_prices


class TestShapes:

    def test_default_shape_matches_num_simulations_and_steps(self):
        prices, volatilities = simulate_stock_prices(num_simulations=3, time=2, num_steps=50)
        assert prices.shape == (3, 50)
        assert volatilities.shape == (3,)

    def test_stock_configs_override_num_simulations(self):
        """When stock_configs is provided, its length wins over num_simulations."""
        configs = [{}, {}, {}, {}]
        prices, volatilities = simulate_stock_prices(
            num_simulations=1, time=2, num_steps=20, stock_configs=configs,
        )
        assert prices.shape == (4, 20)
        assert volatilities.shape == (4,)

    def test_single_step_does_not_crash(self):
        prices, _ = simulate_stock_prices(num_simulations=1, time=1, num_steps=1)
        assert prices.shape == (1, 1)


class TestPricePositivity:

    def test_prices_are_always_positive(self):
        prices, _ = simulate_stock_prices(num_simulations=5, time=2, num_steps=500)
        assert np.all(prices > 0)

    def test_prices_are_finite(self):
        prices, volatilities = simulate_stock_prices(num_simulations=5, time=2, num_steps=500)
        assert np.all(np.isfinite(prices))
        assert np.all(np.isfinite(volatilities))


class TestStockConfigs:

    def test_initial_price_is_respected(self):
        configs = [{"initial_price": 123.45}]
        prices, _ = simulate_stock_prices(num_simulations=1, time=2, num_steps=10, stock_configs=configs)
        assert prices[0, 0] == pytest.approx(123.45)

    def test_explicit_volatility_is_respected(self):
        configs = [{"initial_price": 100.0, "volatility": 0.35}]
        _, volatilities = simulate_stock_prices(num_simulations=1, time=2, num_steps=10, stock_configs=configs)
        assert volatilities[0] == pytest.approx(0.35)

    def test_missing_volatility_falls_back_to_random_within_bounds(self):
        configs = [{"initial_price": 100.0} for _ in range(20)]
        _, volatilities = simulate_stock_prices(num_simulations=1, time=2, num_steps=10, stock_configs=configs)
        assert np.all(volatilities >= 0.20)
        assert np.all(volatilities <= 0.60)

    def test_missing_initial_price_generates_one_in_expected_range(self):
        configs = [{"volatility": 0.3} for _ in range(20)]
        prices, _ = simulate_stock_prices(num_simulations=1, time=2, num_steps=5, stock_configs=configs)
        assert np.all(prices[:, 0] >= 75)
        assert np.all(prices[:, 0] <= 300)

    def test_each_stock_config_applied_independently(self):
        configs = [
            {"initial_price": 50.0, "volatility": 0.2},
            {"initial_price": 200.0, "volatility": 0.5},
        ]
        prices, volatilities = simulate_stock_prices(num_simulations=1, time=2, num_steps=10, stock_configs=configs)
        assert prices[0, 0] == pytest.approx(50.0)
        assert prices[1, 0] == pytest.approx(200.0)
        assert volatilities[0] == pytest.approx(0.2)
        assert volatilities[1] == pytest.approx(0.5)


class TestRandomVolatilityBounds:

    def test_default_random_volatility_stays_within_clip_bounds(self):
        # No stock_configs -> fully random path
        _, volatilities = simulate_stock_prices(num_simulations=200, time=2, num_steps=5)
        assert np.all(volatilities >= 0.20)
        assert np.all(volatilities <= 0.60)
