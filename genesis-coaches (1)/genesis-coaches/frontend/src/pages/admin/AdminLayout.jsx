import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';

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
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-8 px-6 py-10">
      <aside className="hidden w-56 shrink-0 lg:block">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-amber">Admin</p>
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
              >
                {item.label.replace(' ✦', '')}
              </NavLink>
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <select
          className="input mb-6 lg:hidden"
          value={location.pathname}
          onChange={(e) => navigate(e.target.value)}
        >
          {NAV.map((item) => (
            <option key={item.to} value={item.to}>{item.label}</option>
          ))}
        </select>
        <Outlet />
      </main>
    </div>
  );
}
