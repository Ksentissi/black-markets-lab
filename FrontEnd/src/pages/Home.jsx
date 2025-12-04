import { Link } from 'react-router-dom';

const heroStats = [
  { label: 'Simulations', value: '24k+' },
  { label: 'Assets', value: '120+' },
  { label: 'Latency', value: '<15ms' },
];

const Home = () => (
  <section className="mx-auto flex max-w-5xl flex-col gap-10 py-10">
    <div className="space-y-6 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Trading Playground</p>
      <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
      Test Your Trading Strategies in Real-Time.
      </h1>
      <p className="mx-auto max-w-2xl text-base text-slate-300">
        Build algorithmic strategies, run Monte Carlo scenarios, and inspect real-time performance,
        all from a single React-powered cockpit connected to your Python engine.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          to="/simulation"
          className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
        >
          Launch Simulation
        </Link>
        <Link
          to="/dashboard"
          className="rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/5"
        >
          View Dashboard
        </Link>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {heroStats.map((stat) => (
        <div key={stat.label} className="card-surface p-6 text-center">
          <p className="text-3xl font-bold text-white">{stat.value}</p>
          <p className="text-sm uppercase tracking-widest text-slate-400">{stat.label}</p>
        </div>
      ))}
    </div>
  </section>
);

export default Home;

