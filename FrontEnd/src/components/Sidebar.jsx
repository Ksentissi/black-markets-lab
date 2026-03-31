import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/',           label: 'Home',       icon: '🏠' },
  { to: '/game',       label: 'Game',       icon: '🎮' },
  { to: '/dashboard',  label: 'Dashboard',  icon: '📊' },
  { to: '/simulation', label: 'Simulation', icon: '📈' },
];

const Sidebar = () => (
  <aside className="hidden border-r border-white/5 bg-slate-950/90 p-6 lg:block">
    <div className="mb-8 space-y-1">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Navigate</p>
    </div>
    <nav className="flex flex-col gap-2">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition hover:bg-white/5',
              isActive ? 'bg-white/10 text-white' : 'text-slate-400',
            ].join(' ')
          }
        >
          <span>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  </aside>
);

export default Sidebar;
