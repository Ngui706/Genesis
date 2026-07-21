import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPolicy, setNewPolicy] = useState({ name: '', hours_before_departure: '', refund_percentage: '' });

  const load = () => {
    setLoading(true);
    Promise.all([apiFetch('/admin/settings'), apiFetch('/admin/policies')])
      .then(([s, p]) => {
        const map = {};
        (s.data || []).forEach((row) => { map[row.key] = row.value; });
        setSettings(map);
        setPolicies(p.data || []);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const saveSetting = async (key, value) => {
    try {
      await apiFetch(`/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) });
      toast.success('Saved');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const addPolicy = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/admin/policies', {
        method: 'POST',
        body: JSON.stringify({
          name: newPolicy.name,
          hours_before_departure: Number(newPolicy.hours_before_departure),
          refund_percentage: Number(newPolicy.refund_percentage),
          is_active: true,
        }),
      });
      toast.success('Policy added');
      setNewPolicy({ name: '', hours_before_departure: '', refund_percentage: '' });
      load();
    } catch (err) { toast.error(err.message); }
  };

  const removePolicy = async (id) => {
    try {
      await apiFetch(`/admin/policies/${id}`, { method: 'DELETE' });
      toast.success('Removed');
      load();
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <p className="text-slate">Loading settings…</p>;

  const branding = settings.branding || {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">System settings</h1>
        <p className="mt-1 text-sm text-slate">Fares defaults, booking windows, cancellation policy and company branding.</p>
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold text-cream">Booking window</h2>
        <p className="mt-1 text-xs text-slate">How many days in advance customers can search & book trips.</p>
        <div className="mt-3 flex items-center gap-3">
          <input
            type="number"
            className="input max-w-[140px]"
            defaultValue={settings.booking_window_days ?? 30}
            onBlur={(e) => saveSetting('booking_window_days', Number(e.target.value))}
          />
          <span className="text-sm text-slate">days</span>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold text-cream">Company branding</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Company name</label>
            <input className="input" defaultValue={branding.company_name} onBlur={(e) => saveSetting('branding', { ...branding, company_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Tagline</label>
            <input className="input" defaultValue={branding.tagline} onBlur={(e) => saveSetting('branding', { ...branding, tagline: e.target.value })} />
          </div>
          <div>
            <label className="label">Primary color</label>
            <input type="color" className="h-11 w-full rounded-lg border border-white/15 bg-midnight-3" defaultValue={branding.primary_color || '#F2A93B'} onBlur={(e) => saveSetting('branding', { ...branding, primary_color: e.target.value })} />
          </div>
          <div>
            <label className="label">Dark background color</label>
            <input type="color" className="h-11 w-full rounded-lg border border-white/15 bg-midnight-3" defaultValue={branding.dark_color || '#0B0F1A'} onBlur={(e) => saveSetting('branding', { ...branding, dark_color: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold text-cream">Cancellation & refund policy tiers</h2>
        <p className="mt-1 text-xs text-slate">Refund percentage applied based on hours remaining before departure at time of cancellation.</p>

        <div className="mt-4 space-y-2">
          {policies.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg bg-midnight-3 px-4 py-2.5 text-sm">
              <span className="text-cream">{p.name}</span>
              <span className="text-slate">≥ {p.hours_before_departure}h before → {p.refund_percentage}% refund</span>
              <button onClick={() => removePolicy(p.id)} className="text-xs font-medium text-danger hover:underline">Remove</button>
            </div>
          ))}
        </div>

        <form onSubmit={addPolicy} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input className="input" placeholder="Name" value={newPolicy.name} onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })} required />
          <input type="number" className="input" placeholder="Hours before departure" value={newPolicy.hours_before_departure} onChange={(e) => setNewPolicy({ ...newPolicy, hours_before_departure: e.target.value })} required />
          <input type="number" className="input" placeholder="Refund %" value={newPolicy.refund_percentage} onChange={(e) => setNewPolicy({ ...newPolicy, refund_percentage: e.target.value })} required />
          <button className="btn-primary">Add tier</button>
        </form>
      </div>
    </div>
  );
}
