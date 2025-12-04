import { Link } from 'react-router-dom';

const Navbar = () => (
  <header className="sticky top-0 z-20 border-b border-white/5 bg-slate-900/70 backdrop-blur">
    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <Link to="/" className="text-xl font-semibold tracking-tight text-white">
        Black Markets Lab
      </Link>
      <div className="flex items-center gap-3 text-sm text-slate-300">
        <span className="hidden sm:inline">Next-gen trading simulator</span>
        <span className="rounded-full border border-brand/20 px-3 py-1 text-brand-light">
          Alpha Preview
        </span>
      </div>
    </div>
  </header>
);

export default Navbar;

