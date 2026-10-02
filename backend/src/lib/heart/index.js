// MHI BizMate — Heart of BizMate: Orchestrator.
// Imports all entity handlers and provides a generic execute() for AI proposals.
// AI requests are PROPOSALS — the Heart validates permission, action validity,
// and business rules before executing. AI never writes to Supabase directly.
import { makeCrudHandler } from "./crud.js";
import { orderHandlers } from "./orders.js";
import { supabase } from "../supabaseClient.js";
import { hasPermission } from "./permissions.js";
import { AI_ALLOWED_ACTIONS, ACTIONS } from "./actions.js";
import { ForbiddenError, HeartError, NotFoundError, ValidationError } from "../errors.js";
import { auditLog } from "../audit.js";

// ---- Entity handlers (simple CRUD via factory) ----
export const customerHandlers = makeCrudHandler({
  table: "customers", entityName: "customer", permissionAction: "CREATE_CUSTOMER",
});
export const productHandlers = makeCrudHandler({
  table: "products", entityName: "product", permissionAction: "CREATE_PRODUCT",
});
export const leadHandlers = makeCrudHandler({
  table: "leads", entityName: "lead", permissionAction: "CREATE_LEAD",
});
export const transactionHandlers = makeCrudHandler({
  table: "transactions", entityName: "transaction", permissionAction: "CREATE_TRANSACTION",
});
export const notificationHandlers = makeCrudHandler({
  table: "notifications", entityName: "notification", permissionAction: "CREATE_TRANSACTION",
});
export const supplierHandlers = makeCrudHandler({
  table: "suppliers", entityName: "supplier", permissionAction: "CREATE_PRODUCT",
});
export const purchaseHandlers = makeCrudHandler({
  table: "purchases", entityName: "purchase", permissionAction: "CREATE_PRODUCT",
});
export const campaignHandlers = makeCrudHandler({
  table: "campaigns", entityName: "campaign", permissionAction: "CREATE_TRANSACTION",
});

// ---- Business profile handler ----
export const businessHandlers = {
  async get(ctx) {
    const { data, error } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();
    if (error) throw new HeartError(`Failed to get business profile: ${error.message}`);
    if (!data) {
      // Auto-create a default profile if none exists
      const { data: created, error: cErr } = await supabase
        .from("business_profiles")
        .insert({ workspace_id: ctx.workspaceId })
        .select("*")
        .single();
      if (cErr) throw new HeartError(`Failed to create business profile: ${cErr.message}`);
      return created;
    }
    return data;
  },

  async update(ctx, body) {
    if (!hasPermission(ctx.role, "UPDATE_BUSINESS_PROFILE")) {
      throw new ForbiddenError("Only the Founder or Co-Founder can update the business profile.");
    }
    // Ensure a profile exists
    const existing = await this.get(ctx);
    const { id: _id, workspace_id: _ws, created_at: _ca, ...updatable } = body;
    const { data, error } = await supabase
      .from("business_profiles")
      .update(updatable)
      .eq("id", existing.id)
      .eq("workspace_id", ctx.workspaceId)
      .select("*")
      .single();
    if (error) throw new HeartError(`Failed to update business profile: ${error.message}`);
    await auditLog(ctx, "business_profile.updated", "business_profile", data.id, { fields: Object.keys(updatable) });
    return data;
  },
};

// ---- Heart execute() — generic dispatcher for AI proposals ----
// AI sends { action, data }. The Heart validates and executes (or rejects).
export async function execute(action, ctx, data = {}) {
  // 1. AI proposals can only use allowed actions
  if (!AI_ALLOWED_ACTIONS.has(action)) {
    throw new ForbiddenError(`AI is not permitted to propose action: ${action}`);
  }

  // 2. Dispatch to the appropriate handler
  switch (action) {
    case ACTIONS.CREATE_CUSTOMER:
      return customerHandlers.create(ctx, data);
    case ACTIONS.UPDATE_CUSTOMER:
      return customerHandlers.update(ctx, data.id, data);
    case ACTIONS.CREATE_LEAD:
      return leadHandlers.create(ctx, data);
    case ACTIONS.UPDATE_LEAD:
      return leadHandlers.update(ctx, data.id, data);
    case ACTIONS.CREATE_PENDING_ORDER:
      return orderHandlers.create(ctx, data);
    case ACTIONS.UPDATE_PENDING_ORDER:
      return orderHandlers.update(ctx, data.id, data);
    case ACTIONS.SEND_MESSAGE:
      // Message sending is a placeholder — Meta integration comes in a later step
      throw new HeartError("Message sending is not yet available. Meta integration is pending.");
    default:
      throw new HeartError(`Unknown action: ${action}`);
  }
}