import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/game', label: 'Play' },
  { to: '/simulation', label: 'Simulation' },
  { to: '/multiplayer', label: 'Multiplayer' },
];

const Sidebar = () => (
  <aside className="hidden border-r border-white/5 bg-slate-950/90 p-6 lg:block">
    <div className="mb-8">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-600">Navigate</p>
    </div>
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            [
              'rounded-lg px-4 py-2.5 text-sm font-medium transition hover:bg-white/5',
              isActive ? 'bg-white/10 text-white' : 'text-slate-400',
            ].join(' ')
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  </aside>
);

export default Sidebar;

