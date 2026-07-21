import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', branchId: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([apiFetch('/admin/staff'), apiFetch('/admin/branches')])
      .then(([s, b]) => { setStaff(s.data || []); setBranches(b.data || []); })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/auth/staff', {
        method: 'POST',
        body: JSON.stringify({ ...form, loginUrl: `${window.location.origin}/login` }),
      });
      toast.success('Staff account created — credentials emailed');
      setCreating(false);
      setForm({ fullName: '', email: '', phone: '', branchId: '' });
      load();
    } catch (err) {
      toast.error(err.message || 'Could not create staff account');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member) => {
    try {
      await apiFetch(`/admin/staff/${member.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !member.is_active }) });
      toast.success(member.is_active ? 'Staff deactivated' : 'Staff activated');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const removeStaff = async (member) => {
    if (!confirm(`Permanently remove ${member.full_name}'s account?`)) return;
    try {
      await apiFetch(`/admin/staff/${member.id}`, { method: 'DELETE' });
      toast.success('Removed');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">Staff</h1>
          <p className="mt-1 text-sm text-slate">Staff log in with a temporary password and must set a new one on first login.</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary !px-4 !py-2 text-sm">+ Add staff</button>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate">Loading…</td></tr>}
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-cream">{s.full_name}<br /><span className="text-xs text-slate">{s.phone}</span></td>
                <td className="px-4 py-3 text-cream">{s.branch?.name || '—'}</td>
                <td className="px-4 py-3 text-cream">{s.is_active ? 'Active' : 'Deactivated'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => toggleActive(s)} className="text-xs font-medium text-amber hover:underline">{s.is_active ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={() => removeStaff(s)} className="text-xs font-medium text-danger hover:underline">Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setCreating(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} className="card max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto">
            <h2 className="font-display text-lg font-semibold text-cream">New staff account</h2>
            <div>
              <label className="label">Full name</label>
              <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Branch</label>
              <select className="input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required>
                <option value="" disabled>Select branch</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <p className="text-xs text-slate">A temporary password will be generated and emailed to them, along with a forced reset on first login.</p>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setCreating(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating…' : 'Create account'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
