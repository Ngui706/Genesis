import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';
import { ExportButtons } from '../../lib/exportData';

const EMPTY = { origin: '', destination: '', distance_km: '', duration_minutes: '' };

export default function StaffRoutes() {
  const [routes, setRoutes] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => apiFetch('/admin/routes-admin').then((r) => setRoutes(r.data || [])).catch(() => {});

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/admin/routes-admin', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Route created!');
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  const field = (label, key, type = 'text') => (
    <div>
      <label className="input-label">{label}</label>
      <input type={type} className="input w-full" value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Network</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-cream">Manage Routes</h1>
        </div>
        <div className="flex flex-wrap gap-2"><ExportButtons filename="staff-routes" title="Staff routes" rows={routes} columns={[{ key: 'origin', label: 'Origin' }, { key: 'destination', label: 'Destination' }, { key: 'distance_km', label: 'Distance (km)' }, { key: 'duration_minutes', label: 'Duration (minutes)' }]} /><button className="btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : '+ Add Route'}</button></div>
      </div>
      <div className="route-line my-6" />

      {showForm && (
        <form onSubmit={save} className="card mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field('Origin *', 'origin')}
          {field('Destination *', 'destination')}
          {field('Distance (km)', 'distance_km', 'number')}
          {field('Duration (minutes)', 'duration_minutes', 'number')}
          <div className="sm:col-span-2">
            <button disabled={saving} className="btn-primary">{saving ? 'Creating…' : 'Create Route'}</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 bg-midnight-3">
            <tr>
              {['Origin', 'Destination', 'Distance', 'Duration'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routes.map((r) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-cream">{r.origin}</td>
                <td className="px-4 py-3 text-cream">{r.destination}</td>
                <td className="px-4 py-3 text-slate">{r.distance_km ? `${r.distance_km} km` : '—'}</td>
                <td className="px-4 py-3 text-slate">{r.duration_minutes ? `${r.duration_minutes} min` : '—'}</td>
              </tr>
            ))}
            {routes.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate">No routes found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
