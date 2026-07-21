import { supabaseAdmin } from '../config/supabase.js';

/**
 * Records an admin/staff action. Call this after any mutating action in
 * admin/staff routes (create bus, edit schedule, cancel booking, etc).
 */
export async function logAudit({ actorId, actorRole, action, entityType, entityId, metadata = {}, ip }) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: actorId,
      actor_role: actorRole,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      ip_address: ip,
    });
  } catch (err) {
    console.error('[audit] failed to log:', err.message);
  }
}
