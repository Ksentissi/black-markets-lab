"""
Insight generation — read-only analysis of pre-computed price data.

IMPORTANT: This module NEVER modifies the simulation.  An insight is purely
informational: it describes what will happen (according to the already-computed
trajectory) so the player can make an informed decision.  Whether the player
buys the insight or not, the stock prices are identical.
"""

from config import (
    INSIGHT_COST,
    INSIGHT_TRIGGER_FRACTIONS,
    INSIGHT_LOOK_AHEAD_STEPS,
    INSIGHT_SIGNIFICANCE_THRESHOLD,
)


def generate_insight_schedule(game_data: dict) -> list[dict]:
    """
    Return a list of insight events derived from the pre-computed simulation.

    Each insight is triggered at a specific simulation step and reveals a
    directional hint about one stock's near-term behaviour.

    Args:
        game_data: The dict returned by /api/simulate (timestamps + series).

    Returns:
        List of insight dicts:
        {
          "step":      int,    # simulation index at which the insight is available
          "stock":     str,    # stock name this insight refers to
          "direction": str,    # "up" | "down" | "sideways"
          "message":   str,    # human-readable hint shown after purchase
          "cost":      int,    # price in $ to unlock this insight
        }
    """
    series = game_data.get("series", [])
    total_steps = len(game_data.get("timestamps", []))

    if not series or total_steps == 0:
        return []

    insights: list[dict] = []

    for frac in INSIGHT_TRIGGER_FRACTIONS:
        step = int(frac * total_steps)
        look_ahead = min(INSIGHT_LOOK_AHEAD_STEPS, total_steps - step - 1)

        if look_ahead <= 0:
            continue

        # Select the stock that will move most significantly over the look-ahead
        # window — that's the most valuable insight to offer.
        best_series = None
        best_pct = 0.0

        for s in series:
            values = s["values"]
            if len(values) <= step + look_ahead:
                continue
            current_price = values[step]
            future_price = values[step + look_ahead]
            if current_price <= 0:
                continue
            pct = (future_price - current_price) / current_price
            if abs(pct) > abs(best_pct):
                best_pct = pct
                best_series = s

        if best_series is None:
            continue

        stock_name = best_series["name"]

        if best_pct > INSIGHT_SIGNIFICANCE_THRESHOLD:
            direction = "up"
            message = (
                f"{stock_name} is showing strong bullish signals. "
                f"Our model anticipates a notable upward move over the next 30 seconds."
            )
        elif best_pct < -INSIGHT_SIGNIFICANCE_THRESHOLD:
            direction = "down"
            message = (
                f"{stock_name} is under significant selling pressure. "
                f"A meaningful decline is expected in the near term."
            )
        else:
            direction = "sideways"
            message = (
                f"{stock_name} is entering a consolidation zone. "
                f"Expect choppy, range-bound trading with no clear directional bias."
            )

        insights.append(
            {
                "step": step,
                "stock": stock_name,
                "direction": direction,
                "message": message,
                "cost": INSIGHT_COST,
            }
        )

    return insights
