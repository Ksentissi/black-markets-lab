import { Link } from 'react-router-dom';

const Home = () => (
  <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-12">
    <div className="w-full max-w-5xl">
      <div className="mb-14 text-center">
        <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          Black-Scholes{' '}
          <span className="bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
            Market Simulator
          </span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-400">
          Trade against simulated markets driven by Geometric Brownian Motion. Study price dynamics,
          test strategies, or compete against a friend.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link
          to="/game"
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-8 transition duration-300 hover:-translate-y-1 hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-500/10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/8 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/15 text-2xl text-orange-500 transition-colors group-hover:bg-orange-500 group-hover:text-white">
              ▶
            </div>
            <h2 className="mb-3 text-xl font-bold text-white">Play</h2>
            <p className="mb-6 flex-1 text-sm text-slate-400 leading-relaxed">
              Start with $1,000,000 capital and trade against a live GBM simulation. Beat the market
              before time runs out.
            </p>
            <span className="inline-flex items-center text-sm font-semibold text-orange-400 group-hover:text-orange-300">
              Start Game
              <svg className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </div>
        </Link>

        <Link
          to="/simulation"
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-8 transition duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-2xl text-blue-500 transition-colors group-hover:bg-blue-500 group-hover:text-white">
              ∿
            </div>
            <h2 className="mb-3 text-xl font-bold text-white">Simulation</h2>
            <p className="mb-6 flex-1 text-sm text-slate-400 leading-relaxed">
              Configure volatility σ, initial price, and asset selection. Observe how Black-Scholes
              parameters shape price trajectories in real time.
            </p>
            <span className="inline-flex items-center text-sm font-semibold text-blue-400 group-hover:text-blue-300">
              Configure
              <svg className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </div>
        </Link>

        <Link
          to="/multiplayer"
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-8 transition duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-2xl text-violet-500 transition-colors group-hover:bg-violet-500 group-hover:text-white">
              ⇄
            </div>
            <h2 className="mb-3 text-xl font-bold text-white">Multiplayer</h2>
            <p className="mb-6 flex-1 text-sm text-slate-400 leading-relaxed">
              Challenge a friend on the same market simulation. Create a room, share the code, and
              compete for the highest final capital.
            </p>
            <span className="inline-flex items-center text-sm font-semibold text-violet-400 group-hover:text-violet-300">
              Create Room
              <svg className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </div>
        </Link>
      </div>
    </div>
  </section>
);

export default Home;
