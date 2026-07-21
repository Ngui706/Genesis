import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';

export default function StaffBoarding() {
  const [qrInput, setQrInput] = useState('');
  const [result, setResult] = useState(null);
  const [scheduleId, setScheduleId] = useState('');
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await apiFetch('/tickets/verify', { method: 'POST', body: JSON.stringify({ qrPayload: qrInput.trim() }) });
      setResult(res);
      if (!res.valid) toast.error(res.reason || 'Ticket not valid');
    } catch (err) {
      toast.error(err.message || 'Could not verify ticket');
    } finally {
      setLoading(false);
    }
  };

  const loadManifest = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/schedules/${scheduleId}/manifest`);
      setManifest(res.manifest);
    } catch (err) {
      toast.error(err.message || 'Could not load manifest');
    }
  };

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Operations</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-cream">Boarding & Manifests</h1>
      <div className="route-line my-6" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-display text-lg font-semibold text-cream">Scan / Verify Ticket</h2>
          <p className="mt-1 text-xs text-slate">Paste the QR payload captured by a scanner.</p>
          <form onSubmit={verify} className="mt-4 space-y-3">
            <textarea className="input h-24 w-full font-mono text-xs" placeholder="Signed QR payload…" value={qrInput} onChange={(e) => setQrInput(e.target.value)} required />
            <button disabled={loading} className="btn-primary w-full">{loading ? 'Verifying…' : 'Verify Ticket'}</button>
          </form>
          {result && (
            <div className={`mt-4 rounded-lg border p-4 ${result.valid ? 'border-teal/30 bg-teal/10' : 'border-danger/30 bg-danger/10'}`}>
              <p className={`font-semibold ${result.valid ? 'text-teal-light' : 'text-danger'}`}>
                {result.valid ? '✓ Valid ticket — OK to board' : `✕ ${result.reason}`}
              </p>
              {result.booking && (
                <div className="mt-2 space-y-1 text-sm text-cream">
                  <p>{result.booking.booking_reference} · {result.booking.customer.full_name}</p>
                  <p className="text-slate">
                    {result.booking.schedule.route.origin} → {result.booking.schedule.route.destination} ·{' '}
                    {new Date(result.booking.schedule.departure_time).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-display text-lg font-semibold text-cream">Passenger Manifest</h2>
          <form onSubmit={loadManifest} className="mt-4 flex gap-2">
            <input className="input flex-1" placeholder="Schedule ID" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} required />
            <button className="btn-secondary shrink-0">Load</button>
          </form>
          {manifest && (
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {manifest.length === 0 && <p className="text-sm text-slate">No confirmed passengers yet.</p>}
              {manifest.map((m, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-midnight-3 px-3 py-2 text-sm">
                  <span className="text-cream">{m.passengerName}</span>
                  <span className="font-mono text-xs text-amber">Seat {m.seatNumber}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
