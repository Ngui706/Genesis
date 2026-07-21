import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../middleware/errorHandler.js';
import { logAudit } from '../utils/audit.js';

/** Generic CRUD helpers reused across simple admin-owned tables */
const auditedInsert = (table, action) => async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from(table).insert(req.body).select().single();
    if (error) throw new ApiError(400, error.message);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action, entityType: table, entityId: data.id, metadata: req.body, ip: req.ip });
    res.status(201).json({ data });
  } catch (err) { next(err); }
};

const auditedUpdate = (table, action) => async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from(table).update(req.body).eq('id', req.params.id).select().single();
    if (error) throw new ApiError(400, error.message);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action, entityType: table, entityId: req.params.id, metadata: req.body, ip: req.ip });
    res.json({ data });
  } catch (err) { next(err); }
};

const auditedDelete = (table, action) => async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin.from(table).delete().eq('id', req.params.id);
    if (error) throw new ApiError(400, error.message);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action, entityType: table, entityId: req.params.id, ip: req.ip });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

const list = (table, orderBy = 'created_at') => async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from(table).select('*').order(orderBy, { ascending: false });
    if (error) throw new ApiError(500, `Failed to load ${table}`);
    res.json({ data });
  } catch (err) { next(err); }
};

// ---- Branches ----
export const listBranches = list('branches', 'name');
export const createBranch = auditedInsert('branches', 'branch.create');
export const updateBranch = auditedUpdate('branches', 'branch.update');
export const deleteBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Null-out branch_id on schedules and buses that reference this branch
    // so the FK constraint is satisfied before the delete.
    await supabaseAdmin.from('schedules').update({ branch_id: null }).eq('branch_id', id);
    await supabaseAdmin.from('buses').update({ branch_id: null }).eq('branch_id', id);
    await supabaseAdmin.from('profiles').update({ branch_id: null }).eq('branch_id', id);

    const { error } = await supabaseAdmin.from('branches').delete().eq('id', id);
    if (error) throw new ApiError(400, error.message);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action: 'branch.delete', entityType: 'branches', entityId: id, ip: req.ip });
    res.json({ message: 'Branch deleted' });
  } catch (err) { next(err); }
};

// ---- Buses ----
export const listBuses = list('buses');
export const createBus = async (req, res, next) => {
  try {
    const { plate_number, name, bus_class, branch_id, seat_layout, amenities } = req.body;
    if (!plate_number || !seat_layout?.rows || !seat_layout?.columns) {
      throw new ApiError(400, 'plate_number and seat_layout {rows, columns} are required');
    }
    const rows = seat_layout.rows, cols = seat_layout.columns;
    const totalSeats = rows * cols;

    const { data: bus, error } = await supabaseAdmin
      .from('buses')
      .insert({ plate_number, name, bus_class, branch_id, seat_layout, amenities, total_seats: totalSeats })
      .select()
      .single();
    if (error) throw new ApiError(400, error.message);

    // Auto-generate seat rows for this bus based on the layout grid
    const seatRows = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const letter = String.fromCharCode(64 + c); // A, B, C...
        seatRows.push({ bus_id: bus.id, seat_number: `${r}${letter}`, position_row: r, position_col: c });
      }
    }
    await supabaseAdmin.from('seats').insert(seatRows);

    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action: 'bus.create', entityType: 'buses', entityId: bus.id, metadata: req.body, ip: req.ip });
    res.status(201).json({ data: bus });
  } catch (err) { next(err); }
};
export const updateBus = auditedUpdate('buses', 'bus.update');
export const deleteBus = auditedDelete('buses', 'bus.delete');

// ---- Routes ----
export const listAllRoutes = list('routes', 'origin');
export const createRoute = auditedInsert('routes', 'route.create');
export const updateRoute = auditedUpdate('routes', 'route.update');
export const deleteRoute = auditedDelete('routes', 'route.delete');

// ---- Schedules ----
export const listAllSchedules = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('schedules')
      .select('*, route:routes(origin,destination), bus:buses(name,plate_number)')
      .order('departure_time', { ascending: false });
    if (error) throw new ApiError(500, 'Failed to load schedules');
    res.json({ data });
  } catch (err) { next(err); }
};
export const createSchedule = auditedInsert('schedules', 'schedule.create');
export const updateSchedule = auditedUpdate('schedules', 'schedule.update');
export const deleteSchedule = auditedDelete('schedules', 'schedule.delete');

// ---- Staff ----
export const listStaff = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*, branch:branches(name)')
      .eq('role', 'staff')
      .order('created_at', { ascending: false });
    if (error) throw new ApiError(500, 'Failed to load staff');
    res.json({ data });
  } catch (err) { next(err); }
};
export const updateStaff = auditedUpdate('profiles', 'staff.update'); // e.g. deactivate, change branch
export const deleteStaff = async (req, res, next) => {
  try {
    await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action: 'staff.delete', entityType: 'profiles', entityId: req.params.id, ip: req.ip });
    res.json({ message: 'Staff account removed' });
  } catch (err) { next(err); }
};

// ---- Customers (admin user management) ----
export const listCustomers = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false });
    if (error) throw new ApiError(500, 'Failed to load customers');
    res.json({ data });
  } catch (err) { next(err); }
};
export const setUserActive = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    const { data, error } = await supabaseAdmin.from('profiles').update({ is_active }).eq('id', req.params.id).select().single();
    if (error) throw new ApiError(400, error.message);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action: is_active ? 'user.activate' : 'user.deactivate', entityType: 'profiles', entityId: req.params.id, ip: req.ip });
    res.json({ data });
  } catch (err) { next(err); }
};

// ---- Promo codes ----
export const listPromoCodes = list('promo_codes');
export const createPromoCode = auditedInsert('promo_codes', 'promo.create');
export const updatePromoCode = auditedUpdate('promo_codes', 'promo.update');
export const deletePromoCode = auditedDelete('promo_codes', 'promo.delete');

// ---- Cancellation policies ----
export const listPolicies = list('cancellation_policies', 'hours_before_departure');
export const createPolicy = auditedInsert('cancellation_policies', 'policy.create');
export const updatePolicy = auditedUpdate('cancellation_policies', 'policy.update');
export const deletePolicy = auditedDelete('cancellation_policies', 'policy.delete');

// ---- System settings ----
export const listSettings = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('system_settings').select('*');
    if (error) throw new ApiError(500, 'Failed to load settings');
    res.json({ data });
  } catch (err) { next(err); }
};
export const updateSetting = async (req, res, next) => {
  try {
    const { value } = req.body;
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .update({ value, updated_by: req.profile.id, updated_at: new Date().toISOString() })
      .eq('key', req.params.key)
      .select()
      .single();
    if (error) throw new ApiError(400, error.message);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action: 'settings.update', entityType: 'system_settings', entityId: data.id, metadata: { key: req.params.key, value }, ip: req.ip });
    res.json({ data });
  } catch (err) { next(err); }
};

// ---- Audit logs ----
export const listAuditLogs = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*, actor:profiles(full_name, role)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw new ApiError(500, 'Failed to load audit logs');
    res.json({ data });
  } catch (err) { next(err); }
};

// ---- Refunds queue ----
export const listRefunds = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('refunds')
      .select('*, booking:bookings(booking_reference, customer:profiles(full_name))')
      .order('created_at', { ascending: false });
    if (error) throw new ApiError(500, 'Failed to load refunds');
    res.json({ data });
  } catch (err) { next(err); }
};
export const updateRefundStatus = auditedUpdate('refunds', 'refund.update');

// ---- Popular Routes (homepage feature) ----
export const listPopularRoutes = list('popular_routes', 'sort_order');
export const createPopularRoute = auditedInsert('popular_routes', 'popular_route.create');
export const updatePopularRoute = auditedUpdate('popular_routes', 'popular_route.update');
export const deletePopularRoute = auditedDelete('popular_routes', 'popular_route.delete');

// ---- Featured Branches (homepage feature) ----
export const listFeaturedBranches = list('featured_branches', 'sort_order');
export const createFeaturedBranch = auditedInsert('featured_branches', 'featured_branch.create');
export const updateFeaturedBranch = auditedUpdate('featured_branches', 'featured_branch.update');
export const deleteFeaturedBranch = auditedDelete('featured_branches', 'featured_branch.delete');
