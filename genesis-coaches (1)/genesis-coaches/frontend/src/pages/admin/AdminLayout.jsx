import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/branches', label: 'Branches' },
  { to: '/admin/buses', label: 'Buses' },
  { to: '/admin/routes', label: 'Routes' },
  { to: '/admin/schedules', label: 'Schedules' },
  { to: '/admin/staff', label: 'Staff' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/promo-codes', label: 'Promo codes' },
  { to: '/admin/refunds', label: 'Refunds' },
  { to: '/admin/reports', label: 'Reports & analytics' },
  { to: '/admin/settings', label: 'System settings' },
  { to: '/admin/audit-logs', label: 'Audit logs' },
  { to: '/admin/popular-routes', label: 'Popular routes ✦', group: 'Homepage' },
  { to: '/admin/featured-branches', label: 'Featured branches ✦', group: 'Homepage' },
  { to: '/admin/branch-updates', label: 'Branch updates ✦', group: 'Homepage' },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <aside
        id="admin-sidebar"
        aria-label="Admin navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-y-auto border-r border-white/10 bg-midnight-2 px-6 py-8 transition-transform duration-300 lg:static lg:block lg:w-56 lg:shrink-0 lg:translate-x-0 lg:border-0 lg:bg-transparent lg:p-0 lg:overflow-visible ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-6 flex items-center justify-between lg:block">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Admin</p>
          <button type="button" aria-label="Close admin navigation" onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-slate hover:bg-white/5 hover:text-cream lg:hidden">
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </div>
        <nav className="space-y-1">
          {NAV.map((item, idx) => (
            <div key={item.to}>
              {/* Section divider before the first Homepage item */}
              {item.group === 'Homepage' && NAV[idx - 1]?.group !== 'Homepage' && (
                <p className="mt-4 mb-1 px-3 font-mono text-[10px] uppercase tracking-[0.3em] text-amber/60">
                  Homepage
                </p>
              )}
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-amber/15 text-amber' : 'text-slate hover:bg-white/5 hover:text-cream'
                  }`
                }
                onClick={() => setSidebarOpen(false)}
              >
                {item.label.replace(' ✦', '')}
              </NavLink>
            </div>
          ))}
        </nav>
      </aside>

      {sidebarOpen && (
        <button type="button" aria-label="Close admin navigation" className="fixed inset-0 z-30 cursor-default bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="min-w-0 flex-1">
        <header className="mb-6 flex items-center justify-between border-b border-white/10 pb-4 lg:hidden">
          <button type="button" aria-label="Open admin navigation" aria-controls="admin-sidebar" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate hover:bg-white/5 hover:text-cream">
            <span aria-hidden="true" className="text-xl">☰</span>
          </button>
          <p className="font-display text-sm font-semibold text-cream">Admin Portal</p>
          <div className="w-8" aria-hidden="true" />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
