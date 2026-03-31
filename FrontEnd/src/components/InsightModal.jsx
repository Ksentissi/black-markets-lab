/**
 * InsightModal — shown when an insight becomes available during gameplay.
 *
 * IMPORTANT: this modal is purely informational.  Whether the player buys or
 * dismisses, the stock simulation is unaffected.  The modal only reveals (or
 * withholds) pre-computed information derived from the existing price series.
 */

import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { INSIGHT_COST } from '../constants/game';

const DIRECTION_META = {
  up:       { emoji: '📈', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  down:     { emoji: '📉', color: 'text-red-400',     border: 'border-red-500/30',     bg: 'bg-red-500/10'     },
  sideways: { emoji: '↔️',  color: 'text-amber-400',   border: 'border-amber-500/30',   bg: 'bg-amber-500/10'   },
};

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const InsightModal = () => {
  const { pendingInsight, balance, buyInsight, dismissInsight, mode } = useGame();
  // Holds the purchased insight so we can display it after pendingInsight is cleared
  const [revealed, setRevealed] = useState(null);

  const handleBuy = () => {
    // Save a copy before buyInsight clears pendingInsight
    setRevealed(pendingInsight);
    buyInsight(pendingInsight);
  };

  const handleClose = () => {
    setRevealed(null);
  };

  // ── Revealed view (shown after purchase) ─────────────────────────────────
  if (revealed) {
    const meta = DIRECTION_META[revealed.direction] ?? DIRECTION_META.sideways;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-2xl">
              ✅
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Insight Unlocked</h3>
              <p className="text-sm text-slate-400">
                Regarding <span className="font-semibold text-white">{revealed.stock}</span>
              </p>
            </div>
          </div>

          {/* Revealed message — no blur */}
          <div className={`mb-6 rounded-xl border p-5 ${meta.border} ${meta.bg}`}>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">{meta.emoji}</span>
              <span className={`text-sm font-bold uppercase tracking-wider ${meta.color}`}>
                {revealed.direction === 'up' ? 'Bullish Signal' :
                 revealed.direction === 'down' ? 'Bearish Signal' : 'Volatility Alert'}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white">
              {revealed.message}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="w-full rounded-xl bg-brand py-3 font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark"
          >
            {mode === 'solo' ? 'Got it — Resume' : 'Got it'}
          </button>
        </div>
      </div>
    );
  }

  // ── Purchase prompt ───────────────────────────────────────────────────────
  if (!pendingInsight) return null;

  const canAfford = balance >= INSIGHT_COST;
  const meta = DIRECTION_META[pendingInsight.direction] ?? DIRECTION_META.sideways;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/20 text-2xl">
            💡
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Market Insight Available</h3>
            <p className="text-sm text-slate-400">
              Regarding <span className="font-semibold text-white">{pendingInsight.stock}</span>
            </p>
          </div>
        </div>

        {/* Blurred preview */}
        <div className={`mb-6 rounded-xl border p-4 ${meta.border} ${meta.bg}`}>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">{meta.emoji}</span>
            <span className={`text-sm font-semibold uppercase tracking-wider ${meta.color}`}>
              {pendingInsight.direction === 'up' ? 'Bullish Signal' :
               pendingInsight.direction === 'down' ? 'Bearish Signal' : 'Volatility Alert'}
            </span>
          </div>
          <p className="select-none text-sm leading-relaxed text-slate-300 blur-sm">
            {pendingInsight.message}
          </p>
          <p className="mt-2 text-xs text-slate-500">Purchase to reveal the full analysis</p>
        </div>

        {/* Cost */}
        <div className="mb-6 flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
          <span className="text-sm text-slate-400">Insight cost</span>
          <span className="font-mono font-bold text-white">{fmt(INSIGHT_COST)}</span>
        </div>

        {!canAfford && (
          <p className="mb-4 text-center text-sm text-red-400">
            Insufficient balance to purchase this insight.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleBuy}
            disabled={!canAfford}
            className="flex-1 rounded-xl bg-brand py-3 font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Buy Insight
          </button>
          <button
            onClick={dismissInsight}
            className="flex-1 rounded-xl border border-white/10 py-3 font-semibold text-slate-300 transition hover:bg-white/5"
          >
            {mode === 'solo' ? 'Skip & Resume' : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsightModal;
