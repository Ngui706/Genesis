import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ExportButtons } from '../../lib/exportData';

export default function StaffCustomers() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch('/admin/customers')
      .then((r) => setCustomers(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.branch_id]);

  const filtered = customers.filter(
    (c) =>
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">People</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-cream">Branch Customers</h1>
      <p className="mt-0.5 text-xs text-slate">Customers who have booked trips on your branch.</p>
      <div className="mt-4"><ExportButtons filename="staff-customers" title="Branch customers" rows={filtered} columns={[{ key: 'full_name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { label: 'Status', getValue: (c) => c.is_active ? 'Active' : 'Suspended' }, { label: 'Joined', getValue: (c) => new Date(c.created_at).toLocaleDateString() }]} /></div>
      <div className="route-line my-6" />

      <input
        className="input mb-6 w-full max-w-sm"
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="text-slate">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-midnight-3">
              <tr>
                {['Name', 'Email', 'Phone', 'Status', 'Joined'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-cream">{c.full_name || '—'}</td>
                  <td className="px-4 py-3 text-slate">{c.email}</td>
                  <td className="px-4 py-3 text-slate">{c.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.is_active ? 'bg-teal/10 text-teal-light' : 'bg-danger/10 text-danger'}`}>
                      {c.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
