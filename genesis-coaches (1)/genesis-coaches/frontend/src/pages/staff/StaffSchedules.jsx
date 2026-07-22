import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ExportButtons } from '../../lib/exportData';

const EMPTY = { route_id: '', bus_id: '', departure_time: '', arrival_time: '', fare: '', status: 'scheduled' };

export default function StaffSchedules() {
  const { profile } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    Promise.all([
      apiFetch('/admin/schedules-admin'),
      apiFetch('/admin/routes-admin'),
      apiFetch('/admin/buses'),
    ])
      .then(([schRes, rRes, bRes]) => {
        setSchedules(schRes.data || []);
        setRoutes(rRes.data || []);
        setBuses(bRes.data || []);
      })
      .catch(() => {});
  };

  useEffect(() => { load(); }, [profile?.branch_id]);

  const startCreate = () => {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setForm({
      route_id: s.route_id || '',
      bus_id: s.bus_id || '',
      departure_time: s.departure_time ? s.departure_time.slice(0, 16) : '',
      arrival_time: s.arrival_time ? s.arrival_time.slice(0, 16) : '',
      fare: s.fare || '',
      status: s.status || 'scheduled',
    });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        fare: Number(form.fare),
        branch_id: profile?.branch_id,
      };

      if (editingId) {
        await apiFetch(`/admin/schedules-admin/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Schedule updated!');
      } else {
        await apiFetch('/admin/schedules-admin', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Schedule created!');
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Timetable</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-cream">Manage Schedules</h1>
          <p className="mt-0.5 text-xs text-slate">Trip schedules for your branch.</p>
        </div>
        <div className="flex flex-wrap gap-2"><ExportButtons filename="staff-schedules" title="Staff schedules" rows={schedules} columns={[{ label: 'Route', getValue: (s) => `${s.route?.origin || ''} → ${s.route?.destination || ''}` }, { label: 'Bus', getValue: (s) => s.bus?.name || s.bus?.plate_number || '' }, { key: 'departure_time', label: 'Departure' }, { key: 'arrival_time', label: 'Arrival' }, { key: 'fare', label: 'Fare' }, { key: 'status', label: 'Status' }]} /><button className="btn-primary" onClick={() => { if (showForm) setShowForm(false); else startCreate(); }}>
          {showForm ? 'Cancel' : '+ Add Schedule'}
        </button></div>
      </div>
      <div className="route-line my-6" />

      {showForm && (
        <form onSubmit={save} className="card mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="input-label">Route *</label>
            <select className="input w-full" required value={form.route_id} onChange={(e) => setForm((f) => ({ ...f, route_id: e.target.value }))}>
              <option value="">Select Route</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Bus *</label>
            <select className="input w-full" required value={form.bus_id} onChange={(e) => setForm((f) => ({ ...f, bus_id: e.target.value }))}>
              <option value="">Select Bus</option>
              {buses.map((b) => (
                <option key={b.id} value={b.id}>{b.name || b.plate_number} ({b.plate_number})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Departure Time *</label>
            <input type="datetime-local" className="input w-full" required value={form.departure_time} onChange={(e) => setForm((f) => ({ ...f, departure_time: e.target.value }))} />
          </div>

          <div>
            <label className="input-label">Arrival Time *</label>
            <input type="datetime-local" className="input w-full" required value={form.arrival_time} onChange={(e) => setForm((f) => ({ ...f, arrival_time: e.target.value }))} />
          </div>

          <div>
            <label className="input-label">Fare (KES) *</label>
            <input type="number" step="10" min="0" className="input w-full" required value={form.fare} onChange={(e) => setForm((f) => ({ ...f, fare: e.target.value }))} />
          </div>

          <div>
            <label className="input-label">Status</label>
            <select className="input w-full" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="scheduled">Scheduled</option>
              <option value="boarding">Boarding</option>
              <option value="in_transit">In Transit</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <button disabled={saving} className="btn-primary">{saving ? 'Saving…' : editingId ? 'Update Schedule' : 'Create Schedule'}</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 bg-midnight-3">
            <tr>
              {['Route', 'Bus', 'Departure', 'Arrival', 'Fare', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-cream">{s.route?.origin} → {s.route?.destination}</td>
                <td className="px-4 py-3 text-slate">{s.bus?.name || s.bus?.plate_number || '—'}</td>
                <td className="px-4 py-3 text-slate">{new Date(s.departure_time).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate">{s.arrival_time ? new Date(s.arrival_time).toLocaleString() : '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-amber">KES {Number(s.fare).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-cream capitalize">{s.status}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => startEdit(s)} className="text-xs text-amber hover:underline">Edit</button>
                </td>
              </tr>
            ))}
            {schedules.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate">No schedules found for your branch.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
