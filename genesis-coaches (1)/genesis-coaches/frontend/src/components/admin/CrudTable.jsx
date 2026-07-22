import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';
import { ExportButtons } from '../../lib/exportData';

/**
 * Generic list + create/edit/delete UI for simple admin-owned tables.
 * `fields` describes the form: [{ key, label, type: 'text'|'number'|'select'|'checkbox'|'textarea'|'datetime-local', options? }]
 * `columns` describes the table: [{ key, label, render?(row) }]
 */
export default function CrudTable({ title, description, listPath, createPath, updatePath, deletePath, fields, columns, canCreate = true, canEdit = true, canDelete = true, deleteConfirmMessage, renderFormHeader }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...row} = edit
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch(listPath)
      .then((d) => setRows(d.data || []))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [listPath]);

  const openCreate = () => { setForm({}); setEditing({}); };
  const openEdit = (row) => { setForm(row); setEditing(row); };
  const close = () => setEditing(null);

  const handleChange = (key, type) => (e) => {
    const value = type === 'checkbox' ? e.target.checked : type === 'number' ? Number(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isNew = !editing.id;
      const path = isNew ? createPath : `${updatePath}/${editing.id}`;
      await apiFetch(path, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(form) });
      toast.success(isNew ? 'Created' : 'Updated');
      close();
      load();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const msg = deleteConfirmMessage
      ? (typeof deleteConfirmMessage === 'function' ? deleteConfirmMessage(row) : deleteConfirmMessage)
      : `Delete this record? This can't be undone.`;
    if (!confirm(msg)) return;
    try {
      await apiFetch(`${deletePath}/${row.id}`, { method: 'DELETE' });
      toast.success('Deleted successfully');
      load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate">{description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButtons filename={title.toLowerCase().replace(/[^a-z0-9]+/g, '-')} title={title} rows={rows} columns={columns} />
          {canCreate && <button onClick={openCreate} className="btn-primary !px-4 !py-2 text-sm">+ Add new</button>}
        </div>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate">
              {columns.map((c) => <th key={c.key} className="px-4 py-3 font-medium">{c.label}</th>)}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={columns.length + 1} className="px-4 py-6 text-center text-slate">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={columns.length + 1} className="px-4 py-6 text-center text-slate">No records yet.</td></tr>}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                {columns.map((c) => <td key={c.key} className="px-4 py-3 text-cream">{c.render ? c.render(row) : String(row[c.key] ?? '—')}</td>)}
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {canEdit && <button onClick={() => openEdit(row)} className="rounded px-2 py-1 text-xs font-medium text-amber hover:bg-amber/10 transition">Edit</button>}
                    {canDelete && <button onClick={() => handleDelete(row)} className="rounded px-2 py-1 text-xs font-medium text-danger hover:bg-danger/10 transition">Delete</button>}
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
            <h2 className="font-display text-lg font-semibold text-cream">{editing.id ? 'Edit record' : 'New record'}</h2>
            {renderFormHeader && renderFormHeader({ form, setForm, isEdit: !!editing.id })}
            {fields.map((f) => (
              <div key={f.key}>
                {f.type !== 'checkbox' && <label className="label">{f.label}</label>}
                {f.type === 'select' ? (
                  <select className="input" value={form[f.key] ?? ''} onChange={handleChange(f.key, f.type)} required={f.required}>
                    <option value="" disabled>Select…</option>
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea className="input h-20" value={form[f.key] ?? ''} onChange={handleChange(f.key, f.type)} required={f.required} />
                ) : f.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-sm text-cream">
                    <input type="checkbox" checked={!!form[f.key]} onChange={handleChange(f.key, f.type)} className="h-4 w-4 rounded border-white/20 bg-midnight-3 accent-amber" />
                    {f.label}
                  </label>
                ) : (
                  <input
                    type={f.type || 'text'}
                    className="input"
                    value={form[f.key] ?? ''}
                    onChange={handleChange(f.key, f.type)}
                    required={f.required}
                    step={f.type === 'number' ? 'any' : undefined}
                  />
                )}
              </div>
            ))}
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
