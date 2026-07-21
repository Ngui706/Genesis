import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';

export default function ManageCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch('/admin/customers').then((d) => setCustomers(d.data || [])).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (c) => {
    try {
      await apiFetch(`/admin/customers/${c.id}/active`, { method: 'PUT', body: JSON.stringify({ is_active: !c.is_active }) });
      toast.success(c.is_active ? 'Account disabled' : 'Account enabled');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cream">Customers</h1>
      <p className="mt-1 text-sm text-slate">Manage registered customer accounts and their loyalty balance.</p>
      <div className="card mt-6 overflow-x-auto !p-0">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Loyalty points</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate">Loading…</td></tr>}
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-cream">{c.full_name}</td>
                <td className="px-4 py-3 text-cream">{c.phone || '—'}</td>
                <td className="px-4 py-3 font-mono text-amber">{c.loyalty_points}</td>
                <td className="px-4 py-3 text-cream">{c.is_active ? 'Active' : 'Disabled'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleActive(c)} className="text-xs font-medium text-amber hover:underline">
                    {c.is_active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
