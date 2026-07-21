import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';

export default function ManageBranchUpdates() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch('/admin/branch-updates')
      .then((r) => setUpdates(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    try {
      await apiFetch(`/admin/branch-updates/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      toast.success(`Update ${status}!`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const del = async (id) => {
    if (!confirm('Delete this update permanently?')) return;
    try {
      await apiFetch(`/admin/branch-updates/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const pending = updates.filter((u) => u.status === 'pending');
  const reviewed = updates.filter((u) => u.status !== 'pending');

  return (
    <div>
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Content Moderation</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-cream">Branch News & Approvals</h1>
        <p className="mt-0.5 text-xs text-slate">Review and approve news updates submitted by branch staff before they feature on the homepage.</p>
      </div>
      <div className="route-line my-6" />

      {/* Pending Reviews Section */}
      <div className="mb-10">
        <h2 className="mb-4 font-display text-lg font-semibold text-cream flex items-center gap-2">
          Pending Approval
          {pending.length > 0 && (
            <span className="rounded-full bg-amber/20 px-2.5 py-0.5 text-xs font-mono text-amber">{pending.length}</span>
          )}
        </h2>

        {pending.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-midnight-2 p-6 text-center text-sm text-slate">
            No pending submissions right now.
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((item) => (
              <div key={item.id} className="rounded-xl border border-amber/30 bg-midnight-2 p-5 shadow-lg shadow-black/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-md bg-amber/10 px-2 py-0.5 font-mono text-xs text-amber">
                      {item.branch?.name || 'Unknown Branch'}
                    </span>
                    <h3 className="mt-2 font-display text-lg font-semibold text-cream">{item.title}</h3>
                    <p className="text-xs text-slate">
                      By {item.author?.full_name || 'Staff'} · {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setStatus(item.id, 'approved')} className="btn-primary py-1.5 px-3 text-xs">
                      ✓ Approve
                    </button>
                    <button onClick={() => setStatus(item.id, 'rejected')} className="btn-secondary py-1.5 px-3 text-xs text-danger hover:bg-danger/10">
                      ✕ Reject
                    </button>
                  </div>
                </div>

                {item.image_url && (
                  <img src={item.image_url} alt="" className="mt-3 h-44 w-full rounded-lg object-cover" />
                )}
                <p className="mt-3 text-sm leading-relaxed text-slate">{item.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Previously Reviewed Section */}
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-cream">Review History</h2>
        <div className="space-y-3">
          {reviewed.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-midnight-2 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-cream">{item.title}</span>
                  <span className="text-xs text-slate">({item.branch?.name})</span>
                </div>
                <p className="text-xs text-slate mt-0.5">
                  Submitted {new Date(item.created_at).toLocaleDateString()}
                  {item.reviewer && ` · Reviewed by ${item.reviewer.full_name}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.status === 'approved' ? 'bg-teal/10 text-teal-light' : 'bg-danger/10 text-danger'}`}>
                  {item.status}
                </span>
                <button onClick={() => del(item.id)} className="text-xs text-slate-dim hover:text-danger">Delete</button>
              </div>
            </div>
          ))}
          {reviewed.length === 0 && <p className="text-sm text-slate">No history yet.</p>}
        </div>
      </div>
    </div>
  );
}
