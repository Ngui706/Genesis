import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function StaffRevenue() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/reports/dashboard-summary'),
      apiFetch('/reports/revenue'),
      apiFetch('/reports/route-performance'),
    ])
      .then(([sum, rev, perf]) => {
        setSummary(sum);
        setTrend(rev.trend || []);
        setPerformance(perf.performance?.slice(0, 8) || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate">Loading revenue data…</p>;

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Analytics</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-cream">Branch Revenue</h1>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Revenue', value: `KES ${Number(summary?.totalRevenue || 0).toLocaleString()}` },
          { label: 'Total Bookings', value: (summary?.totalBookings || 0).toLocaleString() },
          { label: 'Active Buses', value: (summary?.activeBuses || 0).toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-midnight-2 p-5">
            <p className="text-xs text-slate">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-cream">{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Trend */}
      {trend.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-midnight-2 p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-cream">Daily Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: '#F7F4EC' }} />
              <Bar dataKey="revenue" fill="#F2A93B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Route performance */}
      {performance.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-midnight-2 p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-cream">Top Routes by Revenue</h2>
          <div className="space-y-3">
            {performance.map((p) => (
              <div key={p.route} className="flex items-center justify-between rounded-lg bg-midnight-3 px-4 py-3 text-sm">
                <span className="text-cream">{p.route}</span>
                <div className="flex items-center gap-4 text-xs text-slate">
                  <span>{p.bookings} bookings</span>
                  <span className="font-semibold text-amber">KES {Number(p.revenue).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {trend.length === 0 && performance.length === 0 && (
        <p className="text-sm text-slate">No revenue data yet for your branch.</p>
      )}
    </div>
  );
}
