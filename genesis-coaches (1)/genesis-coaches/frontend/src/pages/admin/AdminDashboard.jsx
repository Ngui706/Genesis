import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    apiFetch('/reports/dashboard-summary').then(setSummary).catch((e) => toast.error(e.message));
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cream">Overview</h1>
      <p className="mt-1 text-sm text-slate">Real-time snapshot of the Genesis Coaches network.</p>
      <div className="route-line my-6" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total revenue" value={summary ? `KES ${Number(summary.totalRevenue).toLocaleString()}` : '—'} />
        <Kpi label="Confirmed bookings" value={summary?.totalBookings ?? '—'} />
        <Kpi label="Customers" value={summary?.totalCustomers ?? '—'} />
        <Kpi label="Active buses" value={summary?.activeBuses ?? '—'} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLink to="/admin/schedules" label="Schedule a trip" desc="Add a new departure to the network." />
        <QuickLink to="/admin/staff" label="Add staff" desc="Create a branch staff account." />
        <QuickLink to="/admin/reports" label="View analytics" desc="Revenue trend, occupancy, route performance." />
        <QuickLink to="/admin/promo-codes" label="Launch a promo" desc="Create a discount campaign." />
        <QuickLink to="/admin/refunds" label="Process refunds" desc="Review pending cancellation refunds." />
        <QuickLink to="/admin/settings" label="System settings" desc="Booking window, branding, cancellation policy." />
      </div>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-slate">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-cream">{value}</p>
    </div>
  );
}

function QuickLink({ to, label, desc }) {
  return (
    <Link to={to} className="card block transition hover:border-amber/40">
      <p className="font-display font-semibold text-cream">{label}</p>
      <p className="mt-1 text-sm text-slate">{desc}</p>
    </Link>
  );
}
