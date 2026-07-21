import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const EMPTY = { code: '', discount_type: 'percent', discount_value: '', max_uses: '', expires_at: '', is_active: true };

export default function StaffPromos() {
  const { profile } = useAuth();
  const [promos, setPromos] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => apiFetch('/admin/promo-codes').then((r) => setPromos(r.data || [])).catch(() => {});

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/admin/promo-codes', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          discount_value: Number(form.discount_value),
          max_uses: form.max_uses ? Number(form.max_uses) : null,
          expires_at: form.expires_at || null,
        }),
      });
      toast.success('Promo code created!');
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  const toggleActive = async (promo) => {
    try {
      await apiFetch(`/admin/promo-codes/${promo.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !promo.is_active }) });
      load();
    } catch (err) { toast.error(err.message); }
  };

  const del = async (id) => {
    if (!confirm('Delete this promo code?')) return;
    try {
      await apiFetch(`/admin/promo-codes/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Promotions</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-cream">Promo Codes</h1>
          <p className="mt-0.5 text-xs text-slate">Codes are automatically scoped to your branch.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ Create Promo'}
        </button>
      </div>
      <div className="route-line my-6" />

      {showForm && (
        <form onSubmit={save} className="card mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="input-label">Code *</label>
            <input className="input w-full uppercase" required value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
          </div>
          <div>
            <label className="input-label">Discount Type</label>
            <select className="input w-full" value={form.discount_type}
              onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}>
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed (KES)</option>
            </select>
          </div>
          <div>
            <label className="input-label">Discount Value *</label>
            <input type="number" min={0} step="0.01" className="input w-full" required value={form.discount_value}
              onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))} />
          </div>
          <div>
            <label className="input-label">Max Uses (blank = unlimited)</label>
            <input type="number" min={1} className="input w-full" value={form.max_uses}
              onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))} />
          </div>
          <div>
            <label className="input-label">Expires At</label>
            <input type="datetime-local" className="input w-full" value={form.expires_at}
              onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <button disabled={saving} className="btn-primary">
              {saving ? 'Creating…' : 'Create Promo Code'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {promos.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-midnight-2 px-5 py-4">
            <div>
              <p className="font-mono text-sm font-bold text-amber">{p.code}</p>
              <p className="text-xs text-slate">
                {p.discount_type === 'percent' ? `${p.discount_value}% off` : `KES ${p.discount_value} off`}
                {p.expires_at && ` · Expires ${new Date(p.expires_at).toLocaleDateString()}`}
                {p.max_uses && ` · Max ${p.max_uses} uses`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleActive(p)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${p.is_active ? 'bg-teal/10 text-teal-light' : 'bg-white/5 text-slate'}`}
              >
                {p.is_active ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => del(p.id)} className="text-xs text-danger/60 hover:text-danger">Delete</button>
            </div>
          </div>
        ))}
        {promos.length === 0 && <p className="text-sm text-slate">No promo codes for your branch yet.</p>}
      </div>
    </div>
  );
}
