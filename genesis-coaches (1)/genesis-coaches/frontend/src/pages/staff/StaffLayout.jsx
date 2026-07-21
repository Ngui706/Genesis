import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/staff', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/staff/branch', label: 'My Branch', icon: '🌿' },
  { to: '/staff/buses', label: 'Buses', icon: '🚌' },
  { to: '/staff/routes', label: 'Routes', icon: '🛣️' },
  { to: '/staff/schedules', label: 'Schedules', icon: '📅' },
  { to: '/staff/promo-codes', label: 'Promo Codes', icon: '💸' },
  { to: '/staff/revenue', label: 'Revenue', icon: '📊' },
  { to: '/staff/customers', label: 'Customers', icon: '👥' },
  { to: '/staff/news', label: 'News & Updates', icon: '📰' },
  { to: '/staff/boarding', label: 'Boarding', icon: '🎫' },
];

export default function StaffLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-midnight">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-midnight-2 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber/20">
            <span className="text-sm font-bold text-amber">G</span>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-cream">GENESIS</p>
            <p className="text-[10px] text-slate">Staff Portal</p>
          </div>
        </div>

        {/* Branch Info */}
        <div className="border-b border-white/10 px-6 py-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-amber">Branch</p>
          <p className="mt-0.5 text-sm font-semibold text-cream">{profile?.branch?.name || 'Unassigned'}</p>
          <p className="text-xs text-slate">{profile?.full_name}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  isActive
                    ? 'border-r-2 border-amber bg-amber/10 text-amber'
                    : 'text-slate hover:bg-white/5 hover:text-cream'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sign Out */}
        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleSignOut}
            className="w-full rounded-lg border border-white/10 px-4 py-2 text-sm text-slate transition hover:border-danger/30 hover:text-danger"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-white/10 bg-midnight-2 px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate hover:bg-white/5 hover:text-cream"
          >
            ☰
          </button>
          <p className="font-display text-sm font-semibold text-cream">Staff Portal</p>
          <div className="w-8" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
