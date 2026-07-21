import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [createForm, setCreateForm] = useState({ fullName: '', email: '', phone: '', branchId: '' });
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', branch_id: '', is_active: true });
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
        body: JSON.stringify({ ...createForm, loginUrl: `${window.location.origin}/login` }),
      });
      toast.success('Staff account created — credentials emailed');
      setCreating(false);
      setCreateForm({ fullName: '', email: '', phone: '', branchId: '' });
      load();
    } catch (err) {
      toast.error(err.message || 'Could not create staff account');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (member) => {
    setEditingStaff(member);
    setEditForm({
      full_name: member.full_name || '',
      phone: member.phone || '',
      branch_id: member.branch_id || '',
      is_active: member.is_active ?? true,
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/admin/staff/${editingStaff.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      toast.success('Staff member updated');
      setEditingStaff(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to update staff member');
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
    if (!confirm(`Permanently delete ${member.full_name}'s account? This action cannot be undone.`)) return;
    try {
      await apiFetch(`/admin/staff/${member.id}`, { method: 'DELETE' });
      toast.success('Staff member deleted');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">Staff Management</h1>
          <p className="mt-1 text-sm text-slate">Create, edit, assign branches, or remove staff members across your network.</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary !px-4 !py-2 text-sm">+ Add staff</button>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate">
              <th className="px-4 py-3 font-medium">Name & Email</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate">Loading…</td></tr>}
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-cream font-medium">
                  {s.full_name}
                  <br />
                  <span className="text-xs text-slate">{s.email} {s.phone ? `· ${s.phone}` : ''}</span>
                </td>
                <td className="px-4 py-3 text-cream">{s.branch?.name || <span className="text-slate-dim">Unassigned</span>}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.is_active ? 'bg-teal/10 text-teal-light' : 'bg-danger/10 text-danger'}`}>
                    {s.is_active ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end items-center gap-3">
                    <button onClick={() => startEdit(s)} className="text-xs font-medium text-amber hover:underline">Edit</button>
                    <button onClick={() => toggleActive(s)} className="text-xs font-medium text-slate hover:text-cream hover:underline">{s.is_active ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={() => removeStaff(s)} className="text-xs font-medium text-danger hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && staff.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate">No staff accounts found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Staff Modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setCreating(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} className="card max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto">
            <h2 className="font-display text-lg font-semibold text-cream">New staff account</h2>
            <div>
              <label className="label">Full name *</label>
              <input className="input" value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Branch *</label>
              <select className="input" value={createForm.branchId} onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })} required>
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

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setEditingStaff(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleUpdate} className="card max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto">
            <h2 className="font-display text-lg font-semibold text-cream">Edit staff member</h2>
            <p className="text-xs text-slate">{editingStaff.email}</p>
            <div>
              <label className="label">Full name *</label>
              <input className="input" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Branch</label>
              <select className="input" value={editForm.branch_id} onChange={(e) => setEditForm({ ...editForm, branch_id: e.target.value })}>
                <option value="">Unassigned</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Account Status</label>
              <select className="input" value={editForm.is_active ? 'active' : 'inactive'} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'active' })}>
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditingStaff(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
