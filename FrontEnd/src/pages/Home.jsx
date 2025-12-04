import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl">
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
            Master the <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-600">Black-Scholes</span> Market
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            Experience the thrill of trading with our realistic market simulator. 
            Test your strategies or visualize price movements with advanced modeling.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Game Mode Card */}
          <Link
            to="/game"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-10 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            
            <div className="relative z-10 flex h-full flex-col items-start">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/20 text-3xl text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                🎮
              </div>
              <h2 className="mb-4 text-3xl font-bold text-white">Start a Game</h2>
              <p className="mb-8 flex-1 text-slate-400 leading-relaxed">
                Start with <strong>$1,000,000</strong> capital. Challenge yourself to beat the market in a fast-paced 3-minute trading session. Buy low, sell high!
              </p>
              <span className="inline-flex items-center font-semibold text-orange-400 group-hover:text-orange-300">
                Play Now 
                <svg className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </div>
          </Link>

          {/* Simulation Mode Card */}
          <Link
            to="/simulation"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-10 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            
            <div className="relative z-10 flex h-full flex-col items-start">
               <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 text-3xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                📈
              </div>
              <h2 className="mb-4 text-3xl font-bold text-white">Launch Simulation</h2>
              <p className="mb-8 flex-1 text-slate-400 leading-relaxed">
                Customize volatility, initial prices, and assets. Visualize how Black-Scholes parameters affect stock price trajectories in real-time.
              </p>
              <span className="inline-flex items-center font-semibold text-blue-400 group-hover:text-blue-300">
                Configure Simulation
                <svg className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Home;
