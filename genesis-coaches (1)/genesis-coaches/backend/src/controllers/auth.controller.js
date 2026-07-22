import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../middleware/errorHandler.js';
import { logAudit } from '../utils/audit.js';
import { sendMail, staffWelcomeEmail, verificationEmail } from '../utils/mailer.js';
import { nanoid } from 'nanoid';

/** POST /auth/register — customer self-registration with email verification */
export async function registerCustomer(req, res, next) {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password || !fullName) throw new ApiError(400, 'Name, email and password are required');
    if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

    const verificationToken = nanoid(32);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { verificationToken, fullName },
    });
    if (error) throw new ApiError(400, error.message);

    const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
      id: created.user.id,
      full_name: fullName,
      phone,
      role: 'customer',
    });
    if (profileErr) throw new ApiError(500, 'Failed to create profile');

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    await sendMail({
      to: email,
      subject: 'Verify your email — Genesis Coaches',
      html: verificationEmail({ name: fullName, verifyUrl }),
    });

    res.status(201).json({
      message: 'Account created! Please check your email inbox to verify your address before logging in.',
    });
  } catch (err) {
    next(err);
  }
}

/** POST /auth/verify-email — Verify account token */
export async function verifyEmail(req, res, next) {
  try {
    const { token, email } = req.body;
    if (!token || !email) throw new ApiError(400, 'Verification token and email are required');

    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw new ApiError(500, 'Failed to lookup user accounts');

    const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) throw new ApiError(404, 'User account not found');

    if (user.email_confirmed_at) {
      return res.json({ message: 'Email is already verified. You can now log in.' });
    }

    const storedToken = user.user_metadata?.verificationToken;
    if (!storedToken || storedToken !== token) {
      throw new ApiError(400, 'Invalid or expired email verification link');
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      user_metadata: { ...user.user_metadata, verificationToken: null },
    });
    if (updateErr) throw new ApiError(500, 'Failed to update email verification status');

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (err) {
    next(err);
  }
}

/** POST /auth/resend-verification — Resend verification email */
export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) throw new ApiError(400, 'Email is required');

    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw new ApiError(500, 'Failed to lookup user accounts');

    const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) throw new ApiError(404, 'No account found with this email');

    if (user.email_confirmed_at) {
      throw new ApiError(400, 'This account is already verified. Please log in.');
    }

    let token = user.user_metadata?.verificationToken;
    if (!token) {
      token = nanoid(32);
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, verificationToken: token },
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    const fullName = user.user_metadata?.fullName || 'Customer';

    await sendMail({
      to: email,
      subject: 'Verify your email — Genesis Coaches',
      html: verificationEmail({ name: fullName, verifyUrl }),
    });

    res.json({ message: 'Verification email sent! Please check your inbox.' });
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
