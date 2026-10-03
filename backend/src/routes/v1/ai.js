// MHI BizMate — AI Gateway API routes.
//
// Exposes the AI Gateway status, employee registry, and employee execution
// to authenticated workspace members.
//
// SECURITY:
//   - All routes require auth (inherited from v1Router).
//   - No credentials, prompts, or secrets are exposed.
//   - Employee system prompts are NOT exposed to the frontend — only
//     the summary (id, name, role, audience, allowed actions).
//   - Employee execution is audience-gated:
//     "customer" → any workspace member (Meta Connector will trigger this)
//     "owner"   → FOUNDER or CO_FOUNDER only
//     "admin"   → platform admin (SUPER_ADMIN, ADMIN, MANAGER) only

import { Router } from "express";
import { listProviders, getConfiguredProviders } from "../../lib/ai/providers/index.js";
import { listEmployees, getEmployee } from "../../lib/ai/employees/index.js";
import { getAiUsageSummary } from "../../lib/ai/usage.js";
import { ForbiddenError, ValidationError } from "../../lib/errors.js";

export const aiRouter = Router();

// ---- Audience access control ----
const PLATFORM_ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MANAGER"]);
const OWNER_ROLES = new Set(["FOUNDER", "CO_FOUNDER"]);

function _checkAudienceAccess(ctx, employee) {
  if (employee.audience === "owner") {
    if (!OWNER_ROLES.has(ctx.role)) {
      throw new ForbiddenError("This AI employee is available to the business owner only.");
    }
  } else if (employee.audience === "admin") {
    if (!ctx.platformRole || !PLATFORM_ADMIN_ROLES.has(ctx.platformRole)) {
      throw new ForbiddenError("This AI employee is available to platform administrators only.");
    }
  }
  // "customer" audience: any authenticated workspace member can trigger
  // (the Meta Connector will trigger this in the customer workflow phase)
}

// GET /api/v1/ai/status — Gateway health and provider status.
aiRouter.get("/status", (req, res) => {
  const all = listProviders();
  const configured = getConfiguredProviders();
  const activeId = process.env.AI_ACTIVE_PROVIDER?.trim() || (configured[0]?.id || "");
  const fallbackId = process.env.AI_FALLBACK_PROVIDER?.trim() || "";

  res.json({
    data: {
      ready: configured.length > 0,
      activeProvider: activeId,
      fallbackProvider: fallbackId,
      providers: all.map((p) => ({
        id: p.id,
        name: p.name,
        configured: p.isConfigured(),
        models: p.models,
      })),
    },
  });
});

// GET /api/v1/ai/employees — Employee registry (summaries only).
aiRouter.get("/employees", (req, res) => {
  const employees = listEmployees();
  res.json({
    data: employees.map((e) => e.toSummary()),
  });
});

// GET /api/v1/ai/employees/:id — Employee detail (summary only, no system prompt).
aiRouter.get("/employees/:id", (req, res, next) => {
  try {
    const employee = getEmployee(req.params.id);
    if (!employee) throw new ForbiddenError("Employee not found");
    res.json({ data: employee.toSummary() });
  } catch (e) { next(e); }
});

// POST /api/v1/ai/employees/:id/execute — Execute a task with an AI employee.
//
// Body: { message?, question?, task?, comment_text?, ...employee-specific input }
// Returns: { data: { reply, action: { proposed, result, error } | null, provider, model, correlationId } }
//
// Audience gating:
//   "customer" employees (messenger_ai, facebook_comment_ai): any workspace member.
//   "owner" employees (business_intel_ai): FOUNDER or CO_FOUNDER only.
//   "admin" employees (admin_panel_ai): platform admins only.
aiRouter.post("/employees/:id/execute", async (req, res, next) => {
  try {
    const employee = getEmployee(req.params.id);
    if (!employee) throw new ForbiddenError("Employee not found");

    // Audience-based access control
    _checkAudienceAccess(req.ctx, employee);

    // Validate input has some content
    const input = req.body || {};
    const hasContent = input.message || input.question || input.task ||
      input.comment_text || input.comment;
    if (!hasContent) {
      throw new ValidationError("Request must include a message, question, task, or comment_text.");
    }

    // Execute through the common pipeline
    const result = await employee.execute(req.ctx, input);

    res.json({
      data: {
        reply: result.reply,
        action: result.action,
        provider: result.provider,
        model: result.model,
        correlationId: result.correlationId,
      },
    });
  } catch (e) { next(e); }
});

// GET /api/v1/ai/usage — AI usage summary for the workspace.
aiRouter.get("/usage", async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await getAiUsageSummary(req.ctx, { startDate, endDate });
    res.json({ data: summary });
  } catch (e) { next(e); }
});