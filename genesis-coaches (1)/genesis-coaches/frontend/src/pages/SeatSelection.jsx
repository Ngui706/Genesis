import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SeatMap from '../components/SeatMap';
import { API_URL, apiFetch, supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const LOCK_SECONDS = 300;

function getSessionToken() {
  let token = sessionStorage.getItem('gc_session_token');
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem('gc_session_token', token);
  }
  return token;
}

export default function SeatSelection() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, profile } = useAuth();
  const sessionToken = useMemo(getSessionToken, []);

  const [schedule, setSchedule] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]); // [{id, seat_number, passengerName, phone}]
  const [promoCode, setPromoCode] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [pendingBooking, setPendingBooking] = useState(null);
  const [stkStatus, setStkStatus] = useState('waiting'); // 'waiting', 'success', 'failed'
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (profile?.phone) {
      setMpesaPhone(profile.phone);
    }
  }, [profile]);

  const loadSchedule = async () => {
    const res = await fetch(`${API_URL}/schedules/${scheduleId}`);
    const data = await res.json();
    setSchedule(data.schedule);
    setSeats(data.seats || []);
  };

  useEffect(() => {
    loadSchedule();

    // Live updates: whenever any seat_lock or booking_passenger row changes,
    // re-fetch the schedule's seat map so every viewer sees the same state.
    const channel = supabase
      .channel(`schedule-${scheduleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seat_locks' }, loadSchedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_passengers' }, loadSchedule)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      selectedRefRelease();
      clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId]);

  const selectedRefRelease = () => {
    const held = JSON.parse(sessionStorage.getItem(`gc_locks_${scheduleId}`) || '[]');
    held.forEach((seatId) => {
      fetch(`${API_URL}/seats/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, seatId, sessionToken }),
        keepalive: true,
      }).catch(() => {});
    });
  };

  const persistHeldSeats = (ids) => sessionStorage.setItem(`gc_locks_${scheduleId}`, JSON.stringify(ids));

  const startCountdown = () => {
    clearInterval(timerRef.current);
    setSecondsLeft(LOCK_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          toast.error('Your seat hold expired. Please reselect.');
          setSelected([]);
          persistHeldSeats([]);
          loadSchedule();
          return null;
        }
        return s - 1;
      });
    }, 1000);
  };

  const toggleSeat = async (seat) => {
    const isSelected = selected.some((s) => s.id === seat.id);
    if (isSelected) {
      setSelected((prev) => prev.filter((s) => s.id !== seat.id));
      persistHeldSeats(selected.filter((s) => s.id !== seat.id).map((s) => s.id));
      await fetch(`${API_URL}/seats/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, seatId: seat.id, sessionToken }),
      });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/seats/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, seatId: seat.id, sessionToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.locked) {
        toast.error(data.message || 'That seat was just taken.');
        loadSchedule();
        return;
      }
      const next = [...selected, { id: seat.id, seat_number: seat.seat_number, passengerName: '', phone: '' }];
      setSelected(next);
      persistHeldSeats(next.map((s) => s.id));
      if (!timerRef.current) startCountdown();
    } catch {
      toast.error('Could not reach the server. Try again.');
    }
  };

  const updatePassenger = (seatId, field, value) => {
    setSelected((prev) => prev.map((s) => (s.id === seatId ? { ...s, [field]: value } : s)));
  };

  const totalFare = schedule ? selected.length * Number(schedule.fare) : 0;

  const pollPaymentStatus = (bookingId) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/bookings/${bookingId}/payment-status`);
        if (res.paymentStatus === 'paid' && res.status === 'confirmed') {
          clearInterval(pollRef.current);
          setStkStatus('success');
          persistHeldSeats([]);
          toast.success('M-Pesa payment confirmed!');
          setTimeout(() => {
            navigate(`/booking-confirmation/${bookingId}`);
          }, 1500);
        } else if (res.status === 'cancelled' || res.paymentStatus === 'failed') {
          clearInterval(pollRef.current);
          setStkStatus('failed');
          toast.error('M-Pesa payment failed or cancelled');
          setSubmitting(false);
          loadSchedule();
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
      }
    }, 3000);
  };

  const handleBook = async () => {
    if (!isAuthenticated) {
      toast('Please log in to complete your booking', { icon: '🔒' });
      navigate('/login', { state: { from: { pathname: `/select-seats/${scheduleId}` } } });
      return;
    }
    if (selected.some((s) => !s.passengerName.trim())) {
      toast.error('Add a passenger name for every selected seat');
      return;
    }
    if (!mpesaPhone.trim()) {
      toast.error('Enter your M-Pesa phone number to pay');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        scheduleId,
        sessionToken,
        promoCode: promoCode || undefined,
        phone: mpesaPhone,
        seats: selected.map((s) => ({ seatId: s.id, passengerName: s.passengerName, phone: s.phone })),
      };
      const res = await apiFetch('/bookings', { method: 'POST', body: JSON.stringify(payload) });
      setPendingBooking(res.booking);
      setStkStatus('waiting');
      
      toast.success(res.customerMessage || 'STK Push sent to your phone.');
      clearInterval(timerRef.current);
      pollPaymentStatus(res.booking.id);
    } catch (err) {
      toast.error(err.message || 'Booking failed');
      loadSchedule();
      setSubmitting(false);
    }
  };

  if (!schedule) return <div className="px-6 py-24 text-center text-slate">Loading trip…</div>;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-16 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Choose your seat</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-cream">
          {schedule.route.origin} → {schedule.route.destination}
        </h1>
        <p className="text-sm text-slate">
          {new Date(schedule.departure_time).toLocaleString()} · {schedule.bus.name || schedule.bus.bus_class} · {schedule.bus.plate_number}
        </p>
        {secondsLeft !== null && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber/10 px-3 py-1.5 text-xs font-medium text-amber">
            Hold expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
          </p>
        )}
        <div className="card mt-6">
          <SeatMap seats={seats} selectedIds={selected.map((s) => s.id)} onToggle={toggleSeat} />
        </div>
      </div>

      <div className="card h-fit lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold text-cream">Passenger details</h2>
        <div className="route-line my-4" />
        {selected.length === 0 && <p className="text-sm text-slate">Select at least one seat to continue.</p>}
        <div className="space-y-4">
          {selected.map((s) => (
            <div key={s.id} className="rounded-lg border border-white/10 bg-midnight-3 p-3">
              <p className="mb-2 font-mono text-xs text-amber">Seat {s.seat_number}</p>
              <input
                placeholder="Passenger full name"
                className="input mb-2"
                value={s.passengerName}
                onChange={(e) => updatePassenger(s.id, 'passengerName', e.target.value)}
              />
              <input
                placeholder="Phone (optional)"
                className="input"
                value={s.phone}
                onChange={(e) => updatePassenger(s.id, 'phone', e.target.value)}
              />
            </div>
          ))}
        </div>

        {selected.length > 0 && (
          <>
            <div className="mt-4">
              <label className="label">Promo code (optional)</label>
              <input className="input" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME10" />
            </div>
            
            <div className="mt-4">
              <label className="label">M-Pesa Mobile Number</label>
              <input
                type="tel"
                className="input font-mono"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="e.g. 0712345678"
                required
              />
              <p className="mt-1.5 text-[11px] text-slate">Enter the Safaricom number to receive the STK push payment request.</p>
            </div>

            <div className="route-line my-4" />
            <div className="flex items-center justify-between text-sm text-slate">
              <span>{selected.length} × KES {Number(schedule.fare).toLocaleString()}</span>
              <span className="font-mono text-lg font-semibold text-cream">KES {totalFare.toLocaleString()}</span>
            </div>
            <button onClick={handleBook} disabled={submitting} className="btn-primary mt-4 w-full">
              {submitting ? 'Confirming…' : 'Confirm & pay'}
            </button>
            {!isAuthenticated && <p className="mt-2 text-center text-xs text-slate">You'll be asked to log in to finish booking.</p>}
          </>
        )}
      </div>

      {pendingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fade-in">
          <div className="card max-w-md w-full space-y-6 text-center border-amber/20 bg-midnight-2 p-8 shadow-2xl relative">
            
            {/* Header Badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/25">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                M-Pesa Payment Active
              </span>
            </div>

            {/* Title / Description */}
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-cream">Approve Ticket Payment</h3>
              <p className="text-sm text-slate">
                We've sent an M-Pesa STK Push requesting <span className="font-mono font-semibold text-amber">KES {totalFare.toLocaleString()}</span> to phone number <span className="font-mono font-semibold text-cream">{mpesaPhone}</span>.
              </p>
              <p className="text-xs text-slate/60">
                Please enter your M-Pesa PIN on your phone to complete this booking.
              </p>
            </div>

            {/* State indicators */}
            <div className="flex flex-col items-center justify-center space-y-4 py-4">
              {stkStatus === 'waiting' && (
                <>
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber border-t-transparent"></div>
                  <span className="text-xs font-mono tracking-wider text-amber animate-pulse">WAITING FOR PIN ENTRY...</span>
                </>
              )}
              {stkStatus === 'success' && (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal/20 text-teal-light text-2xl font-bold">✓</div>
                  <span className="text-xs font-mono tracking-wider text-teal-light font-bold">PAYMENT CONFIRMED! REDIRECTING...</span>
                </>
              )}
              {stkStatus === 'failed' && (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/20 text-danger text-2xl font-bold">✗</div>
                  <span className="text-xs font-mono tracking-wider text-danger font-bold">TRANSACTION FAILED</span>
                </>
              )}
            </div>

            {/* Dev Helper simulation tools */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left space-y-3">
              <span className="block text-[11px] font-semibold text-amber font-mono uppercase tracking-wider">🛠️ LOCAL TESTING & DEV TOOLS</span>
              <p className="text-[11px] text-slate leading-relaxed">
                If the STK push was not received (due to local environment limits or sandboxed keys), use the action below to simulate a successful payment notification instantly.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await apiFetch(`/bookings/${pendingBooking.id}/simulate-payment`, { method: 'POST' });
                      toast.success('Simulation payment success sent!');
                    } catch (e) {
                      toast.error('Simulation failed: ' + e.message);
                    }
                  }}
                  disabled={stkStatus !== 'waiting'}
                  className="btn-primary !px-3 !py-1.5 text-xs flex-1 !bg-amber/20 hover:!bg-amber/35 !text-amber border border-amber/30 transition font-semibold"
                >
                  Simulate Success
                </button>
                <button
                  onClick={() => {
                    clearInterval(pollRef.current);
                    setPendingBooking(null);
                    setSubmitting(false);
                  }}
                  className="btn-secondary !px-3 !py-1.5 text-xs flex-1 border-white/10 hover:bg-white/10 font-semibold"
                >
                  Cancel & Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
