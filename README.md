# Black Markets Lab

A financial trading simulation game built on **Geometric Brownian Motion (GBM)** — the stochastic process underlying the Black-Scholes framework. Watch simulated markets evolve in real time, trade assets under time pressure, and compete against a friend.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## Overview

Black Markets Lab turns financial market simulation into an interactive game. Stock prices evolve according to the same mathematical model assumed by Black-Scholes option pricing, producing realistic price paths with configurable volatility and drift. Players trade against the clock in single-player mode, explore custom parameters in a sandbox, or challenge a friend in a head-to-head session.

## Features

### Play (Solo)
Start with $1,000,000, watch a live GBM price path unfold, and buy/sell assets to maximise your net worth before the timer runs out. A **reflection period** at the start lets you study each stock's initial price and volatility before trading opens. Paid **market insights** occasionally become available mid-game, offering a directional hint on one stock — purely informational, they never alter the underlying simulation.

### Simulation
A sandbox for the model itself: pick an asset, set the volatility (σ) and initial price, and watch the GBM trajectory animate step by step. Pause, resume, or restart with new parameters at any time.

### Multiplayer
Create a room and share the code with an opponent. The host configures the game (difficulty, number of assets, duration, starting capital, reflection time); once both players are in, the host starts the session. Both players trade independently on the same simulated market and see each other's total capital in real time — but not portfolio composition. Highest final net worth wins.

> Multiplayer state currently syncs through the browser's `localStorage`, so both players need to share the same browser/device for now.

## Mathematical Model

Stock prices are simulated using **Geometric Brownian Motion**, the exact solution of the GBM stochastic differential equation:

$$S_{t+\Delta t} = S_t \cdot \exp\!\left(\left(\mu - \frac{\sigma^2}{2}\right)\Delta t + \sigma\sqrt{\Delta t}\;Z_t\right)$$

| Symbol | Description |
|---|---|
| $S_t$ | Asset price at time $t$ |
| $\mu$ | Drift — risk-free rate (2% p.a.) |
| $\sigma$ | Volatility — standard deviation of log-returns |
| $\Delta t$ | Time increment ($T / N$, where $T = 2$ years, $N$ = number of steps) |
| $Z_t$ | Independent standard normal random variable |

This is consistent with the **log-normal price distribution** assumed by Black-Scholes. Each asset's volatility is either user-defined (Simulation mode) or drawn from a clipped normal distribution $\sigma \sim \mathcal{N}(0.50,\, 0.10)$, bounded to $[0.20,\, 0.60]$ (game mode). The Itô correction term $-\frac{\sigma^2}{2}$ keeps expected growth equal to the risk-free drift, so volatility never introduces a systematic upward bias.

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 19, React Router, Tailwind CSS, Plotly.js, Vite |
| Backend | Flask, Flask-SocketIO, NumPy |
| Testing | pytest (backend), Vitest + Testing Library (frontend) |

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend

```bash
cd BackEnd
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The API starts at `http://localhost:8050`.

### Frontend

```bash
cd FrontEnd
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Running the Tests

```bash
# Backend
cd BackEnd
python -m pytest tests

# Frontend
cd FrontEnd
npm test
```

## How to Play

**Solo** — Click *Play* → pick a difficulty and number of stocks → study the reflection screen → buy/sell assets from the sidebar once trading opens → your final net worth (cash + holdings) is your score.

**Simulation** — Click *Simulation* → choose an asset, volatility σ, and initial price → *Start Simulation* to animate the path → *Configure New Simulation* to reset.

**Multiplayer** — Click *Multiplayer* → host creates a room and shares the code, or a guest joins with it → host starts the game once both players are in → highest final capital wins.

## Project Structure

```
├── BackEnd/
│   ├── app.py              # Flask + Socket.IO server — REST /api/simulate, multiplayer rooms
│   ├── calculs.py           # GBM price simulation engine
│   ├── insights.py          # Read-only market insight generation
│   ├── room_manager.py      # Multiplayer room/player state
│   ├── config.py             # Shared game constants
│   └── tests/                # pytest suite
├── FrontEnd/
│   └── src/
│       ├── components/       # Navbar, Sidebar, InsightModal, ProgressiveStockGraph, …
│       ├── context/          # GameContext (Play), SimulationContext (Simulation)
│       ├── hooks/             # useSoloGame, useMultiplayerGame
│       ├── pages/             # Home, Game, Simulation, Multiplayer
│       └── services/          # REST + multiplayer clients
└── LICENSE
```

## License

MIT — see [LICENSE](LICENSE).
