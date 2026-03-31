// Mirrors BackEnd/config.py — keep in sync.

export const INITIAL_CAPITAL = 1_000_000;
export const INSIGHT_COST = 150_000;        // 15% of initial capital

export const GAME_DURATION_SECONDS = 180;
export const GAME_SIMULATION_STEPS = 2_000;
export const REFLECTION_PERIOD_SECONDS = 30;

export const NET_WORTH_SAMPLE_EVERY = 50;   // record net worth every N ticks

export const AVAILABLE_STOCKS = [
  'Apple', 'Microsoft', 'Google', 'Amazon',
  'Facebook', 'Tesla', 'Netflix', 'Nvidia',
];

export const DIFFICULTY_CONFIGS = {
  Easy:   { numStocks: 2, label: 'Easy',   description: '2 stocks, lower volatility' },
  Medium: { numStocks: 4, label: 'Medium', description: '4 stocks, balanced risk' },
  Hard:   { numStocks: 6, label: 'Hard',   description: '6 stocks, high volatility' },
};

export const BACKEND_URL = 'http://127.0.0.1:8050';
