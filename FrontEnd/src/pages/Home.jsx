import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

const ModeCard = ({ icon, title, description, badge, onClick, accent }) => (
  <button
    onClick={onClick}
    className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-10 text-left backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-${accent}-500/50 hover:shadow-2xl hover:shadow-${accent}-500/10`}
  >
    <div className={`absolute inset-0 bg-gradient-to-br from-${accent}-500/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100`} />
    <div className="relative z-10 flex h-full flex-col items-start">
      <div className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-${accent}-500/20 text-3xl text-${accent}-500 transition-colors group-hover:bg-${accent}-500 group-hover:text-white`}>
        {icon}
      </div>
      {badge && (
        <span className={`mb-3 rounded-full bg-${accent}-500/20 px-3 py-1 text-xs font-semibold text-${accent}-400`}>
          {badge}
        </span>
      )}
      <h2 className="mb-4 text-3xl font-bold text-white">{title}</h2>
      <p className="mb-8 flex-1 leading-relaxed text-slate-400">{description}</p>
      <span className={`inline-flex items-center font-semibold text-${accent}-400 group-hover:text-${accent}-300`}>
        Select
        <svg className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </span>
    </div>
  </button>
);

const Home = () => {
  const navigate   = useNavigate();
  const { selectMode, resetGame } = useGame();

  const handleSelectMode = (m) => {
    resetGame();          // clear any previous game state
    selectMode(m);
    navigate('/game');
  };

  return (
    <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl">
        {/* Hero */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 bg-gradient-to-r from-orange-400 to-amber-600 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
            Black-Scholes Markets
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            Experience realistic market dynamics powered by the Black-Scholes model.
            Challenge yourself or compete against friends in real-time.
          </p>
        </div>

        {/* Mode selection */}
        <div className="mb-10 grid gap-8 md:grid-cols-2">
          <ModeCard
            icon="👤"
            accent="orange"
            title="Solo"
            description={
              <>
                Start with <strong className="text-white">$1,000,000</strong> and trade
                alone. Master the market in a fast-paced 3-minute session.
                Buy insights to gain an edge — without affecting price.
              </>
            }
            onClick={() => handleSelectMode('solo')}
          />
          <ModeCard
            icon="👥"
            accent="purple"
            badge="Multiplayer"
            title="With Friends"
            description="Create a room and invite friends to compete on the same market timeline. Everyone trades simultaneously — only one player walks away with the best portfolio."
            onClick={() => handleSelectMode('multiplayer')}
          />
        </div>

        {/* Simulation mode link */}
        <div className="text-center">
          <p className="mb-3 text-sm text-slate-500">Just want to visualise price dynamics?</p>
          <a
            href="/simulation"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/50 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            📈 Launch Simulation
          </a>
        </div>
      </div>
    </section>
  );
};

export default Home;
