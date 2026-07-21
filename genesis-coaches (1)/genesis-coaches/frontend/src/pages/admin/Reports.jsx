import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';

const COLORS = ['#F2A93B', '#1E7F72', '#E15554', '#3FB3A3', '#FBCE85', '#5B6472'];

export default function Reports() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [revenue, setRevenue] = useState(null);
  const [occupancy, setOccupancy] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch branches once
  useEffect(() => {
    apiFetch('/admin/branches')
      .then((d) => setBranches(d.data || []))
      .catch(() => {});
  }, []);

  // Fetch report data whenever selectedBranch changes
  useEffect(() => {
    setLoading(true);
    const branchQuery = selectedBranch !== 'all' ? `?branch_id=${selectedBranch}` : '';
    Promise.all([
      apiFetch(`/reports/revenue${branchQuery}`),
      apiFetch(`/reports/occupancy${branchQuery}`),
      apiFetch(`/reports/route-performance${branchQuery}`),
    ])
      .then(([r, o, p]) => {
        setRevenue(r);
        setOccupancy(o.occupancy || []);
        setPerformance(p.performance || []);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [selectedBranch]);

  return (
    <div className="space-y-8">
      {/* Header & Branch Filter */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">Reports & analytics</h1>
          <p className="mt-1 text-sm text-slate">Revenue trends, seat occupancy, and route performance by branch across the network.</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-mono uppercase tracking-wider text-amber">Branch Filter:</label>
          <select
            className="input !py-2 text-sm !bg-midnight-3 !w-auto min-w-[200px]"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="all">All Branches (Entire Network)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.city})
              </option>
            ))}
            <option value="unassigned">Online / Unassigned</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-slate">Crunching the numbers…</p>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label={selectedBranch === 'all' ? 'Total Revenue' : 'Branch Revenue'}
              value={`KES ${Number(revenue?.totalRevenue || 0).toLocaleString()}`}
            />
            <StatCard label="Confirmed Bookings" value={revenue?.bookingCount ?? 0} />
            <StatCard
              label="Avg. Occupancy"
              value={`${occupancy.length ? Math.round(occupancy.reduce((a, b) => a + b.occupancyRate, 0) / occupancy.length) : 0}%`}
            />
          </div>

          {/* Revenue Breakdown per Branch (Shown when All Branches is selected or available) */}
          {revenue?.byBranch && revenue.byBranch.length > 0 && (
            <div className="card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-semibold text-cream">Revenue by Branch</h2>
                  <p className="text-xs text-slate">Comparative breakdown of earnings and booking volume per depot.</p>
                </div>
                {selectedBranch !== 'all' && (
                  <button
                    onClick={() => setSelectedBranch('all')}
                    className="text-xs text-amber hover:underline font-medium"
                  >
                    Reset filter to All Branches
                  </button>
                )}
              </div>

              {/* Bar Chart comparing branches */}
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenue.byBranch} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="branchName" stroke="#8890A0" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="#8890A0" fontSize={11} tickFormatter={(v) => `KES ${v >= 1000 ? v / 1000 + 'k' : v}`} />
                  <Tooltip
                    contentStyle={{ background: '#121826', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    formatter={(val) => [`KES ${Number(val).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {revenue.byBranch.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.branchId === selectedBranch ? '#F2A93B' : COLORS[idx % COLORS.length]}
                        onClick={() => setSelectedBranch(entry.branchId)}
                        className="cursor-pointer hover:opacity-80 transition"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Branch Summary Table */}
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate">
                      <th className="px-4 py-2 font-medium">Branch</th>
                      <th className="px-4 py-2 font-medium">Bookings</th>
                      <th className="px-4 py-2 font-medium">Revenue</th>
                      <th className="px-4 py-2 font-medium text-right">% Network Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenue.byBranch.map((b) => {
                      const share = revenue.totalRevenue ? Math.round((b.revenue / revenue.totalRevenue) * 100) : 0;
                      const isSelected = selectedBranch === b.branchId;
                      return (
                        <tr
                          key={b.branchId}
                          onClick={() => setSelectedBranch(b.branchId)}
                          className={`border-b border-white/5 last:border-0 cursor-pointer transition ${
                            isSelected ? 'bg-amber/10' : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <td className="px-4 py-2 font-medium text-cream flex items-center gap-2">
                            <span>{b.branchName}</span>
                            {isSelected && <span className="rounded bg-amber px-1.5 py-0.5 text-[10px] font-bold text-midnight">Active filter</span>}
                          </td>
                          <td className="px-4 py-2 text-slate">{b.bookingCount}</td>
                          <td className="px-4 py-2 font-mono text-amber">KES {b.revenue.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right text-slate font-mono">{share}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Revenue Trend Over Time */}
          <div className="card">
            <h2 className="mb-4 font-display text-lg font-semibold text-cream">
              Revenue trend {selectedBranch !== 'all' ? `(${branches.find(b => b.id === selectedBranch)?.name || 'Filtered'})` : ''}
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenue?.trend || []}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#8890A0" fontSize={12} />
                <YAxis stroke="#8890A0" fontSize={12} />
                <Tooltip contentStyle={{ background: '#121826', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="revenue" stroke="#F2A93B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Occupancy by Trip */}
          <div className="card">
            <h2 className="mb-4 font-display text-lg font-semibold text-cream">Occupancy by recent trip</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={occupancy.slice(0, 15)}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="route" stroke="#8890A0" fontSize={10} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke="#8890A0" fontSize={12} unit="%" />
                <Tooltip contentStyle={{ background: '#121826', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="occupancyRate" fill="#1E7F72" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Route Performance */}
          <div className="card">
            <h2 className="mb-4 font-display text-lg font-semibold text-cream">Route performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate">
                    <th className="px-4 py-2 font-medium">Route</th>
                    <th className="px-4 py-2 font-medium">Bookings</th>
                    <th className="px-4 py-2 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-slate">No routes found for this selection.</td>
                    </tr>
                  ) : (
                    performance.map((p) => (
                      <tr key={p.route} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-2 text-cream">{p.route}</td>
                        <td className="px-4 py-2 text-cream">{p.bookings}</td>
                        <td className="px-4 py-2 font-mono text-amber">KES {p.revenue.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-slate">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-cream">{value}</p>
    </div>
  );
}
