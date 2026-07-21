import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../middleware/errorHandler.js';
import { cleanExpiredPendingBookings } from './booking.controller.js';

/** GET /routes — list active routes (for origin/destination pickers) */
export async function listRoutes(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('routes')
      .select('*')
      .eq('is_active', true)
      .order('origin');
    if (error) throw new ApiError(500, 'Failed to load routes');
    res.json({ routes: data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /schedules/search?origin=&destination=&date=
 * Returns upcoming schedules with bus + route info and live seat availability count.
 */
export async function searchSchedules(req, res, next) {
  try {
    const { origin, destination, date } = req.query;
    if (!origin || !destination || !date) throw new ApiError(400, 'origin, destination and date are required');

    // Run lazy cleanup first
    await cleanExpiredPendingBookings();

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const { data: routes } = await supabaseAdmin
      .from('routes')
      .select('id')
      .ilike('origin', origin)
      .ilike('destination', destination);

    if (!routes?.length) return res.json({ schedules: [] });

    const { data: schedules, error } = await supabaseAdmin
      .from('schedules')
      .select(`
        id, departure_time, arrival_time, fare, status,
        route:routes(id, origin, destination, distance_km, estimated_duration_minutes),
        bus:buses(id, name, plate_number, bus_class, total_seats, amenities)
      `)
      .in('route_id', routes.map((r) => r.id))
      .gte('departure_time', dayStart.toISOString())
      .lte('departure_time', dayEnd.toISOString())
      .eq('status', 'scheduled')
      .order('departure_time');
    if (error) throw new ApiError(500, 'Failed to search schedules');

    // Attach live seat availability for each schedule
    const enriched = await Promise.all(
      (schedules || []).map(async (s) => {
        const { count: bookedCount } = await supabaseAdmin
          .from('booking_passengers')
          .select('id, bookings!inner(schedule_id, status)', { count: 'exact', head: true })
          .eq('bookings.schedule_id', s.id)
          .in('bookings.status', ['pending', 'confirmed']);
        return { ...s, seatsAvailable: s.bus.total_seats - (bookedCount || 0) };
      })
    );

    res.json({ schedules: enriched });
  } catch (err) {
    next(err);
  }
}

/** GET /schedules/:id — full schedule detail (for the seat-selection page) */
export async function getScheduleDetail(req, res, next) {
  try {
    // Run lazy cleanup first
    await cleanExpiredPendingBookings();

    const { data, error } = await supabaseAdmin
      .from('schedules')
      .select(`
        id, departure_time, arrival_time, fare, status,
        route:routes(*), bus:buses(*)
      `)
      .eq('id', req.params.id)
      .single();
    if (error || !data) throw new ApiError(404, 'Schedule not found');

    const { data: seats } = await supabaseAdmin.from('seats').select('*').eq('bus_id', data.bus.id);

    const { data: takenRows } = await supabaseAdmin
      .from('booking_passengers')
      .select('seat_id, bookings!inner(schedule_id, status)')
      .eq('bookings.schedule_id', data.id)
      .in('bookings.status', ['pending', 'confirmed']);
    const takenSeatIds = new Set((takenRows || []).map((r) => r.seat_id));

    const { data: lockedRows } = await supabaseAdmin
      .from('seat_locks')
      .select('seat_id, expires_at')
      .eq('schedule_id', data.id)
      .gt('expires_at', new Date().toISOString());
    const lockedSeatIds = new Set((lockedRows || []).map((r) => r.seat_id));

    const seatMap = (seats || []).map((s) => ({
      ...s,
      status: takenSeatIds.has(s.id) ? 'booked' : lockedSeatIds.has(s.id) ? 'locked' : 'available',
    }));

    res.json({ schedule: data, seats: seatMap });
  } catch (err) {
    next(err);
  }
}

/** GET /popular-routes — public endpoint for homepage featured routes */
export async function getPopularRoutes(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('popular_routes')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw new ApiError(500, 'Failed to load popular routes');
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

/** GET /featured-branches — public endpoint for homepage featured branches */
export async function getFeaturedBranches(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('featured_branches')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw new ApiError(500, 'Failed to load featured branches');
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
