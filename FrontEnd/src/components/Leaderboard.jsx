/**
 * Leaderboard — displays ranked player standings in multiplayer.
 * Also usable in solo mode to show the single player's performance.
 */

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const RANK_COLORS = ['text-amber-400', 'text-slate-300', 'text-orange-700'];
const RANK_LABELS = ['🥇', '🥈', '🥉'];

const Leaderboard = ({ entries = [], compact = false }) => {
  if (!entries.length) {
    return (
      <div className="rounded-xl border border-white/5 bg-slate-800/30 p-4 text-center text-sm text-slate-500">
        No rankings yet
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-900/50">
      {!compact && (
        <div className="border-b border-white/5 px-4 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Leaderboard</h3>
        </div>
      )}
      <div className="divide-y divide-white/5">
        {entries.map((entry, i) => {
          const isProfit = entry.profit >= 0;
          const rankLabel = RANK_LABELS[i] ?? `#${entry.rank}`;
          return (
            <div key={entry.name} className="flex items-center gap-3 px-4 py-3">
              <span className={`w-6 text-center text-sm font-bold ${RANK_COLORS[i] ?? 'text-slate-400'}`}>
                {rankLabel}
              </span>
              <span className="flex-1 truncate text-sm font-medium text-white">{entry.name}</span>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold text-white">{fmt(entry.netWorth)}</p>
                <p className={`font-mono text-xs ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isProfit ? '+' : ''}{fmt(entry.profit)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
