import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

function StatCard({ label, value, icon, sub }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-midnight-2 p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-widest text-slate">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-cream">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate">{sub}</p>}
    </div>
  );
}

export default function StaffHome() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/reports/dashboard-summary')
      .then((r) => setSummary(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Staff Portal</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-cream">
        Welcome, {profile?.full_name?.split(' ')[0]}
      </h1>
      <p className="mt-1 text-sm text-slate">
        Branch: <span className="text-amber">{profile?.branch?.name || 'Unassigned'}</span>
      </p>
      <div className="route-line my-6" />

      {loading ? (
        <p className="text-slate">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Bookings" value={summary?.totalBookings?.toLocaleString() ?? '—'} icon="🎟️" sub="Confirmed bookings" />
          <StatCard label="Branch Customers" value={summary?.totalCustomers?.toLocaleString() ?? '—'} icon="👥" sub="Unique customers" />
          <StatCard label="Active Buses" value={summary?.activeBuses?.toLocaleString() ?? '—'} icon="🚌" sub="In your fleet" />
          <StatCard
            label="Revenue"
            value={summary?.totalRevenue != null ? `KES ${Number(summary.totalRevenue).toLocaleString()}` : '—'}
            icon="💰"
            sub="Branch total"
          />
        </div>
      )}
    </div>
  );
}
