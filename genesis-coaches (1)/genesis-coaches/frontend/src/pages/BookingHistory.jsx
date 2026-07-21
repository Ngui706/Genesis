import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch, apiDownload } from '../lib/supabase';

const STATUS_STYLES = {
  confirmed: 'bg-teal/15 text-teal-light',
  pending: 'bg-amber/15 text-amber',
  cancelled: 'bg-danger/15 text-danger',
  refunded: 'bg-slate/15 text-slate',
  completed: 'bg-white/10 text-cream',
};

export default function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => apiFetch('/bookings/me').then((d) => setBookings(d.bookings || [])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking? Refund eligibility depends on our cancellation policy.')) return;
    try {
      const res = await apiFetch(`/bookings/${id}/cancel`, { method: 'POST' });
      toast.success(`Cancelled. Refund: KES ${res.refundAmount.toFixed(2)} (${res.refundPercentage}%)`);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not cancel booking');
    }
  };

  const handleDownload = async (b) => {
    try {
      await apiDownload(`/bookings/${b.id}/ticket.pdf`, `genesis-coaches-${b.booking_reference}.pdf`);
    } catch (err) {
      toast.error(err.message || 'Could not download ticket');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Your trips</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-cream">Booking history</h1>
      <div className="route-line my-6"><span className="route-line-marker" style={{ left: '15%' }} /></div>

      {loading && <p className="text-slate">Loading…</p>}
      {!loading && bookings.length === 0 && <p className="text-slate">No bookings yet. Time to plan a trip!</p>}

      <div className="space-y-4">
        {bookings.map((b) => (
          <div key={b.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold text-cream">
                  {b.schedule.route.origin} → {b.schedule.route.destination}
                </p>
                <p className="text-sm text-slate">{new Date(b.schedule.departure_time).toLocaleString()}</p>
                <p className="mt-1 font-mono text-xs text-slate">{b.booking_reference}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[b.status] || 'bg-white/10 text-cream'}`}>
                {b.status}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {b.passengers.map((p) => (
                <span key={p.id} className="rounded-md bg-midnight-3 px-2.5 py-1 font-mono text-xs text-amber">
                  {p.passenger_name} · Seat {p.seat?.seat_number}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-cream">KES {Number(b.total_amount).toLocaleString()}</p>
              <div className="flex flex-wrap gap-2">
                <Link to={`/booking-confirmation/${b.id}`} className="btn-secondary !px-3 !py-1.5 text-xs">View e-ticket</Link>
                <button onClick={() => handleDownload(b)} className="btn-secondary !px-3 !py-1.5 text-xs">Download PDF</button>
                {b.status === 'confirmed' && (
                  <button onClick={() => handleCancel(b.id)} className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
