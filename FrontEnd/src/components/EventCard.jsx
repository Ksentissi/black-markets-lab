const EventCard = ({ title, timestamp, description, sentiment = 'neutral' }) => {
  const sentimentColor = {
    bullish: 'text-emerald-400',
    bearish: 'text-rose-400',
    neutral: 'text-slate-300',
  }[sentiment] || 'text-slate-300';

  return (
    <article className="card-surface flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
        <span>{timestamp}</span>
        <span className={sentimentColor}>{sentiment}</span>
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-300">{description}</p>
    </article>
  );
};

export default EventCard;

