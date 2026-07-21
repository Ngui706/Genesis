import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';

const EMPTY = { title: '', body: '', image_url: '' };

export default function StaffNews() {
  const [updates, setUpdates] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    apiFetch('/admin/branch-updates')
      .then((r) => setUpdates(r.data || []))
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({ title: item.title || '', body: item.body || '', image_url: item.image_url || '' });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/admin/branch-updates/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
        toast.success('Update modified!');
      } else {
        await apiFetch('/admin/branch-updates', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Update submitted for admin approval!');
      }
      setForm(EMPTY);
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!confirm('Delete this update?')) return;
    try {
      await apiFetch(`/admin/branch-updates/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="rounded-full bg-teal/10 px-2.5 py-0.5 text-xs font-semibold text-teal-light">Approved (Live)</span>;
      case 'rejected':
        return <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger">Rejected</span>;
      default:
        return <span className="rounded-full bg-amber/10 px-2.5 py-0.5 text-xs font-semibold text-amber">Pending Approval</span>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Announcements</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-cream">Branch News & Updates</h1>
          <p className="mt-0.5 text-xs text-slate">Submissions are reviewed by Admins before appearing on the homepage.</p>
        </div>
        <button className="btn-primary" onClick={() => { if (showForm) setShowForm(false); else startCreate(); }}>
          {showForm ? 'Cancel' : '+ New Update'}
        </button>
      </div>
      <div className="route-line my-6" />

      {showForm && (
        <form onSubmit={save} className="card mb-6 space-y-4">
          <div>
            <label className="input-label">Title *</label>
            <input className="input w-full" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g., New Express Route to Mombasa Launched" />
          </div>
          <div>
            <label className="input-label">Banner / Image URL (optional)</label>
            <input className="input w-full" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://example.com/banner.jpg" />
          </div>
          <div>
            <label className="input-label">Body Content *</label>
            <textarea className="input h-32 w-full" required value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Write your announcement details here..." />
          </div>
          <button disabled={saving} className="btn-primary">
            {saving ? 'Submitting…' : editingId ? 'Update Draft' : 'Submit for Approval'}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {updates.map((item) => (
          <div key={item.id} className="rounded-xl border border-white/10 bg-midnight-2 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-base font-semibold text-cream">{item.title}</h3>
                  {getStatusBadge(item.status)}
                </div>
                <p className="mt-1 text-xs text-slate">
                  Submitted {new Date(item.created_at).toLocaleDateString()}
                  {item.reviewer && ` · Reviewed by ${item.reviewer.full_name}`}
                </p>
              </div>
              {item.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(item)} className="text-xs text-amber hover:underline">Edit</button>
                  <button onClick={() => del(item.id)} className="text-xs text-danger/70 hover:text-danger">Delete</button>
                </div>
              )}
            </div>
            {item.image_url && (
              <img src={item.image_url} alt="" className="mt-3 h-40 w-full rounded-lg object-cover" />
            )}
            <p className="mt-3 text-sm leading-relaxed text-slate line-clamp-3">{item.body}</p>
          </div>
        ))}

        {updates.length === 0 && (
          <p className="py-8 text-center text-sm text-slate">No news or updates submitted for your branch yet.</p>
        )}
      </div>
    </div>
  );
}
