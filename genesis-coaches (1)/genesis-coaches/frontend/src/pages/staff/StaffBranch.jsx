import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function StaffBranch() {
  const { profile, refreshProfile } = useAuth();
  const branchId = profile?.branch_id;
  const [form, setForm] = useState({ name: '', city: '', address: '', phone: '', email: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    apiFetch('/admin/branches')
      .then((r) => {
        const b = (r.data || []).find((b) => b.id === branchId);
        if (b) setForm({ name: b.name || '', city: b.city || '', address: b.address || '', phone: b.phone || '', email: b.email || '', description: b.description || '' });
      })
      .catch(() => {});
  }, [branchId]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/admin/branches/${branchId}`, { method: 'PUT', body: JSON.stringify(form) });
      toast.success('Branch updated!');
      refreshProfile();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!branchId) return <p className="text-slate">No branch assigned to your account yet.</p>;

  const field = (label, key, type = 'text') => (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate">{label}</label>
      <input
        type={type}
        className="input w-full"
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="max-w-xl">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">My Branch</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-cream">Edit Branch Details</h1>
      <div className="route-line my-6" />

      <form onSubmit={save} className="card space-y-4">
        {field('Branch Name', 'name')}
        {field('City', 'city')}
        {field('Address', 'address')}
        {field('Phone', 'phone', 'tel')}
        {field('Email', 'email', 'email')}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate">Description</label>
          <textarea
            className="input h-24 w-full"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <button disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
