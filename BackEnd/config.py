# ─── Game constants ────────────────────────────────────────────────────────────
# Single source of truth for all tunable values shared across backend modules.

INITIAL_CAPITAL: int = 1_000_000
INSIGHT_COST: int = 150_000          # 15% of initial capital

GAME_DURATION_SECONDS: int = 180
GAME_SIMULATION_STEPS: int = 2_000   # price-data points for one 3-min session
REFLECTION_PERIOD_SECONDS: int = 30

# Insight generation parameters
INSIGHT_TRIGGER_FRACTIONS: list[float] = [0.25, 0.50, 0.75]
INSIGHT_LOOK_AHEAD_STEPS: int = 300
INSIGHT_SIGNIFICANCE_THRESHOLD: float = 0.03  # ≥3% change → directional insight

# Multiplayer
MAX_PLAYERS_PER_ROOM: int = 8
ROOM_ID_LENGTH: int = 6              # e.g. "A3F9C1"

# Net-worth sampling for performance chart (record every N steps)
NET_WORTH_SAMPLE_EVERY: int = 50

# ─── Stock universe ────────────────────────────────────────────────────────────
AVAILABLE_STOCKS: list[str] = [
    "Apple", "Microsoft", "Google", "Amazon",
    "Facebook", "Tesla", "Netflix", "Nvidia",
]

STOCK_METADATA: dict[str, dict] = {
    "Apple":     {"risk": "Low",       "industry": "Consumer Electronics", "trend": "Stable growth due to high iPhone demand."},
    "Microsoft": {"risk": "Low",       "industry": "Software & Cloud",     "trend": "Strong cloud performance driving steady gains."},
    "Google":    {"risk": "Medium",    "industry": "Internet Services",    "trend": "Ad revenue fluctuations impacting short-term price."},
    "Amazon":    {"risk": "Medium",    "industry": "E-commerce",           "trend": "Logistics expansion increasing operational costs."},
    "Facebook":  {"risk": "High",      "industry": "Social Media",         "trend": "Regulatory scrutiny causing market uncertainty."},
    "Tesla":     {"risk": "Very High", "industry": "Automotive",           "trend": "High volatility driven by EV market speculation."},
    "Netflix":   {"risk": "High",      "industry": "Entertainment",        "trend": "Subscriber growth slowing down in key regions."},
    "Nvidia":    {"risk": "High",      "industry": "Semiconductors",       "trend": "AI boom driving massive but volatile growth."},
}

# ─── Legacy event templates (kept for reference / simulation page) ─────────────
EVENTS_DATABASE: list[dict] = [
    {"id": 1, "title": "Earnings Report Leak",  "description": "This company has reported excellent earnings.",            "impact": "positive", "cost": 100_000, "magnitude": 1.15},
    {"id": 2, "title": "Market Sector Entry",   "description": "The company is about to enter a new market sector.",      "impact": "volatile", "cost": 100_000, "magnitude": 1.25},
    {"id": 3, "title": "Disappointing Report",  "description": "This company has underperformed in its latest earnings.", "impact": "negative", "cost": 100_000, "magnitude": 0.85},
]
