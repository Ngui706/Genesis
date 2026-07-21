import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';

const emptyForm = { plate_number: '', name: '', bus_class: 'standard', branch_id: '', rows: 12, columns: 4, amenities: '', is_active: true };

export default function ManageBuses() {
  const [buses, setBuses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([apiFetch('/admin/buses'), apiFetch('/admin/branches')])
      .then(([b, br]) => { setBuses(b.data || []); setBranches(br.data || []); })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setEditing({}); };
  const openEdit = (bus) => {
    setForm({
      plate_number: bus.plate_number, name: bus.name || '', bus_class: bus.bus_class,
      branch_id: bus.branch_id || '', rows: bus.seat_layout?.rows || 12, columns: bus.seat_layout?.columns || 4,
      amenities: (bus.amenities || []).join(', '), is_active: bus.is_active,
    });
    setEditing(bus);
  };
  const close = () => setEditing(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        plate_number: form.plate_number,
        name: form.name,
        bus_class: form.bus_class,
        branch_id: form.branch_id || null,
        amenities: form.amenities.split(',').map((a) => a.trim()).filter(Boolean),
        is_active: form.is_active,
        seat_layout: { rows: Number(form.rows), columns: Number(form.columns) },
      };
      const isNew = !editing.id;
      await apiFetch(isNew ? '/admin/buses' : `/admin/buses/${editing.id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(isNew ? payload : { name: payload.name, bus_class: payload.bus_class, branch_id: payload.branch_id, amenities: payload.amenities, is_active: payload.is_active }),
      });
      toast.success(isNew ? 'Bus added' : 'Bus updated');
      close();
      load();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bus) => {
    if (!confirm('Remove this bus? Existing schedules referencing it will be affected.')) return;
    try {
      await apiFetch(`/admin/buses/${bus.id}`, { method: 'DELETE' });
      toast.success('Bus removed');
      load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">Buses</h1>
          <p className="mt-1 text-sm text-slate">Fleet management — seat layout is fixed at creation and drives the seat map customers see.</p>
        </div>
        <button onClick={openCreate} className="btn-primary !px-4 !py-2 text-sm">+ Add bus</button>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate">
              <th className="px-4 py-3 font-medium">Plate</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Seats</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate">Loading…</td></tr>}
            {!loading && buses.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate">No buses yet.</td></tr>}
            {buses.map((bus) => (
              <tr key={bus.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-cream">{bus.plate_number}</td>
                <td className="px-4 py-3 text-cream">{bus.name || '—'}</td>
                <td className="px-4 py-3 text-cream capitalize">{bus.bus_class}</td>
                <td className="px-4 py-3 text-cream">{bus.total_seats}</td>
                <td className="px-4 py-3 text-cream">{bus.is_active ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(bus)} className="text-xs font-medium text-amber hover:underline">Edit</button>
                    <button onClick={() => handleDelete(bus)} className="text-xs font-medium text-danger hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={close}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSave} className="card max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto">
            <h2 className="font-display text-lg font-semibold text-cream">{editing.id ? 'Edit bus' : 'New bus'}</h2>
            <div>
              <label className="label">Plate number</label>
              <input className="input" value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} required disabled={!!editing.id} />
            </div>
            <div>
              <label className="label">Display name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Genesis VIP 07" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Class</label>
                <select className="input" value={form.bus_class} onChange={(e) => setForm({ ...form, bus_class: e.target.value })}>
                  <option value="standard">Standard</option>
                  <option value="executive">Executive</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              <div>
                <label className="label">Branch</label>
                <select className="input" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            {!editing.id && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Seat rows</label>
                  <input type="number" min={1} className="input" value={form.rows} onChange={(e) => setForm({ ...form, rows: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Seats per row (2+2 = 4)</label>
                  <input type="number" min={1} className="input" value={form.columns} onChange={(e) => setForm({ ...form, columns: e.target.value })} required />
                </div>
              </div>
            )}
            <div>
              <label className="label">Amenities (comma-separated)</label>
              <input className="input" value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} placeholder="WiFi, USB charging, AC" />
            </div>
            <label className="flex items-center gap-2 text-sm text-cream">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded accent-amber" />
              Active
            </label>
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
