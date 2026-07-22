import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../middleware/errorHandler.js';
import { generateBookingReference, signTicketPayload, renderQrDataUrl } from '../utils/qrTicket.js';
import { generateTicketPdfBuffer } from '../utils/pdfTicket.js';
import { sendMail, bookingConfirmationEmail, bookingCancellationEmail } from '../utils/mailer.js';
import { logAudit } from '../utils/audit.js';
import { nanoid } from 'nanoid';
import { initiateStkPush } from '../utils/mpesa.js';

const LOCK_TTL_SECONDS = 300; // 5 minutes to complete checkout once a seat is selected

/** Cleans up stale pending bookings that did not complete payment within 5 minutes */
export async function cleanExpiredPendingBookings() {
  try {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: expired } = await supabaseAdmin
      .from('bookings')
      .select('id, schedule_id, passengers:booking_passengers(seat_id)')
      .eq('status', 'pending')
      .lt('created_at', fiveMinsAgo);

    if (expired && expired.length > 0) {
      const expiredIds = expired.map(b => b.id);
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'cancelled', payment_status: 'failed' })
        .in('id', expiredIds);

      for (const eb of expired) {
        if (eb.passengers) {
          await Promise.all(
            eb.passengers.map((p) =>
              supabaseAdmin.rpc('release_seat_lock', {
                p_schedule_id: eb.schedule_id,
                p_seat_id: p.seat_id,
                p_session_token: 'payment_expired'
              })
            )
          ).catch(() => {});
        }
      }
      console.log(`[cleanup] Cancelled ${expired.length} expired pending bookings and released locks.`);
    }
  } catch (err) {
    console.error('[cleanup] Failed to clean expired pending bookings:', err.message);
  }
}

/**
 * POST /seats/lock  { scheduleId, seatId, sessionToken }
 * Atomically claims a seat via the Postgres function so two users racing
 * for the same seat can't both succeed. sessionToken lets guests hold a
 * lock before they've authenticated; it's swapped for the user id at booking time.
 */
export async function lockSeat(req, res, next) {
  try {
    const { scheduleId, seatId, sessionToken } = req.body;
    if (!scheduleId || !seatId || !sessionToken) throw new ApiError(400, 'scheduleId, seatId and sessionToken are required');

    // Run lazy cleanup first
    await cleanExpiredPendingBookings();

    const { data: ok, error } = await supabaseAdmin.rpc('claim_seat_lock', {
      p_schedule_id: scheduleId,
      p_seat_id: seatId,
      p_session_token: sessionToken,
      p_locked_by: req.profile?.id || null,
      p_ttl_seconds: LOCK_TTL_SECONDS,
    });
    if (error) throw new ApiError(500, 'Could not lock seat');
    if (!ok) return res.status(409).json({ locked: false, message: 'Seat is no longer available' });

    res.json({ locked: true, expiresInSeconds: LOCK_TTL_SECONDS });
  } catch (err) {
    next(err);
  }
}

/** POST /seats/release { scheduleId, seatId, sessionToken } — user deselects a seat before booking */
export async function releaseSeat(req, res, next) {
  try {
    const { scheduleId, seatId, sessionToken } = req.body;
    await supabaseAdmin.rpc('release_seat_lock', {
      p_schedule_id: scheduleId,
      p_seat_id: seatId,
      p_session_token: sessionToken,
    });
    res.json({ released: true });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /bookings  { scheduleId, sessionToken, seats: [{seatId, passengerName, phone}], promoCode }
 * Requires auth. Verifies each seat is currently locked by this session (or
 * still genuinely free), creates the booking + passengers + ticket, releases
 * the locks, awards loyalty points, and emails the confirmation.
 */
export async function createBooking(req, res, next) {
  try {
    const { scheduleId, sessionToken, seats, promoCode, phone } = req.body;
    if (!scheduleId || !Array.isArray(seats) || seats.length === 0) {
      throw new ApiError(400, 'scheduleId and at least one seat are required');
    }

    // Run lazy cleanup first
    await cleanExpiredPendingBookings();

    const mpesaPhone = phone || req.profile.phone;
    if (!mpesaPhone) {
      throw new ApiError(400, 'M-Pesa phone number is required to trigger STK Push');
    }

    const { data: schedule, error: schedErr } = await supabaseAdmin
      .from('schedules')
      .select('*, route:routes(*), bus:buses(*)')
      .eq('id', scheduleId)
      .single();
    if (schedErr || !schedule) throw new ApiError(404, 'Schedule not found');

    // Re-validate every seat is either locked by this session or free (defense in depth)
    for (const s of seats) {
      const { data: existingLock } = await supabaseAdmin
        .from('seat_locks')
        .select('*')
        .eq('schedule_id', scheduleId)
        .eq('seat_id', s.seatId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (existingLock && existingLock.session_token !== sessionToken) {
        throw new ApiError(409, `Seat was just taken by another passenger. Please reselect.`);
      }
      const { data: alreadyBooked } = await supabaseAdmin
        .from('booking_passengers')
        .select('id, bookings!inner(schedule_id, status)')
        .eq('seat_id', s.seatId)
        .eq('bookings.schedule_id', scheduleId)
        .in('bookings.status', ['pending', 'confirmed'])
        .maybeSingle();
      if (alreadyBooked) throw new ApiError(409, `Seat is already booked.`);
    }

    let subtotal = seats.length * Number(schedule.fare);
    let discount = 0;
    let promoRecord = null;

    if (promoCode) {
      const { data: promo } = await supabaseAdmin
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();
      if (promo && (!promo.max_uses || promo.used_count < promo.max_uses)) {
        const now = new Date();
        const validFrom = new Date(promo.valid_from);
        const validUntil = promo.valid_until ? new Date(promo.valid_until) : null;
        if (now >= validFrom && (!validUntil || now <= validUntil)) {
          discount = promo.discount_type === 'percent' ? (subtotal * Number(promo.discount_value)) / 100 : Number(promo.discount_value);
          promoRecord = promo;
        }
      }
    }

    const total = Math.max(subtotal - discount, 0);
    const loyaltyEarned = Math.floor(total);

    const bookingRef = generateBookingReference();
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from('bookings')
      .insert({
        booking_reference: bookingRef,
        customer_id: req.profile.id,
        schedule_id: scheduleId,
        status: 'pending',
        payment_status: 'pending',
        subtotal,
        discount,
        total_amount: total,
        promo_code_id: promoRecord?.id || null,
        loyalty_points_earned: loyaltyEarned,
      })
      .select()
      .single();
    if (bookingErr) throw new ApiError(500, 'Failed to create booking');

    const passengerRows = seats.map((s) => ({
      booking_id: booking.id,
      seat_id: s.seatId,
      passenger_name: s.passengerName,
      passenger_phone: s.phone || null,
      passenger_id_number: s.idNumber || null,
      fare: schedule.fare,
    }));
    const { error: paxErr } = await supabaseAdmin.from('booking_passengers').insert(passengerRows);
    if (paxErr) throw new ApiError(500, 'Failed to save passenger details');

    // Create payment entry
    const { data: payment, error: payErr } = await supabaseAdmin
      .from('payments')
      .insert({
        booking_id: booking.id,
        amount: total,
        method: 'mpesa',
        status: 'pending',
      })
      .select()
      .single();
    if (payErr) throw new ApiError(500, 'Failed to initialize payment record');

    // Trigger STK push
    let stkResponse;
    try {
      stkResponse = await initiateStkPush({
        amount: total,
        phone: mpesaPhone,
        reference: bookingRef,
        description: `Bus ticket GC-${bookingRef}`,
      });
    } catch (stkErr) {
      await supabaseAdmin.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
      await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('id', payment.id);
      throw new ApiError(400, stkErr.message || 'Failed to initiate M-Pesa payment STK push');
    }

    // Update payment with the CheckoutRequestID
    if (stkResponse && stkResponse.CheckoutRequestID) {
      await supabaseAdmin
        .from('payments')
        .update({ provider_reference: stkResponse.CheckoutRequestID })
        .eq('id', payment.id);
    }

    res.status(201).json({
      booking,
      paymentInitiated: true,
      checkoutRequestId: stkResponse?.CheckoutRequestID || null,
      customerMessage: stkResponse?.CustomerMessage || 'Check your phone to complete payment.',
      mock: stkResponse?.mock || false,
    });
  } catch (err) {
    next(err);
  }
}

/** Utility to finalize confirmed bookings (creates tickets, releases locks, sends email) */
export async function finalizeBookingPayment(bookingId, receiptNumber, ipAddress) {
  const { data: booking, error: fetchErr } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      schedule:schedules(*, route:routes(*), bus:buses(*)),
      passengers:booking_passengers(*),
      customer:profiles(*)
    `)
    .eq('id', bookingId)
    .single();
  if (fetchErr || !booking) throw new ApiError(404, 'Booking not found during finalization');

  if (booking.status === 'confirmed' && booking.payment_status === 'paid') {
    return booking;
  }

  const { data: { user: authUser }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(booking.customer_id);
  if (userErr || !authUser) throw new Error('Could not find customer authentication details');
  const customerEmail = authUser.email;

  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'confirmed', payment_status: 'paid' })
    .eq('id', bookingId);
  if (updateErr) throw new Error('Failed to update booking status to confirmed');

  const { error: payErr } = await supabaseAdmin
    .from('payments')
    .update({ status: 'paid', provider_reference: receiptNumber })
    .eq('booking_id', bookingId);
  if (payErr) console.warn('[payment] Warning: Failed to update payment record status', payErr.message);

  const ticketCode = `TKT-${nanoid(12)}`;
  const qrPayload = signTicketPayload({ ticketCode, bookingId: booking.id });
  const { error: ticketErr } = await supabaseAdmin
    .from('tickets')
    .insert({ booking_id: booking.id, ticket_code: ticketCode, qr_payload: qrPayload });
  if (ticketErr) console.warn('[booking] Warning: Failed to insert ticket record', ticketErr.message);

  // Release seat locks
  const sessionToken = 'payment_confirmed';
  const { data: passengers } = await supabaseAdmin
    .from('booking_passengers')
    .select('seat_id')
    .eq('booking_id', bookingId);
  if (passengers) {
    await Promise.all(
      passengers.map((p) =>
        supabaseAdmin.rpc('release_seat_lock', { p_schedule_id: booking.schedule_id, p_seat_id: p.seat_id, p_session_token: sessionToken })
      ).catch(() => {})
    );
  }

  if (booking.promo_code_id) {
    const { data: promo } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('id', booking.promo_code_id)
      .single();
    if (promo) {
      await supabaseAdmin.from('promo_codes').update({ used_count: promo.used_count + 1 }).eq('id', promo.id);
    }
  }

  if (booking.loyalty_points_earned > 0) {
    await supabaseAdmin.from('loyalty_transactions').insert({
      customer_id: booking.customer_id,
      booking_id: booking.id,
      points: booking.loyalty_points_earned,
      reason: 'Booking reward',
    });
    const currentPoints = booking.customer?.loyalty_points || 0;
    await supabaseAdmin
      .from('profiles')
      .update({ loyalty_points: currentPoints + booking.loyalty_points_earned })
      .eq('id', booking.customer_id);
  }

  await sendMail({
    to: customerEmail,
    subject: `Booking confirmed — ${booking.booking_reference}`,
    html: bookingConfirmationEmail({
      name: booking.customer?.full_name || 'Customer',
      reference: booking.booking_reference,
      route: `${booking.schedule.route.origin} → ${booking.schedule.route.destination}`,
      departureTime: new Date(booking.schedule.departure_time).toLocaleString(),
      seats: booking.passengers?.map((p) => p.passenger_name).join(', ') || 'Seats booked',
      total: `KES ${Number(booking.total_amount).toFixed(2)}`,
    }),
  }).catch((mailErr) => console.error('[mailer] Email failed to send:', mailErr.message));

  await logAudit({
    actorId: booking.customer_id,
    actorRole: 'customer',
    action: 'booking.create',
    entityType: 'booking',
    entityId: booking.id,
    metadata: { bookingRef: booking.booking_reference, total: booking.total_amount },
    ip: ipAddress || '127.0.0.1',
  }).catch(() => {});

  return booking;
}

/** GET /bookings/:id/payment-status — check if the booking's payment is confirmed */
export async function getBookingPaymentStatus(req, res, next) {
  try {
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('id, status, payment_status')
      .eq('id', req.params.id)
      .single();
    if (error || !booking) throw new ApiError(404, 'Booking not found');
    res.json({
      status: booking.status,
      paymentStatus: booking.payment_status,
    });
  } catch (err) {
    next(err);
  }
}

/** POST /bookings/:id/simulate-payment — force payment success (for development/testing) */
export async function simulatePayment(req, res, next) {
  try {
    const { id } = req.params;
    const mockReceipt = `MPESA-${nanoid(8).toUpperCase()}`;
    await finalizeBookingPayment(id, mockReceipt, req.ip);
    res.json({ success: true, message: 'Payment successfully simulated' });
  } catch (err) {
    next(err);
  }
}

/** POST /payments/mpesa-callback — Safaricom Daraja callback webhook */
export async function mpesaCallback(req, res, next) {
  try {
    const { Body } = req.body;
    if (!Body || !Body.stkCallback) {
      console.warn('[mpesa-callback] Invalid callback payload received', req.body);
      return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid payload' });
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;

    console.log(`[mpesa-callback] Received checkout ${CheckoutRequestID} callback. Result: ${ResultCode} (${ResultDesc})`);

    const { data: payment, error: payErr } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('provider_reference', CheckoutRequestID)
      .maybeSingle();

    if (payErr || !payment) {
      console.error(`[mpesa-callback] No payment found for checkout request ${CheckoutRequestID}`);
      return res.status(404).json({ ResultCode: 1, ResultDesc: 'Payment not found' });
    }

    if (ResultCode === 0) {
      let mpesaReceipt = `MPESA-${nanoid(8).toUpperCase()}`;
      if (CallbackMetadata && Array.isArray(CallbackMetadata.Item)) {
        const receiptItem = CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber');
        if (receiptItem && receiptItem.Value) {
          mpesaReceipt = receiptItem.Value;
        }
      }

      await finalizeBookingPayment(payment.booking_id, mpesaReceipt, req.ip);
      console.log(`[mpesa-callback] Successfully confirmed payment for booking ${payment.booking_id}`);
    } else {
      await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('id', payment.id);
      await supabaseAdmin.from('bookings').update({ status: 'cancelled' }).eq('id', payment.booking_id);

      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('schedule_id, passengers:booking_passengers(seat_id)')
        .eq('id', payment.booking_id)
        .single();
      if (booking && booking.passengers) {
        await Promise.all(
          booking.passengers.map((p) =>
            supabaseAdmin.rpc('release_seat_lock', {
              p_schedule_id: booking.schedule_id,
              p_seat_id: p.seat_id,
              p_session_token: 'payment_failed'
            })
          ).catch(() => {})
        );
      }

      console.log(`[mpesa-callback] Payment failed or cancelled for checkout ${CheckoutRequestID}`);
    }

    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (err) {
    console.error('[mpesa-callback] Error processing callback:', err.message);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal Server Error' });
  }
}


/** GET /bookings/:id — single booking detail incl. ticket QR (for the confirmation/e-ticket page) */
export async function getBookingById(req, res, next) {
  try {
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *, schedule:schedules(departure_time, arrival_time, route:routes(origin,destination), bus:buses(name,plate_number,bus_class)),
        passengers:booking_passengers(*, seat:seats(seat_number)), ticket:tickets(*), customer:profiles(full_name, phone)
      `)
      .eq('id', req.params.id)
      .single();
    if (error || !booking) throw new ApiError(404, 'Booking not found');
    if (booking.customer_id !== req.profile.id && !['staff', 'admin'].includes(req.profile.role)) {
      throw new ApiError(403, 'Not allowed to view this booking');
    }

    let qrDataUrl = null;
    if (booking.ticket?.[0]) {
      qrDataUrl = await renderQrDataUrl(booking.ticket[0].qr_payload);
    }

    res.json({ booking, qrDataUrl });
  } catch (err) {
    next(err);
  }
}

/** GET /bookings/:id/ticket.pdf — downloadable e-ticket with QR in the top-right corner */
export async function downloadTicketPdf(req, res, next) {
  try {
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *, schedule:schedules(departure_time, arrival_time, route:routes(origin,destination), bus:buses(name,plate_number,bus_class)),
        passengers:booking_passengers(*, seat:seats(seat_number)), ticket:tickets(*)
      `)
      .eq('id', req.params.id)
      .single();
    if (error || !booking) throw new ApiError(404, 'Booking not found');
    if (booking.customer_id !== req.profile.id && !['staff', 'admin'].includes(req.profile.role)) {
      throw new ApiError(403, 'Not allowed to view this booking');
    }
    if (!booking.ticket?.[0]) throw new ApiError(404, 'No ticket issued for this booking');

    const pdfBuffer = await generateTicketPdfBuffer({ booking, qrPayload: booking.ticket[0].qr_payload });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${booking.booking_reference}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

/** GET /bookings/me — booking history for the logged-in customer */
export async function myBookings(req, res, next) {
  try {
    const { data, error } = await req.supabase
      .from('bookings')
      .select(`
        *, schedule:schedules(departure_time, arrival_time, route:routes(origin,destination), bus:buses(name,plate_number)),
        passengers:booking_passengers(*, seat:seats(seat_number)), ticket:tickets(*)
      `)
      .eq('customer_id', req.profile.id)
      .order('created_at', { ascending: false });
    if (error) throw new ApiError(500, 'Failed to load bookings');
    res.json({ bookings: data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /bookings/:id/cancel — customer or staff cancels a booking.
 * Refund percentage is computed from the applicable cancellation policy
 * based on hours remaining before departure.
 */
export async function cancelBooking(req, res, next) {
  try {
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('*, schedule:schedules(departure_time)')
      .eq('id', req.params.id)
      .single();
    if (error || !booking) throw new ApiError(404, 'Booking not found');
    if (booking.customer_id !== req.profile.id && !['staff', 'admin'].includes(req.profile.role)) {
      throw new ApiError(403, 'Not allowed to cancel this booking');
    }
    if (booking.status === 'cancelled') throw new ApiError(400, 'Booking already cancelled');

    const hoursBefore = (new Date(booking.schedule.departure_time) - new Date()) / 36e5;

    const { data: policies } = await supabaseAdmin
      .from('cancellation_policies')
      .select('*')
      .eq('is_active', true)
      .lte('hours_before_departure', Math.max(hoursBefore, 0))
      .order('hours_before_departure', { ascending: false })
      .limit(1);
    const refundPercentage = policies?.[0]?.refund_percentage ?? 0;
    const refundAmount = (Number(booking.total_amount) * refundPercentage) / 100;

    await supabaseAdmin.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
    await supabaseAdmin.from('refunds').insert({
      booking_id: booking.id,
      amount: refundAmount,
      reason: req.body?.reason || 'Customer requested cancellation',
      policy_id: policies?.[0]?.id || null,
      processed_by: req.profile.id,
      status: refundAmount > 0 ? 'pending' : 'rejected',
    });

    await logAudit({
      actorId: req.profile.id,
      actorRole: req.profile.role,
      action: 'booking.cancel',
      entityType: 'booking',
      entityId: booking.id,
      metadata: { refundAmount, refundPercentage },
      ip: req.ip,
    });

    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(booking.customer_id);
    if (authUser?.email) {
      await sendMail({
        to: authUser.email,
        subject: `Booking Cancellation — ${booking.booking_reference}`,
        html: bookingCancellationEmail({
          name: req.profile.full_name || 'Customer',
          reference: booking.booking_reference,
          refundAmount: refundAmount > 0 ? `KES ${refundAmount.toFixed(2)}` : 'None',
        }),
      }).catch((mailErr) => console.error('[mailer] Cancellation mail failed:', mailErr.message));
    }

    res.json({ message: 'Booking cancelled', refundAmount, refundPercentage });
  } catch (err) {
    next(err);
  }
}
