import { supabaseAdmin, supabaseAsUser } from '../config/supabase.js';
import { ADMIN_EMAIL } from '../config/admin.js';

/**
 * Verifies the Supabase access token from the Authorization header,
 * attaches req.user (auth user) and req.profile (role, branch, etc.),
 * and gives req.supabase — a client scoped to that user's RLS policies.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid or expired session' });

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('*, branch:branches(id, name, city)')
      .eq('id', userData.user.id)
      .single();
    if (profileErr || !profile) return res.status(401).json({ error: 'Profile not found' });
    if (!profile.is_active) return res.status(403).json({ error: 'Account disabled' });

    // The designated owner account becomes admin on its first authenticated request.
    // This avoids hard-coding a password while still allowing a Supabase invite or
    // normal registration flow to complete the admin setup.
    if (userData.user.email?.toLowerCase() === ADMIN_EMAIL && profile.role !== 'admin') {
      const { data: promoted, error: promotionError } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', profile.id)
        .select('*, branch:branches(id, name, city)')
        .single();
      if (promotionError) return res.status(500).json({ error: 'Could not configure the admin account' });
      Object.assign(profile, promoted);
    }

    req.user = userData.user;
    req.profile = profile;
    req.accessToken = token;
    req.supabase = supabaseAsUser(token); // RLS-respecting client for this request
    next();
  } catch (err) {
    next(err);
  }
}

/** Restrict a route to one or more roles, e.g. requireRole('admin') or requireRole('admin','staff') */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      return res.status(403).json({ error: 'Insufficient privileges' });
    }
    next();
  };
}
