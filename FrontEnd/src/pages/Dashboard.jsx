/**
 * Dashboard — live game analytics.
 *
 * Useful during gameplay (navigate here to pause & analyse) and after the game.
 * Shows: cash, portfolio value, unrealized/realized P&L, timer, holdings table,
 * transaction history, performance chart, top movers, purchased insights,
 * and multiplayer leaderboard.
 */

import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { useGame } from '../context/GameContext';
import Leaderboard from '../components/Leaderboard';
import { INITIAL_CAPITAL } from '../constants/game';
import { Link } from 'react-router-dom';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtPct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = 'text-white' }) => (
  <div className="rounded-xl border border-white/5 bg-slate-800/40 p-4">
    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
    <p className={`font-mono text-xl font-bold ${color}`}>{value}</p>
    {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
  </div>
);

// ─── Performance mini-chart ───────────────────────────────────────────────────
const PerformanceChart = ({ history }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !history.length) return;
    const xs = history.map((h) => h.index);
    const ys = history.map((h) => h.value);
    const color = ys[ys.length - 1] >= INITIAL_CAPITAL ? '#34d399' : '#f87171';

    Plotly.react(
      ref.current,
      [{
        x: xs, y: ys,
        type: 'scatter', mode: 'lines',
        line: { color, width: 2 },
        fill: 'tozeroy',
        fillcolor: color.replace(')', ', 0.1)').replace('rgb', 'rgba'),
      }],
      {
        height: 120,
        margin: { t: 8, r: 8, b: 24, l: 50 },
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#94a3b8', size: 10 },
        xaxis: { showgrid: false, showticklabels: false },
        yaxis: { gridcolor: 'rgba(255,255,255,0.04)', tickformat: '$,.0f' },
        showlegend: false,
      },
      { displayModeBar: false },
    );
  }, [history]);

  if (!history.length) {
    return (
      <div className="flex h-28 items-center justify-center text-sm text-slate-500">
        No data yet — start playing to record performance.
      </div>
    );
  }
  return <div ref={ref} className="w-full" />;
};

// ─── Holdings table ───────────────────────────────────────────────────────────
const HoldingsTable = ({ portfolio, costBasis, gameData, currentIndex }) => {
  const entries = Object.entries(portfolio).filter(([, qty]) => qty > 0);
  if (!entries.length) {
    return <p className="text-sm text-slate-500">No open positions.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
          <th className="pb-2">Stock</th>
          <th className="pb-2 text-right">Qty</th>
          <th className="pb-2 text-right">Avg Cost</th>
          <th className="pb-2 text-right">Current</th>
          <th className="pb-2 text-right">Unreal. P&L</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {entries.map(([symbol, qty]) => {
          const s = gameData?.series.find((x) => x.name === symbol);
          const currentPrice = s ? s.values[Math.min(currentIndex, s.values.length - 1)] : 0;
          const basis = costBasis[symbol] || 0;
          const pnl = qty * (currentPrice - basis);
          return (
            <tr key={symbol} className="text-slate-300">
              <td className="py-2 font-semibold text-white">{symbol}</td>
              <td className="py-2 text-right">{qty}</td>
              <td className="py-2 text-right font-mono">{fmt(basis)}</td>
              <td className="py-2 text-right font-mono">{fmt(currentPrice)}</td>
              <td className={`py-2 text-right font-mono font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pnl >= 0 ? '+' : ''}{fmt(pnl)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ─── Top movers ───────────────────────────────────────────────────────────────
const TopMovers = ({ gameData, currentIndex }) => {
  if (!gameData) return null;
  const movers = gameData.series
    .map((s) => {
      const current = s.values[Math.min(currentIndex, s.values.length - 1)];
      const pct = ((current - s.values[0]) / s.values[0]) * 100;
      return { name: s.name, pct, current };
    })
    .sort((a, b) => b.pct - a.pct);

  const top    = movers.slice(0, 3);
  const bottom = [...movers].sort((a, b) => a.pct - b.pct).slice(0, 3);

  const Row = ({ item }) => (
    <div className="flex items-center justify-between rounded-lg bg-slate-800/30 px-3 py-2">
      <span className="text-sm font-medium text-white">{item.name}</span>
      <div className="text-right">
        <p className="font-mono text-xs text-slate-400">{fmt(item.current)}</p>
        <p className={`font-mono text-xs font-semibold ${item.pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {fmtPct(item.pct)}
        </p>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-500">Top Gainers</p>
        <div className="space-y-1.5">{top.map((m) => <Row key={m.name} item={m} />)}</div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-500">Top Losers</p>
        <div className="space-y-1.5">{bottom.map((m) => <Row key={m.name} item={m} />)}</div>
      </div>
    </div>
  );
};

// ─── Dashboard root ───────────────────────────────────────────────────────────

const Dashboard = () => {
  const {
    gameStatus, mode,
    balance, netWorth, portfolioValue,
    unrealizedPnl, realizedPnl,
    portfolio, costBasis,
    transactions, purchasedInsights,
    netWorthHistory,
    gameData, currentIndex, timeLeft,
    leaderboard,
    pauseGame,
  } = useGame();

  const isGameActive = ['playing', 'paused', 'insight_popup', 'reflection', 'finished'].includes(gameStatus);

  // Auto-pause when the player opens the dashboard mid-game
  useEffect(() => {
    if (gameStatus === 'playing') pauseGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isGameActive) {
    return (
      <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6">
        <div className="text-center">
          <p className="text-5xl mb-4">📊</p>
          <h2 className="mb-3 text-2xl font-bold text-white">No Active Game</h2>
          <p className="mb-8 text-slate-400">Start a game to see live analytics here.</p>
          <Link to="/game"
            className="rounded-xl bg-brand px-6 py-3 font-bold text-white transition hover:bg-brand-dark">
            Start a Game
          </Link>
        </div>
      </section>
    );
  }

  const profit    = netWorth - INITIAL_CAPITAL;
  const profitPct = (profit / INITIAL_CAPITAL) * 100;
  const isProfit  = profit >= 0;

  return (
    <section className="space-y-6 p-6">
      {/* Title bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Game Dashboard</h1>
          <p className="text-sm text-slate-400">
            {gameStatus === 'finished' ? 'Final results' : 'Live analytics — game is paused while you\'re here'}
          </p>
        </div>
        {gameStatus !== 'finished' && (
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-800 px-4 py-2 font-mono text-lg font-bold text-white">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
            <Link to="/game"
              className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark">
              Resume →
            </Link>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Cash"           value={fmt(balance)}       color="text-white" />
        <StatCard label="Portfolio Value" value={fmt(portfolioValue)} color="text-white" />
        <StatCard label="Net Worth"       value={fmt(netWorth)}      color={isProfit ? 'text-emerald-400' : 'text-red-400'} />
        <StatCard label="Total P&L"       value={fmt(profit)}
          sub={fmtPct(profitPct)}
          color={isProfit ? 'text-emerald-400' : 'text-red-400'} />
        <StatCard label="Unrealized P&L"  value={fmt(unrealizedPnl)}
          color={unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <StatCard label="Realized P&L"    value={fmt(realizedPnl)}
          color={realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} />
      </div>

      {/* Performance chart + Holdings */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-slate-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Net Worth Over Time
          </h2>
          <PerformanceChart history={netWorthHistory} />
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Open Positions
          </h2>
          <HoldingsTable
            portfolio={portfolio}
            costBasis={costBasis}
            gameData={gameData}
            currentIndex={currentIndex}
          />
        </div>
      </div>

      {/* Top movers */}
      <div className="rounded-xl border border-white/5 bg-slate-900/50 p-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Market Movers
        </h2>
        <TopMovers gameData={gameData} currentIndex={currentIndex} />
      </div>

      {/* Transactions + Insights side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Transaction history */}
        <div className="rounded-xl border border-white/5 bg-slate-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Transaction History ({transactions.length})
          </h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500">No trades yet.</p>
          ) : (
            <div className="max-h-56 space-y-1.5 overflow-y-auto">
              {[...transactions].reverse().map((tx, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2 text-sm">
                  <span className={`font-semibold ${tx.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type.toUpperCase()}
                  </span>
                  <span className="text-white">{tx.qty}× {tx.stock}</span>
                  <span className="font-mono text-slate-400">@ {fmt(tx.price)}</span>
                  <span className="font-mono text-slate-500">{fmt(tx.qty * tx.price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purchased insights */}
        <div className="rounded-xl border border-white/5 bg-slate-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Purchased Insights ({purchasedInsights.length})
          </h2>
          {purchasedInsights.length === 0 ? (
            <p className="text-sm text-slate-500">No insights purchased yet.</p>
          ) : (
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {purchasedInsights.map((ins, i) => (
                <div key={i} className="rounded-lg border border-white/5 bg-slate-800/40 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm">
                      {ins.direction === 'up' ? '📈' : ins.direction === 'down' ? '📉' : '↔️'}
                    </span>
                    <span className="text-sm font-semibold text-white">{ins.stock}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      ins.direction === 'up' ? 'bg-emerald-500/20 text-emerald-400' :
                      ins.direction === 'down' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>{ins.direction}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400">{ins.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard (multiplayer) */}
      {mode === 'multiplayer' && leaderboard.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-slate-900/50 p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Leaderboard
          </h2>
          <Leaderboard entries={leaderboard} />
        </div>
      )}
    </section>
  );
};

export default Dashboard;
