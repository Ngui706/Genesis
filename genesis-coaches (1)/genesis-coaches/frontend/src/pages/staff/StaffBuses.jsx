import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';

const EMPTY = { plate_number: '', name: '', bus_class: 'standard', seat_layout: { rows: 10, columns: 4 }, amenities: [] };

export default function StaffBuses() {
  const [buses, setBuses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => apiFetch('/admin/buses').then((r) => setBuses(r.data || [])).catch(() => {});

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/admin/buses', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Bus created!');
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Fleet</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-cream">Manage Buses</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : '+ Add Bus'}</button>
      </div>
      <div className="route-line my-6" />

      {showForm && (
        <form onSubmit={save} className="card mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="input-label">Plate Number *</label>
            <input className="input w-full" required value={form.plate_number} onChange={(e) => setForm((f) => ({ ...f, plate_number: e.target.value }))} />
          </div>
          <div>
            <label className="input-label">Bus Name</label>
            <input className="input w-full" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="input-label">Class</label>
            <select className="input w-full" value={form.bus_class} onChange={(e) => setForm((f) => ({ ...f, bus_class: e.target.value }))}>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="vip">VIP</option>
            </select>
          </div>
          <div>
            <label className="input-label">Rows × Columns</label>
            <div className="flex gap-2">
              <input type="number" min={1} max={20} className="input w-full" value={form.seat_layout.rows}
                onChange={(e) => setForm((f) => ({ ...f, seat_layout: { ...f.seat_layout, rows: Number(e.target.value) } }))} />
              <span className="py-2 text-slate">×</span>
              <input type="number" min={1} max={6} className="input w-full" value={form.seat_layout.columns}
                onChange={(e) => setForm((f) => ({ ...f, seat_layout: { ...f.seat_layout, columns: Number(e.target.value) } }))} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <button disabled={saving} className="btn-primary">{saving ? 'Creating…' : 'Create Bus'}</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 bg-midnight-3">
            <tr>
              {['Plate', 'Name', 'Class', 'Seats', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buses.map((b) => (
              <tr key={b.id} className="border-b border-white/5 transition hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-xs text-amber">{b.plate_number}</td>
                <td className="px-4 py-3 text-cream">{b.name || '—'}</td>
                <td className="px-4 py-3 capitalize text-slate">{b.bus_class}</td>
                <td className="px-4 py-3 text-slate">{b.total_seats}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.is_active ? 'bg-teal/10 text-teal-light' : 'bg-white/5 text-slate'}`}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {buses.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate">No buses found for your branch.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
