import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../middleware/errorHandler.js';
import { logAudit } from '../utils/audit.js';

/** Returns true if the requester is a staff member (not admin) */
const isStaff = (req) => req.profile.role === 'staff';

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

// ---- Branches ----
export const listBranches = async (req, res, next) => {
  try {
    let query = supabaseAdmin.from('branches').select('*').order('name');
    // Staff only see their own branch
    if (isStaff(req) && req.profile.branch_id) {
      query = query.eq('id', req.profile.branch_id);
    }
    const { data, error } = await query;
    if (error) throw new ApiError(500, 'Failed to load branches');
    res.json({ data });
  } catch (err) { next(err); }
};

export const createBranch = auditedInsert('branches', 'branch.create');

export const updateBranch = async (req, res, next) => {
  try {
    // Staff can only update their own branch
    if (isStaff(req) && req.profile.branch_id !== req.params.id) {
      throw new ApiError(403, 'You can only update your own branch');
    }
    const { data, error } = await supabaseAdmin.from('branches').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw new ApiError(400, error.message);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action: 'branch.update', entityType: 'branches', entityId: req.params.id, metadata: req.body, ip: req.ip });
    res.json({ data });
  } catch (err) { next(err); }
};

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
export const listBuses = async (req, res, next) => {
  try {
    let query = supabaseAdmin.from('buses').select('*, branch:branches(name,city)').order('created_at', { ascending: false });
    if (isStaff(req) && req.profile.branch_id) {
      query = query.eq('branch_id', req.profile.branch_id);
    }
    const { data, error } = await query;
    if (error) throw new ApiError(500, 'Failed to load buses');
    res.json({ data });
  } catch (err) { next(err); }
};

export const createBus = async (req, res, next) => {
  try {
    const { plate_number, name, bus_class, seat_layout, amenities } = req.body;
    // Staff auto-assigned to their branch; admin can specify
    const branch_id = isStaff(req) ? req.profile.branch_id : (req.body.branch_id || null);

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
export const listAllRoutes = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('routes').select('*').order('origin');
    if (error) throw new ApiError(500, 'Failed to load routes');
    res.json({ data });
  } catch (err) { next(err); }
};
export const createRoute = auditedInsert('routes', 'route.create');
export const updateRoute = auditedUpdate('routes', 'route.update');
export const deleteRoute = auditedDelete('routes', 'route.delete');

// ---- Schedules ----
export const listAllSchedules = async (req, res, next) => {
  try {
    let query = supabaseAdmin
      .from('schedules')
      .select('*, route:routes(origin,destination), bus:buses(name,plate_number,branch_id), branch:branches(name,city)')
      .order('departure_time', { ascending: false });

    // Staff only see their own branch's schedules
    if (isStaff(req) && req.profile.branch_id) {
      query = query.eq('branch_id', req.profile.branch_id);
    }
    const { data, error } = await query;
    if (error) throw new ApiError(500, 'Failed to load schedules');
    res.json({ data });
  } catch (err) { next(err); }
};

export const createSchedule = async (req, res, next) => {
  try {
    // Staff auto-assigned branch_id from their profile
    const body = { ...req.body };
    if (isStaff(req) && req.profile.branch_id) {
      body.branch_id = req.profile.branch_id;
    }
    const { data, error } = await supabaseAdmin.from('schedules').insert(body).select().single();
    if (error) throw new ApiError(400, error.message);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action: 'schedule.create', entityType: 'schedules', entityId: data.id, metadata: body, ip: req.ip });
    res.status(201).json({ data });
  } catch (err) { next(err); }
};
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
    const { id } = req.params;
    await supabaseAdmin.from('profiles').delete().eq('id', id);
    await supabaseAdmin.auth.admin.deleteUser(id).catch(() => {});
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action: 'staff.delete', entityType: 'profiles', entityId: id, ip: req.ip });
    res.json({ message: 'Staff account removed' });
  } catch (err) { next(err); }
};

// ---- Customers (scoped by branch for staff) ----
export const listCustomers = async (req, res, next) => {
  try {
    if (isStaff(req)) {
      // Staff: see only customers who have bookings on their branch's schedules
      const branchId = req.profile.branch_id;
      if (!branchId) return res.json({ data: [] });

      const { data: bookings, error: bErr } = await supabaseAdmin
        .from('bookings')
        .select('customer_id, customer:profiles(id,full_name,email,phone,created_at,is_active), schedule:schedules(branch_id)')
        .eq('status', 'confirmed')
        .eq('schedule.branch_id', branchId);

      if (bErr) throw new ApiError(500, 'Failed to load customers');

      // Deduplicate customers
      const seen = new Set();
      const customers = [];
      for (const b of (bookings || [])) {
        if (b.customer && !seen.has(b.customer.id)) {
          seen.add(b.customer.id);
          customers.push(b.customer);
        }
      }
      return res.json({ data: customers });
    }

    // Admin: all customers
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

// ---- Promo codes (staff scoped to their branch) ----
export const listPromoCodes = async (req, res, next) => {
  try {
    let query = supabaseAdmin.from('promo_codes').select('*').order('created_at', { ascending: false });
    if (isStaff(req) && req.profile.branch_id) {
      query = query.eq('branch_id', req.profile.branch_id);
    }
    const { data, error } = await query;
    if (error) throw new ApiError(500, 'Failed to load promo codes');
    res.json({ data });
  } catch (err) { next(err); }
};

export const createPromoCode = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (isStaff(req) && req.profile.branch_id) {
      body.branch_id = req.profile.branch_id;
    }
    const { data, error } = await supabaseAdmin.from('promo_codes').insert(body).select().single();
    if (error) throw new ApiError(400, error.message);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action: 'promo.create', entityType: 'promo_codes', entityId: data.id, metadata: body, ip: req.ip });
    res.status(201).json({ data });
  } catch (err) { next(err); }
};

export const updatePromoCode = async (req, res, next) => {
  try {
    // Staff can only update promos for their own branch
    if (isStaff(req)) {
      const { data: existing } = await supabaseAdmin.from('promo_codes').select('branch_id').eq('id', req.params.id).single();
      if (existing?.branch_id !== req.profile.branch_id) throw new ApiError(403, 'Cannot edit promos from another branch');
    }
    const { data, error } = await supabaseAdmin.from('promo_codes').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw new ApiError(400, error.message);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action: 'promo.update', entityType: 'promo_codes', entityId: req.params.id, metadata: req.body, ip: req.ip });
    res.json({ data });
  } catch (err) { next(err); }
};

export const deletePromoCode = async (req, res, next) => {
  try {
    if (isStaff(req)) {
      const { data: existing } = await supabaseAdmin.from('promo_codes').select('branch_id').eq('id', req.params.id).single();
      if (existing?.branch_id !== req.profile.branch_id) throw new ApiError(403, 'Cannot delete promos from another branch');
    }
    const { error } = await supabaseAdmin.from('promo_codes').delete().eq('id', req.params.id);
    if (error) throw new ApiError(400, error.message);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action: 'promo.delete', entityType: 'promo_codes', entityId: req.params.id, ip: req.ip });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

// ---- Cancellation policies ----
export const listPolicies = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('cancellation_policies').select('*').order('hours_before_departure');
    if (error) throw new ApiError(500, 'Failed to load policies');
    res.json({ data });
  } catch (err) { next(err); }
};
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
export const listPopularRoutes = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('popular_routes').select('*').order('sort_order');
    if (error) throw new ApiError(500, 'Failed to load popular routes');
    res.json({ data });
  } catch (err) { next(err); }
};
export const createPopularRoute = auditedInsert('popular_routes', 'popular_route.create');
export const updatePopularRoute = auditedUpdate('popular_routes', 'popular_route.update');
export const deletePopularRoute = auditedDelete('popular_routes', 'popular_route.delete');

// ---- Featured Branches (homepage feature) ----
export const listFeaturedBranches = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('featured_branches').select('*').order('sort_order');
    if (error) throw new ApiError(500, 'Failed to load featured branches');
    res.json({ data });
  } catch (err) { next(err); }
};
export const createFeaturedBranch = auditedInsert('featured_branches', 'featured_branch.create');
export const updateFeaturedBranch = auditedUpdate('featured_branches', 'featured_branch.update');
export const deleteFeaturedBranch = auditedDelete('featured_branches', 'featured_branch.delete');

// ---- Branch Updates (staff news, requires admin approval) ----
export const listBranchUpdates = async (req, res, next) => {
  try {
    let query = supabaseAdmin
      .from('branch_updates')
      .select('*, branch:branches(name,city), author:profiles!author_id(full_name), reviewer:profiles!reviewed_by(full_name)')
      .order('created_at', { ascending: false });

    // Staff: only see their own branch's updates
    if (isStaff(req) && req.profile.branch_id) {
      query = query.eq('branch_id', req.profile.branch_id);
    }
    const { data, error } = await query;
    if (error) throw new ApiError(500, 'Failed to load branch updates');
    res.json({ data });
  } catch (err) { next(err); }
};

export const listApprovedBranchUpdates = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('branch_updates')
      .select('*, branch:branches(name,city)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(12);
    if (error) throw new ApiError(500, 'Failed to load branch updates');
    res.json({ data });
  } catch (err) { next(err); }
};

export const createBranchUpdate = async (req, res, next) => {
  try {
    const { title, body, image_url } = req.body;
    if (!title || !body) throw new ApiError(400, 'title and body are required');

    const branch_id = isStaff(req) ? req.profile.branch_id : req.body.branch_id;
    if (!branch_id) throw new ApiError(400, 'branch_id is required');

    const { data, error } = await supabaseAdmin
      .from('branch_updates')
      .insert({ title, body, image_url, branch_id, author_id: req.profile.id, status: 'pending' })
      .select()
      .single();
    if (error) throw new ApiError(400, error.message);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action: 'branch_update.create', entityType: 'branch_updates', entityId: data.id, ip: req.ip });
    res.status(201).json({ data });
  } catch (err) { next(err); }
};

export const updateBranchUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isStaff(req)) {
      // Staff can only edit their own pending updates
      const { data: existing } = await supabaseAdmin.from('branch_updates').select('author_id, status').eq('id', id).single();
      if (!existing) throw new ApiError(404, 'Update not found');
      if (existing.author_id !== req.profile.id) throw new ApiError(403, 'Not your update');
      if (existing.status !== 'pending') throw new ApiError(400, 'Can only edit pending updates');

      const { title, body: bodyText, image_url } = req.body;
      const { data, error } = await supabaseAdmin
        .from('branch_updates')
        .update({ title, body: bodyText, image_url, updated_at: new Date().toISOString() })
        .eq('id', id).select().single();
      if (error) throw new ApiError(400, error.message);
      return res.json({ data });
    }

    // Admin: can update status (approve/reject) and any fields
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    if (req.body.status && ['approved', 'rejected'].includes(req.body.status)) {
      updates.reviewed_by = req.profile.id;
      updates.reviewed_at = new Date().toISOString();
    }
    const { data, error } = await supabaseAdmin.from('branch_updates').update(updates).eq('id', id).select().single();
    if (error) throw new ApiError(400, error.message);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action: 'branch_update.review', entityType: 'branch_updates', entityId: id, metadata: { status: req.body.status }, ip: req.ip });
    res.json({ data });
  } catch (err) { next(err); }
};

export const deleteBranchUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (isStaff(req)) {
      const { data: existing } = await supabaseAdmin.from('branch_updates').select('author_id').eq('id', id).single();
      if (!existing) throw new ApiError(404, 'Update not found');
      if (existing.author_id !== req.profile.id) throw new ApiError(403, 'Not your update');
    }
    const { error } = await supabaseAdmin.from('branch_updates').delete().eq('id', id);
    if (error) throw new ApiError(400, error.message);
    await logAudit({ actorId: req.profile.id, actorRole: req.profile.role, action: 'branch_update.delete', entityType: 'branch_updates', entityId: id, ip: req.ip });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};
