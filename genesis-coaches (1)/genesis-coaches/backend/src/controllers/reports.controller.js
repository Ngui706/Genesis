import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../middleware/errorHandler.js';

const isStaff = (req) => req.profile?.role === 'staff';

/** GET /reports/revenue?from=&to=&branch_id= — revenue trend, branch breakdown, totals */
export async function revenueReport(req, res, next) {
  try {
    // Staff are automatically scoped to their own branch
    const effectiveBranchId = isStaff(req) ? req.profile.branch_id : req.query.branch_id;
    const { from, to } = req.query;
    const branch_id = effectiveBranchId;
    let query = supabaseAdmin
      .from('bookings')
      .select(`
        id, total_amount, created_at, status,
        schedule:schedules(
          id, branch_id,
          branch:branches(id, name, city),
          bus:buses(branch_id, branch:branches(id, name, city))
        )
      `)
      .eq('status', 'confirmed');

    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data: rawBookings, error } = await query;
    if (error) throw new ApiError(500, 'Failed to load revenue');

    const bookingsWithBranch = (rawBookings || []).map((b) => {
      const branchObj = b.schedule?.branch || b.schedule?.bus?.branch;
      const bId = branchObj?.id || 'unassigned';
      const bName = branchObj ? `${branchObj.name} (${branchObj.city})` : 'Online / Unassigned';
      return { ...b, branchId: bId, branchName: bName };
    });

    // Compute breakdown across ALL branches
    const branchMap = {};
    for (const b of bookingsWithBranch) {
      if (!branchMap[b.branchId]) {
        branchMap[b.branchId] = { branchId: b.branchId, branchName: b.branchName, revenue: 0, bookingCount: 0 };
      }
      branchMap[b.branchId].revenue += Number(b.total_amount);
      branchMap[b.branchId].bookingCount += 1;
    }
    const byBranch = Object.values(branchMap).sort((a, b) => b.revenue - a.revenue);

    // Apply branch filter if requested
    const filteredBookings = branch_id && branch_id !== 'all'
      ? bookingsWithBranch.filter((b) => b.branchId === branch_id)
      : bookingsWithBranch;

    const byDay = {};
    let totalRevenue = 0;
    for (const b of filteredBookings) {
      const day = b.created_at.slice(0, 10);
      byDay[day] = (byDay[day] || 0) + Number(b.total_amount);
      totalRevenue += Number(b.total_amount);
    }
    const trend = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, revenue]) => ({ date, revenue }));

    res.json({ totalRevenue, bookingCount: filteredBookings.length, trend, byBranch });
  } catch (err) { next(err); }
}

/** GET /reports/occupancy?branch_id= — seat occupancy rate per schedule (recent trips) */
export async function occupancyReport(req, res, next) {
  try {
    const branch_id = isStaff(req) ? req.profile.branch_id : req.query.branch_id;
    const { data: schedules, error } = await supabaseAdmin
      .from('schedules')
      .select('id, departure_time, branch_id, route:routes(origin,destination), bus:buses(total_seats, branch_id)')
      .order('departure_time', { ascending: false })
      .limit(100);
    if (error) throw new ApiError(500, 'Failed to load schedules');

    const filtered = (schedules || []).filter((s) => {
      if (!branch_id || branch_id === 'all') return true;
      const bId = s.branch_id || s.bus?.branch_id || 'unassigned';
      return bId === branch_id;
    }).slice(0, 50);

    const results = await Promise.all(
      filtered.map(async (s) => {
        const { count } = await supabaseAdmin
          .from('booking_passengers')
          .select('id, bookings!inner(schedule_id, status)', { count: 'exact', head: true })
          .eq('bookings.schedule_id', s.id)
          .in('bookings.status', ['pending', 'confirmed']);
        const totalSeats = s.bus?.total_seats || 0;
        const occupancyRate = totalSeats ? Math.round(((count || 0) / totalSeats) * 100) : 0;
        return {
          scheduleId: s.id,
          route: `${s.route?.origin || ''} → ${s.route?.destination || ''}`,
          departureTime: s.departure_time,
          seatsBooked: count || 0,
          totalSeats,
          occupancyRate,
        };
      })
    );
    res.json({ occupancy: results });
  } catch (err) { next(err); }
}

/** GET /reports/route-performance?branch_id= — bookings & revenue grouped by route */
export async function routePerformanceReport(req, res, next) {
  try {
    const branch_id = isStaff(req) ? req.profile.branch_id : req.query.branch_id;
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('total_amount, status, schedule:schedules(branch_id, bus:buses(branch_id), route:routes(id, origin, destination))')
      .eq('status', 'confirmed');
    if (error) throw new ApiError(500, 'Failed to load route performance');

    const filtered = (data || []).filter((b) => {
      if (!branch_id || branch_id === 'all') return true;
      const bId = b.schedule?.branch_id || b.schedule?.bus?.branch_id || 'unassigned';
      return bId === branch_id;
    });

    const byRoute = {};
    for (const b of filtered) {
      const route = b.schedule?.route;
      if (!route) continue;
      const key = `${route.origin} → ${route.destination}`;
      if (!byRoute[key]) byRoute[key] = { route: key, bookings: 0, revenue: 0 };
      byRoute[key].bookings += 1;
      byRoute[key].revenue += Number(b.total_amount);
    }
    const performance = Object.values(byRoute).sort((a, b) => b.revenue - a.revenue);
    res.json({ performance });
  } catch (err) { next(err); }
}

/** GET /reports/dashboard-summary?branch_id= — top-level KPIs for the admin landing dashboard */
export async function dashboardSummary(req, res, next) {
  try {
    const branch_id = isStaff(req) ? req.profile.branch_id : req.query.branch_id;
    const [{ count: totalBookings }, { count: totalCustomers }, { count: activeBuses }, { data: revenueRows }] = await Promise.all([
      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
      supabaseAdmin.from('buses').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('bookings').select('total_amount, schedule:schedules(branch_id, bus:buses(branch_id))').eq('status', 'confirmed'),
    ]);

    const filteredRevenueRows = (revenueRows || []).filter((r) => {
      if (!branch_id || branch_id === 'all') return true;
      const bId = r.schedule?.branch_id || r.schedule?.bus?.branch_id || 'unassigned';
      return bId === branch_id;
    });

    const totalRevenue = filteredRevenueRows.reduce((sum, r) => sum + Number(r.total_amount), 0);

    res.json({ totalBookings: totalBookings || 0, totalCustomers: totalCustomers || 0, activeBuses: activeBuses || 0, totalRevenue });
  } catch (err) { next(err); }
}
