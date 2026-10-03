// MHI BizMate — AI Gateway: Usage & cost tracking.
//
// Logs every AI operation to the ai_operations table for observability and
// cost analysis. This is the SINGLE logging path for AI — it reuses the
// existing Supabase service-role client and business audit infrastructure.
//
// SECURITY:
//   - Never logs prompts, responses, or customer PII — only metadata.
//   - Never logs credentials, tokens, or secrets.
//   - Best-effort: a logging failure must not break the AI request.

import { supabase } from "../supabaseClient.js";

// Approximate cost per 1M tokens (USD). Updated when provider pricing changes.
// Used for ESTIMATION only — actual billing is handled by the provider.
const COST_PER_MILLION = {
  gemini: { input: 0.075, output: 0.30 },
  grok: { input: 2.0, output: 10.0 },
};

export async function logAiOperation(ctx, op) {
  if (!ctx?.workspaceId) return; // No workspace = no logging (safety)
  try {
    const estimatedCost = _estimateCost(op.provider, op.inputTokens, op.outputTokens);
    await supabase.from("ai_operations").insert({
      workspace_id: ctx.workspaceId,
      employee: op.employee || null,
      provider: op.provider || null,
      model: op.model || null,
      task_type: op.taskType || null,
      action: op.action || null,
      correlation_id: op.correlationId || null,
      input_tokens: op.inputTokens || 0,
      output_tokens: op.outputTokens || 0,
      estimated_cost: estimatedCost,
      success: op.success ?? false,
      error_category: op.success ? null : (op.errorCategory || "UNKNOWN"),
      fallback_used: op.fallbackUsed || false,
      metadata: op.metadata || {},
    });
  } catch (e) {
    // Best-effort: a logging failure must not break the AI request.
    console.error("[AI] Failed to log operation:", e.message);
  }
}

// Query AI usage for a workspace (for admin/owner dashboards).
export async function getAiUsageSummary(ctx, { startDate, endDate } = {}) {
  let query = supabase
    .from("ai_operations")
    .select("employee, provider, model, success, input_tokens, output_tokens, estimated_cost, error_category, fallback_used")
    .eq("workspace_id", ctx.workspaceId);
  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);
  const { data, error } = await query;
  if (error) return { totalOperations: 0, totalCost: 0, byEmployee: [], byProvider: [] };

  const rows = data || [];
  const byEmployee = _groupBy(rows, "employee");
  const byProvider = _groupBy(rows, "provider");
  return {
    totalOperations: rows.length,
    totalSuccess: rows.filter((r) => r.success).length,
    totalFailed: rows.filter((r) => !r.success).length,
    totalInputTokens: rows.reduce((s, r) => s + (r.input_tokens || 0), 0),
    totalOutputTokens: rows.reduce((s, r) => s + (r.output_tokens || 0), 0),
    totalCost: rows.reduce((s, r) => s + Number(r.estimated_cost || 0), 0),
    byEmployee,
    byProvider,
  };
}

function _estimateCost(provider, inputTokens, outputTokens) {
  const rates = COST_PER_MILLION[provider];
  if (!rates) return 0;
  const inCost = (Number(inputTokens || 0) / 1_000_000) * rates.input;
  const outCost = (Number(outputTokens || 0) / 1_000_000) * rates.output;
  return Math.round((inCost + outCost) * 1_000_000) / 1_000_000; // micro-dollar precision
}

function _groupBy(rows, key) {
  const map = {};
  for (const r of rows) {
    const k = r[key] || "unknown";
    if (!map[k]) map[k] = { count: 0, success: 0, failed: 0, cost: 0, tokens: 0 };
    map[k].count++;
    if (r.success) map[k].success++; else map[k].failed++;
    map[k].cost += Number(r.estimated_cost || 0);
    map[k].tokens += (r.input_tokens || 0) + (r.output_tokens || 0);
  }
  return Object.entries(map).map(([name, v]) => ({ name, ...v }));
}