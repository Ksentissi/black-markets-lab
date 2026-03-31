/**
 * Game.jsx — unified game page for Solo and Multiplayer modes.
 *
 * Renders the correct sub-screen based on gameStatus:
 *   setup        → difficulty / stock selection
 *   lobby        → MultiplayerLobby (create/join/waiting room)
 *   reflection   → 30-second market analysis screen
 *   playing      → active trading UI
 *   insight_popup→ playing UI + InsightModal overlay
 *   paused       → playing UI + pause modal overlay
 *   finished     → game-over screen
 *
 * Delegates game-loop logic to useSoloGame / useMultiplayerGame hooks.
 * All trade actions come from GameContext (mode-aware).
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Plotly from 'plotly.js-dist-min';

import { useGame } from '../context/GameContext';
import { useSoloGame } from '../hooks/useSoloGame';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import InsightModal from '../components/InsightModal';
import MultiplayerLobby from '../components/MultiplayerLobby';
import Leaderboard from '../components/Leaderboard';
import Loader from '../components/Loader';
import { AVAILABLE_STOCKS, INITIAL_CAPITAL } from '../constants/game';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

// ─── Setup screen ─────────────────────────────────────────────────────────────

const SetupScreen = () => {
  const { mode, startSoloGame } = useGame();
  const [difficulty, setDifficulty] = useState('Medium');
  const [numStocks, setNumStocks]   = useState(4);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState('');
  const navigate = useNavigate();

  const handleStart = async () => {
    setIsLoading(true);
    setError('');
    const shuffled  = [...AVAILABLE_STOCKS].sort(() => 0.5 - Math.random());
    const selected  = shuffled.slice(0, numStocks);
    try {
      await startSoloGame(difficulty, selected);
    } catch (e) {
      setError('Failed to load simulation. Is the backend running?');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'multiplayer') {
    return <MultiplayerLobby />;
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl">
        <div className="mb-2 flex items-center gap-3">
          <span className="text-3xl">👤</span>
          <div>
            <h2 className="text-2xl font-bold text-white">Solo Game</h2>
            <p className="text-sm text-slate-400">Start with {fmt(INITIAL_CAPITAL)}. Beat the market.</p>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {/* Difficulty */}
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-300">Difficulty</label>
            <div className="grid grid-cols-3 gap-3">
              {['Easy', 'Medium', 'Hard'].map((d) => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`rounded-lg border py-2.5 text-sm font-semibold transition ${
                    difficulty === d ? 'border-brand bg-brand/10 text-brand' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Num stocks */}
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-300">Number of Stocks</label>
            <div className="grid grid-cols-3 gap-3">
              {[2, 4, 6].map((n) => (
                <button key={n} onClick={() => setNumStocks(n)}
                  className={`rounded-lg border py-2.5 text-sm font-semibold transition ${
                    numStocks === n ? 'border-brand bg-brand/10 text-brand' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}>
                  {n} Stocks
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button onClick={handleStart} disabled={isLoading}
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-4 font-bold text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] disabled:opacity-50">
            {isLoading ? <><Loader inline /> Loading…</> : 'Start Game'}
          </button>

          <button onClick={() => navigate('/')}
            className="w-full rounded-xl border border-white/10 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white">
            ← Back to Mode Selection
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Reflection screen ────────────────────────────────────────────────────────

const ReflectionScreen = () => {
  const { gameData, gameStatus, setGameStatus, mode } = useGame();
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (gameStatus !== 'reflection' || mode !== 'solo') return;
    const t = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(t); setGameStatus('playing'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [gameStatus, mode, setGameStatus]);

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white">Market Analysis</h2>
          <p className="mt-2 text-slate-400">Study the starting conditions before trading begins.</p>
          <div className="mt-6 text-5xl font-bold text-brand">{countdown}s</div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gameData?.series.map((stock) => (
            <div key={stock.name} className="rounded-xl border border-white/5 bg-slate-800/50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-bold text-white">{stock.name}</span>
                <span className="text-xs text-slate-500">σ {stock.volatility.toFixed(2)}</span>
              </div>
              <div className="text-2xl font-bold text-white">{fmt(stock.values[0])}</div>
              <div className="mt-1 text-xs text-slate-500">{stock.metadata?.risk ?? ''} risk · {stock.metadata?.industry ?? ''}</div>
            </div>
          ))}
        </div>

        <p className="mt-8 animate-pulse text-center text-sm text-slate-500">
          {mode === 'solo' ? 'Trading begins shortly…' : 'Waiting for host to start…'}
        </p>

        {mode === 'solo' && (
          <div className="mt-4 text-center">
            <button onClick={() => setGameStatus('playing')}
              className="rounded-lg border border-white/10 px-6 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white">
              Skip →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Game-over screen ─────────────────────────────────────────────────────────

const FinishedScreen = () => {
  const { netWorth, leaderboard, mode, resetGame } = useGame();
  const profit   = netWorth - INITIAL_CAPITAL;
  const isProfit = profit >= 0;

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 text-center backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white">Game Over</h2>
          <div className="my-8">
            <p className="text-sm text-slate-400">Final Net Worth</p>
            <p className="mt-1 text-4xl font-bold text-white">{fmt(netWorth)}</p>
            <p className={`mt-2 text-lg font-semibold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
              {isProfit ? '+' : ''}{fmt(profit)}
            </p>
          </div>
          <button onClick={resetGame}
            className="w-full rounded-xl bg-brand py-3 font-bold text-white transition hover:bg-brand-dark">
            Play Again
          </button>
        </div>

        {mode === 'multiplayer' && leaderboard.length > 0 && (
          <Leaderboard entries={leaderboard} />
        )}
      </div>
    </div>
  );
};

// ─── Active trading UI ────────────────────────────────────────────────────────

const TradingUI = () => {
  const {
    gameStatus, setGameStatus,
    balance, portfolio,
    gameData, currentIndex,
    activeStock, setActiveStock,
    netWorth, unrealizedPnl, realizedPnl,
    timeLeft, mode,
    pauseGame, resumeGame, resetGame,
    leaderboard,
    buyStock, sellStock,
    transactions,
  } = useGame();

  const graphRef   = useRef(null);
  const [tradeQty, setTradeQty] = useState(10);
  const [lastAction, setLastAction] = useState(null);

  // ── Graph update ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!graphRef.current || !gameData || !activeStock) return;
    const series = gameData.series.find((s) => s.name === activeStock);
    if (!series) return;

    Plotly.react(
      graphRef.current,
      [{
        x: gameData.timestamps.slice(0, currentIndex + 1),
        y: series.values.slice(0, currentIndex + 1),
        type: 'scatter', mode: 'lines',
        line: { color: '#F97316', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(249,115,22,0.1)',
      }],
      {
        title: false, autosize: true,
        margin: { t: 20, r: 20, b: 40, l: 50 },
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#94a3b8' },
        xaxis: { range: [0, gameData.timestamps[gameData.timestamps.length - 1]], showgrid: false },
        yaxis: { autorange: true, gridcolor: 'rgba(255,255,255,0.05)' },
      },
      { displayModeBar: false },
    );
  }, [currentIndex, activeStock, gameData]);

  // ── Pause on unmount (tab change / navigation) ───────────────────────────────
  const statusRef = useRef(gameStatus);
  useEffect(() => { statusRef.current = gameStatus; }, [gameStatus]);
  useEffect(() => () => {
    if (statusRef.current === 'playing') pauseGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentPrice  = () => {
    if (!gameData || !activeStock) return 0;
    const s = gameData.series.find((x) => x.name === activeStock);
    return s ? s.values[Math.min(currentIndex, s.values.length - 1)] : 0;
  };

  const price = currentPrice();
  const holding = portfolio[activeStock] || 0;

  const handleBuy = () => {
    if (buyStock(activeStock, tradeQty, price)) {
      setLastAction({ type: 'buy', id: Date.now() });
      setTimeout(() => setLastAction(null), 800);
    }
  };

  const handleSell = () => {
    if (sellStock(activeStock, tradeQty, price)) {
      setLastAction({ type: 'sell', id: Date.now() });
      setTimeout(() => setLastAction(null), 800);
    }
  };

  const pnlColor = unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="relative flex h-[calc(100vh-80px)] flex-col overflow-hidden">

      {/* InsightModal sits on top (handles its own visibility via pendingInsight) */}
      <InsightModal />

      {/* Pause modal */}
      {gameStatus === 'paused' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-8 text-center shadow-2xl">
            <h3 className="mb-4 text-2xl font-bold text-white">Game Paused</h3>
            <div className="space-y-3">
              <button onClick={resumeGame}
                className="w-full rounded-xl bg-brand py-3 font-bold text-white hover:bg-brand-dark">
                Resume
              </button>
              <button onClick={resetGame}
                className="w-full rounded-xl border border-white/10 py-3 font-semibold text-slate-300 hover:bg-white/5">
                Quit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/5 bg-slate-900/80 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-slate-400">Cash</p>
              <p className="font-mono text-lg font-bold text-white">{fmt(balance)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Net Worth</p>
              <p className="font-mono text-lg font-bold text-emerald-400">{fmt(netWorth)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Unrealized P&L</p>
              <p className={`font-mono text-lg font-bold ${pnlColor}`}>
                {unrealizedPnl >= 0 ? '+' : ''}{fmt(unrealizedPnl)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {mode === 'solo' && (
              <button onClick={pauseGame}
                className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700">
                Pause
              </button>
            )}
            <div className="rounded-lg bg-slate-800 px-4 py-2 font-mono text-xl font-bold text-white">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main chart + stock tabs */}
        <main className="flex flex-1 flex-col p-4">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {gameData?.series.map((s) => {
              const sp = s.values[Math.min(currentIndex, s.values.length - 1)];
              const sp0 = s.values[0];
              const change = ((sp - sp0) / sp0) * 100;
              return (
                <button key={s.name} onClick={() => setActiveStock(s.name)}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    activeStock === s.name
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-white/10 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                  }`}>
                  {s.name}
                  <span className={`text-xs ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                  {(portfolio[s.name] || 0) > 0 && (
                    <span className="rounded-full bg-emerald-500/20 px-1.5 text-[10px] text-emerald-400">
                      {portfolio[s.name]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 rounded-2xl border border-white/5 bg-slate-900/30 p-3">
            <div ref={graphRef} className="h-full w-full" />
          </div>
        </main>

        {/* Sidebar: trade controls + holdings */}
        <aside className="relative flex w-72 flex-col border-l border-white/5 bg-slate-900/50 p-5 backdrop-blur-sm">

          {/* Buy/Sell flash */}
          {lastAction && (
            <div className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-r-none ${
              lastAction.type === 'buy' ? 'bg-emerald-500/10' : 'bg-red-500/10'
            }`}>
              <span className={`rounded-xl bg-slate-900/90 px-5 py-3 text-xl font-bold shadow-2xl ${
                lastAction.type === 'buy' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {lastAction.type === 'buy' ? '✓ BUY FILLED' : '✓ SELL FILLED'}
              </span>
            </div>
          )}

          {/* Active stock info */}
          <div className="mb-5">
            <h3 className="text-xl font-bold text-white">{activeStock}</h3>
            <p className="font-mono text-2xl font-semibold text-orange-400">{fmt(price)}</p>
          </div>

          {/* Holding info */}
          <div className="mb-5 space-y-2 rounded-xl border border-white/5 bg-slate-800/30 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Shares owned</span>
              <span className="font-bold text-white">{holding}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Position value</span>
              <span className="font-bold text-white">{fmt(holding * price)}</span>
            </div>
            {holding > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Unrealized P&L</span>
                <span className={`font-bold ${
                  (price - (holding > 0 ? (netWorth - balance) / holding : 0)) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {fmt(holding * (price - ((() => { const s = gameData?.series.find(x=>x.name===activeStock); return s ? 0 : 0; })())))}
                </span>
              </div>
            )}
          </div>

          {/* Trade controls */}
          <div className="space-y-3">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Quantity</label>
            <input type="number" min="1" value={tradeQty}
              onChange={(e) => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2.5 text-white focus:border-brand focus:outline-none" />
            <p className="text-center text-xs text-slate-500">Cost: {fmt(price * tradeQty)}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleBuy} disabled={balance < price * tradeQty}
                className="rounded-xl bg-emerald-500 py-3 font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40">
                Buy
              </button>
              <button onClick={handleSell} disabled={holding < tradeQty}
                className="rounded-xl bg-red-500 py-3 font-bold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40">
                Sell
              </button>
            </div>
          </div>

          {/* Recent transactions */}
          {transactions.length > 0 && (
            <div className="mt-5 flex-1 overflow-hidden">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Recent Trades</p>
              <div className="max-h-36 space-y-1.5 overflow-y-auto">
                {[...transactions].reverse().slice(0, 10).map((tx, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-slate-800/40 px-2.5 py-1.5 text-xs">
                    <span className={tx.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}>
                      {tx.type.toUpperCase()} {tx.qty}x
                    </span>
                    <span className="text-slate-300">{tx.stock}</span>
                    <span className="font-mono text-slate-400">{fmt(tx.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live leaderboard in multiplayer */}
          {mode === 'multiplayer' && leaderboard.length > 0 && (
            <div className="mt-4">
              <Leaderboard entries={leaderboard} compact />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

// ─── Root Game component ──────────────────────────────────────────────────────

const Game = () => {
  const { mode, gameStatus } = useGame();

  // Activate game loops (each hook is a no-op when not in its mode)
  useSoloGame();
  useMultiplayerGame();

  // Redirect to mode selection if no mode chosen yet
  if (!mode) {
    return <SetupScreen />;
  }

  if (gameStatus === 'setup') {
    return mode === 'multiplayer' ? <MultiplayerLobby /> : <SetupScreen />;
  }

  if (gameStatus === 'lobby') {
    return <MultiplayerLobby />;
  }

  if (gameStatus === 'reflection') {
    return <ReflectionScreen />;
  }

  if (gameStatus === 'finished') {
    return <FinishedScreen />;
  }

  // playing | paused | insight_popup
  return <TradingUI />;
};

export default Game;
