import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';

export default function ManageSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch('/admin/schedules-admin'),
      apiFetch('/admin/routes-admin'),
      apiFetch('/admin/buses'),
      apiFetch('/admin/branches'),
    ])
      .then(([s, r, b, br]) => { setSchedules(s.data || []); setRoutes(r.data || []); setBuses(b.data || []); setBranches(br.data || []); })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ status: 'scheduled' }); setEditing({}); };
  const openEdit = (s) => {
    setForm({
      route_id: s.route_id, bus_id: s.bus_id, branch_id: s.branch_id || '',
      departure_time: s.departure_time?.slice(0, 16), arrival_time: s.arrival_time?.slice(0, 16),
      fare: s.fare, status: s.status, driver_name: s.driver_name || '', conductor_name: s.conductor_name || '',
    });
    setEditing(s);
  };
  const close = () => setEditing(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isNew = !editing.id;
      const payload = {
        ...form,
        departure_time: form.departure_time ? new Date(form.departure_time).toISOString() : undefined,
        arrival_time: form.arrival_time ? new Date(form.arrival_time).toISOString() : undefined,
        fare: Number(form.fare),
      };
      await apiFetch(isNew ? '/admin/schedules-admin' : `/admin/schedules-admin/${editing.id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      });
      toast.success(isNew ? 'Trip scheduled' : 'Schedule updated');
      close();
      load();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!confirm('Cancel/delete this scheduled trip?')) return;
    try {
      await apiFetch(`/admin/schedules-admin/${s.id}`, { method: 'DELETE' });
      toast.success('Removed');
      load();
    } catch (err) { toast.error(err.message || 'Delete failed'); }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">Schedules</h1>
          <p className="mt-1 text-sm text-slate">Trip instances customers can search and book.</p>
        </div>
        <button onClick={openCreate} className="btn-primary !px-4 !py-2 text-sm">+ Schedule trip</button>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate">
              <th className="px-4 py-3 font-medium">Route</th>
              <th className="px-4 py-3 font-medium">Bus</th>
              <th className="px-4 py-3 font-medium">Departure</th>
              <th className="px-4 py-3 font-medium">Fare</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate">Loading…</td></tr>}
            {schedules.map((s) => (
              <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-cream">{s.route?.origin} → {s.route?.destination}</td>
                <td className="px-4 py-3 text-cream">{s.bus?.name || s.bus?.plate_number}</td>
                <td className="px-4 py-3 text-cream">{new Date(s.departure_time).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-cream">KES {Number(s.fare).toLocaleString()}</td>
                <td className="px-4 py-3 text-cream capitalize">{s.status}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(s)} className="text-xs font-medium text-amber hover:underline">Edit</button>
                    <button onClick={() => handleDelete(s)} className="text-xs font-medium text-danger hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={close}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSave} className="card w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-lg font-semibold text-cream">{editing.id ? 'Edit schedule' : 'New schedule'}</h2>
            <div>
              <label className="label">Route</label>
              <select className="input" value={form.route_id || ''} onChange={(e) => setForm({ ...form, route_id: e.target.value })} required>
                <option value="" disabled>Select route</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Bus</label>
              <select className="input" value={form.bus_id || ''} onChange={(e) => setForm({ ...form, bus_id: e.target.value })} required>
                <option value="" disabled>Select bus</option>
                {buses.map((b) => <option key={b.id} value={b.id}>{b.name || b.plate_number} ({b.total_seats} seats)</option>)}
              </select>
            </div>
            <div>
              <label className="label">Branch</label>
              <select className="input" value={form.branch_id || ''} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
                <option value="">None</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Departure</label>
                <input type="datetime-local" className="input" value={form.departure_time || ''} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} required />
              </div>
              <div>
                <label className="label">Arrival (est.)</label>
                <input type="datetime-local" className="input" value={form.arrival_time || ''} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Fare (KES)</label>
              <input type="number" className="input" value={form.fare || ''} onChange={(e) => setForm({ ...form, fare: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Driver</label>
                <input className="input" value={form.driver_name || ''} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Conductor</label>
                <input className="input" value={form.conductor_name || ''} onChange={(e) => setForm({ ...form, conductor_name: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status || 'scheduled'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['scheduled', 'boarding', 'departed', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={close} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
