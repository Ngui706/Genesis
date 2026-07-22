import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ExportButtons, exportPdf } from '../../lib/exportData';

function StatCard({ label, value, icon, sub }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-midnight-2 p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-widest text-slate">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-cream">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate">{sub}</p>}
    </div>
  );
}

export default function StaffHome() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrInput, setQrInput] = useState('');
  const [ticket, setTicket] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scheduleId, setScheduleId] = useState('');
  const [manifest, setManifest] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiFetch('/reports/dashboard-summary')
      .then((r) => setSummary(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.branch_id]);

  const verifyTicket = async (event) => {
    event.preventDefault();
    setScanning(true);
    try {
      const result = await apiFetch('/tickets/verify', { method: 'POST', body: JSON.stringify({ qrPayload: qrInput.trim() }) });
      setTicket(result);
      if (!result.valid) toast.error(result.reason || 'Ticket is not valid');
    } catch (error) { toast.error(error.message); }
    finally { setScanning(false); }
  };

  const loadManifest = async (event) => {
    event.preventDefault();
    try { const result = await apiFetch(`/schedules/${scheduleId}/manifest`); setManifest(result.manifest || []); }
    catch (error) { toast.error(error.message); }
  };

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Staff Portal</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-cream">
        Welcome, {profile?.full_name?.split(' ')[0]}
      </h1>
      <p className="mt-1 text-sm text-slate">
        Branch: <span className="text-amber">{profile?.branch?.name || 'Unassigned'}</span>
      </p>
      <div className="route-line my-6" />

      {loading ? (
        <p className="text-slate">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Bookings" value={summary?.totalBookings?.toLocaleString() ?? '—'} icon="🎟️" sub="Confirmed bookings" />
          <StatCard label="Branch Customers" value={summary?.totalCustomers?.toLocaleString() ?? '—'} icon="👥" sub="Unique customers" />
          <StatCard label="Active Buses" value={summary?.activeBuses?.toLocaleString() ?? '—'} icon="🚌" sub="In your fleet" />
          <StatCard
            label="Revenue"
            value={summary?.totalRevenue != null ? `KES ${Number(summary.totalRevenue).toLocaleString()}` : '—'}
            icon="💰"
            sub="Branch total"
          />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-display text-lg font-semibold text-cream">Scan / verify ticket</h2>
          <p className="mt-1 text-xs text-slate">Scan or paste the QR payload to show readable passenger and trip details.</p>
          <form onSubmit={verifyTicket} className="mt-4 space-y-3">
            <textarea className="input h-24 font-mono text-xs" placeholder="QR payload…" value={qrInput} onChange={(e) => setQrInput(e.target.value)} required />
            <button disabled={scanning} className="btn-primary w-full">{scanning ? 'Verifying…' : 'Verify ticket'}</button>
          </form>
          {ticket?.booking && (
            <div className={`mt-4 rounded-lg border p-4 ${ticket.valid ? 'border-teal/30 bg-teal/10' : 'border-danger/30 bg-danger/10'}`}>
              <p className="font-semibold text-cream">{ticket.valid ? '✓ Valid ticket — OK to board' : `✕ ${ticket.reason}`}</p>
              <div className="mt-2 space-y-1 text-sm text-cream">
                <p>{ticket.booking.booking_reference} · {ticket.booking.customer?.full_name || 'Passenger'}</p>
                <p className="text-slate">{ticket.booking.schedule.route.origin} → {ticket.booking.schedule.route.destination} · {new Date(ticket.booking.schedule.departure_time).toLocaleString()}</p>
                {ticket.booking.passengers.map((passenger) => <p key={passenger.passenger_name + passenger.seat?.seat_number}>{passenger.passenger_name} · Seat {passenger.seat?.seat_number || '—'}</p>)}
              </div>
              <button type="button" className="btn-secondary mt-3 !px-3 !py-2 text-xs" onClick={() => exportPdf('verified-ticket', 'Verified ticket details', [ticket.booking], [{ key: 'booking_reference', label: 'Booking' }, { label: 'Passenger', getValue: (b) => b.customer?.full_name }, { label: 'Route', getValue: (b) => `${b.schedule.route.origin} → ${b.schedule.route.destination}` }, { label: 'Departure', getValue: (b) => new Date(b.schedule.departure_time).toLocaleString() }, { label: 'Passengers', getValue: (b) => b.passengers.map((p) => `${p.passenger_name} (Seat ${p.seat?.seat_number || '—'})`).join(', ') }])}>Download details PDF</button>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-display text-lg font-semibold text-cream">Passenger manifest</h2>
          <form onSubmit={loadManifest} className="mt-4 flex gap-2"><input className="input" placeholder="Schedule ID" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} required /><button className="btn-secondary shrink-0">Load</button></form>
          {manifest && <div className="mt-4"><ExportButtons filename="passenger-manifest" title="Passenger manifest" rows={manifest} columns={[{ key: 'bookingReference', label: 'Booking' }, { key: 'passengerName', label: 'Passenger' }, { key: 'passengerPhone', label: 'Phone' }, { key: 'seatNumber', label: 'Seat' }]} /><div className="mt-4 max-h-64 space-y-2 overflow-y-auto">{manifest.map((item, index) => <div key={index} className="flex items-center justify-between rounded-lg bg-midnight-3 px-3 py-2 text-sm"><span className="text-cream">{item.passengerName}</span><span className="font-mono text-xs text-amber">Seat {item.seatNumber}</span></div>)}</div></div>}
        </div>
      </div>
    </div>
  );
}
