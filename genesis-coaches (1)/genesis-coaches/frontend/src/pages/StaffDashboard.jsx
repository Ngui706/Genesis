import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/supabase';

export default function StaffDashboard() {
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
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Staff desk</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-cream">Boarding &amp; manifests</h1>
      <div className="route-line my-6"><span className="route-line-marker" style={{ left: '15%' }} /></div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-display text-lg font-semibold text-cream">Scan / verify ticket</h2>
          <p className="mt-1 text-xs text-slate">Paste the QR payload captured by a scanner, or connect a camera scanner that feeds this field.</p>
          <form onSubmit={verify} className="mt-4 space-y-3">
            <textarea className="input h-24 font-mono text-xs" placeholder="Signed QR payload…" value={qrInput} onChange={(e) => setQrInput(e.target.value)} required />
            <button disabled={loading} className="btn-primary w-full">{loading ? 'Verifying…' : 'Verify ticket'}</button>
          </form>

          {result && (
            <div className={`mt-4 rounded-lg border p-4 ${result.valid ? 'border-teal/30 bg-teal/10' : 'border-danger/30 bg-danger/10'}`}>
              <p className={`font-semibold ${result.valid ? 'text-teal-light' : 'text-danger'}`}>
                {result.valid ? '✓ Valid ticket — OK to board' : `✕ ${result.reason}`}
              </p>
              <div className="mt-2 space-y-1 text-sm text-cream">
                <p>{result.booking.booking_reference} · {result.booking.customer.full_name}</p>
                <p className="text-slate">
                  {result.booking.schedule.route.origin} → {result.booking.schedule.route.destination} ·{' '}
                  {new Date(result.booking.schedule.departure_time).toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {result.booking.passengers.map((p, i) => (
                    <span key={i} className="rounded-md bg-midnight-3 px-2 py-1 font-mono text-xs text-amber">
                      {p.passenger_name} · Seat {p.seat.seat_number}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-display text-lg font-semibold text-cream">Passenger manifest</h2>
          <form onSubmit={loadManifest} className="mt-4 flex gap-2">
            <input className="input" placeholder="Schedule ID" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} required />
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
