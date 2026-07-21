import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/admin/audit-logs').then((d) => setLogs(d.data || [])).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cream">Audit logs</h1>
      <p className="mt-1 text-sm text-slate">Every admin/staff action, most recent first (last 500 entries).</p>
      <div className="card mt-6 overflow-x-auto !p-0">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate">Loading…</td></tr>}
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-xs text-slate">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-cream">{l.actor?.full_name || 'System'} <span className="text-xs text-slate">({l.actor_role})</span></td>
                <td className="px-4 py-3 font-mono text-xs text-amber">{l.action}</td>
                <td className="px-4 py-3 text-xs text-slate">{l.entity_type} {l.entity_id?.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
