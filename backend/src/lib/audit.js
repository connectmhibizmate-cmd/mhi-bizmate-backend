// MHI BizMate — Audit logger for business-critical actions.
import { supabase } from "./supabaseClient.js";

// Safe audit log: never logs passwords, tokens, or secrets. Only structured
// metadata about the action (entity type, entity id, business-relevant fields).
export async function auditLog(ctx, action, entityType, entityId, metadata = {}) {
  try {
    await supabase.from("business_audit_logs").insert({
      workspace_id: ctx.workspaceId,
      actor_id: ctx.userId,
      action,
      entity_type: entityType || "",
      entity_id: entityId || null,
      metadata: metadata || {},
    });
  } catch (e) {
    // Audit logging is best-effort; a logging failure must not break the request.
    console.error(`[AUDIT] Failed to log action ${action}:`, e.message);
  }
}