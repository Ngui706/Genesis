import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../middleware/errorHandler.js';
import { verifyTicketPayload } from '../utils/qrTicket.js';

/**
 * POST /tickets/verify { qrPayload }
 * Called when staff/conductor scans a passenger's QR code. Returns full,
 * live booking + passenger details — nothing sensitive is stored in the
 * QR image itself, so a lost/leaked screenshot doesn't leak PII on its own
 * and a cancelled booking's ticket immediately stops verifying as valid.
 */
export async function verifyTicket(req, res, next) {
  try {
    const { qrPayload } = req.body;
    if (!qrPayload) throw new ApiError(400, 'qrPayload is required');

    let decoded;
    try {
      decoded = verifyTicketPayload(qrPayload);
    } catch {
      throw new ApiError(400, 'Invalid or tampered ticket');
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        ticket_code, issued_at,
        booking:bookings(
          id, booking_reference, status, total_amount,
          customer:profiles(full_name, phone),
          schedule:schedules(departure_time, route:routes(origin,destination), bus:buses(name,plate_number)),
          passengers:booking_passengers(passenger_name, passenger_phone, seat:seats(seat_number))
        )
      `)
      .eq('ticket_code', decoded.tc)
      .single();
    if (error || !ticket) throw new ApiError(404, 'Ticket not found');

    if (ticket.booking.status !== 'confirmed') {
      return res.status(200).json({ valid: false, reason: `Booking is ${ticket.booking.status}`, booking: ticket.booking });
    }

    res.json({ valid: true, booking: ticket.booking });
  } catch (err) {
    next(err);
  }
}

/** GET /schedules/:id/manifest — passenger manifest for conductors */
export async function getManifest(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        booking_reference, status,
        passengers:booking_passengers(passenger_name, passenger_phone, seat:seats(seat_number))
      `)
      .eq('schedule_id', req.params.id)
      .eq('status', 'confirmed');
    if (error) throw new ApiError(500, 'Failed to load manifest');

    const manifest = (data || []).flatMap((b) =>
      b.passengers.map((p) => ({
        bookingReference: b.booking_reference,
        seatNumber: p.seat?.seat_number,
        passengerName: p.passenger_name,
        passengerPhone: p.passenger_phone,
      }))
    );
    res.json({ manifest });
  } catch (err) {
    next(err);
  }
}
