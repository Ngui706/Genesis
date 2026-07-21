import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../middleware/errorHandler.js';
import { logAudit } from '../utils/audit.js';
import { sendMail, staffWelcomeEmail } from '../utils/mailer.js';
import { nanoid } from 'nanoid';

/** POST /auth/register — customer self-registration */
export async function registerCustomer(req, res, next) {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password || !fullName) throw new ApiError(400, 'Name, email and password are required');
    if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new ApiError(400, error.message);

    const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
      id: created.user.id,
      full_name: fullName,
      phone,
      role: 'customer',
    });
    if (profileErr) throw new ApiError(500, 'Failed to create profile');

    res.status(201).json({ message: 'Account created. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/staff — Admin creates a staff account with a temp password.
 * Staff is flagged must_change_password so the frontend forces a reset
 * screen right after their first login.
 */
export async function createStaffAccount(req, res, next) {
  try {
    const { email, fullName, phone, branchId, loginUrl } = req.body;
    if (!email || !fullName || !branchId) throw new ApiError(400, 'Name, email and branch are required');

    const tempPassword = `Gc${nanoid(10)}!`;

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (error) throw new ApiError(400, error.message);

    const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
      id: created.user.id,
      full_name: fullName,
      phone,
      role: 'staff',
      branch_id: branchId,
      must_change_password: true,
    });
    if (profileErr) throw new ApiError(500, 'Failed to create staff profile');

    await sendMail({
      to: email,
      subject: 'Your Genesis Coaches staff account',
      html: staffWelcomeEmail({ name: fullName, email, tempPassword, loginUrl: loginUrl || '#' }),
    });

    await logAudit({
      actorId: req.profile.id,
      actorRole: req.profile.role,
      action: 'staff.create',
      entityType: 'profile',
      entityId: created.user.id,
      metadata: { email, branchId },
      ip: req.ip,
    });

    res.status(201).json({ message: 'Staff account created and credentials emailed.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/change-password — used by any authenticated user, and required
 * for staff on first login (must_change_password flag drives the UI redirect).
 */
export async function changePassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password: newPassword });
    if (error) throw new ApiError(400, error.message);

    await supabaseAdmin.from('profiles').update({ must_change_password: false }).eq('id', req.user.id);

    await logAudit({
      actorId: req.profile.id,
      actorRole: req.profile.role,
      action: 'auth.password_change',
      entityType: 'profile',
      entityId: req.profile.id,
      ip: req.ip,
    });

    res.json({ message: 'Password updated.' });
  } catch (err) {
    next(err);
  }
}

/** GET /auth/me */
export async function getMe(req, res) {
  res.json({ user: { id: req.user.id, email: req.user.email }, profile: req.profile });
}
