import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch, apiDownload } from '../lib/supabase';

export default function BookingConfirmation() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    apiFetch(`/bookings/${bookingId}`)
      .then((data) => {
        setBooking(data.booking);
        setQrDataUrl(data.qrDataUrl);
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) return <div className="px-6 py-24 text-center text-slate">Loading your ticket…</div>;
  if (!booking) return <div className="px-6 py-24 text-center text-danger">Booking not found.</div>;

  const downloadTicket = async () => {
    setDownloading(true);
    try {
      await apiDownload(`/bookings/${booking.id}/ticket.pdf`, `genesis-coaches-${booking.booking_reference}.pdf`);
    } catch (err) {
      toast.error(err.message || 'Could not download ticket');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-teal/15 px-4 py-1.5 text-sm font-medium text-teal-light">
          ✓ Booking confirmed
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold text-cream">You're all set!</h1>
        <p className="mt-1 text-slate">Reference <span className="font-mono text-amber">{booking.booking_reference}</span></p>
      </div>

      <div className="card mt-8 overflow-hidden">
        <div className="flex flex-col items-center gap-6 border-b border-dashed border-white/15 pb-6 sm:flex-row sm:justify-between">
          <div>
            <p className="font-display text-xl font-semibold text-cream">
              {booking.schedule.route.origin} → {booking.schedule.route.destination}
            </p>
            <p className="mt-1 text-sm text-slate">{new Date(booking.schedule.departure_time).toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate">{booking.schedule.bus.name || booking.schedule.bus.bus_class} · {booking.schedule.bus.plate_number}</p>
          </div>
          {qrDataUrl && (
            <div className="flex flex-col items-center gap-1">
              <img src={qrDataUrl} alt="Ticket QR code" className="h-32 w-32 rounded-lg border border-white/10 bg-white p-2" />
              <span className="text-[10px] uppercase tracking-wide text-slate">Scan to verify</span>
            </div>
          )}
        </div>

        <div className="pt-6">
          <p className="mb-3 text-xs uppercase tracking-wide text-slate">Passengers &amp; seats</p>
          <div className="space-y-2">
            {booking.passengers.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-midnight-3 px-4 py-2.5 text-sm">
                <span className="text-cream">{p.passenger_name}</span>
                <span className="font-mono text-amber">Seat {p.seat.seat_number}</span>
              </div>
            ))}
          </div>

          <div className="route-line my-6" />

          <div className="flex justify-between text-sm">
            <span className="text-slate">Total paid</span>
            <span className="font-mono text-lg font-semibold text-cream">KES {Number(booking.total_amount).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button onClick={downloadTicket} disabled={downloading} className="btn-primary flex-1">
          {downloading ? 'Preparing PDF…' : 'Download e-ticket (PDF)'}
        </button>
        <Link to="/bookings" className="btn-secondary flex-1 text-center">View booking history</Link>
      </div>
      <p className="mt-4 text-center text-xs text-slate">A confirmation email with your ticket has also been sent to your inbox.</p>
    </div>
  );
}
