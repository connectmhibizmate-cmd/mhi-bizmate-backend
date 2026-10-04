// MHI BizMate — Platform Admin API routes.
//
// Real platform-level data for the Global Admin Panel. All routes require a
// platform admin role (SUPER_ADMIN / ADMIN / MANAGER) via requirePlatformAdmin.
// Workspace members cannot reach these endpoints.
//
// No metric is fabricated. If a value cannot be calculated from existing data,
// it is returned as 0 / unavailable rather than invented.
//
// Routes:
//   GET /api/v1/admin/dashboard         — real KPIs + activity
//   GET /api/v1/admin/system-health      — backend/db/AI/Meta infrastructure status
//   GET /api/v1/admin/subscriptions      — all workspace subscriptions
//   GET /api/v1/admin/settings          — platform config (safe defaults)
//   GET /api/v1/admin/ai-employees       — employee registry + usage
//   GET /api/v1/admin/ai-employees/:id   — employee detail + providers

import { Router } from "express";
import { supabase } from "../../lib/supabaseClient.js";
import { requirePlatformAdmin } from "../../middleware/platformAdmin.js";
import { listEmployees, getEmployee } from "../../lib/ai/employees/index.js";
import { listProviders, getConfiguredProviders } from "../../lib/ai/providers/index.js";
import { sendData } from "../../lib/response.js";
import { ValidationError } from "../../lib/errors.js";

export const adminRouter = Router();
adminRouter.use(requirePlatformAdmin);

// ---- helpers ----
function _daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d.toISOString();
}
function _dayLabel(n) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(_daysAgo(n)).getDay()];
}

// GET /dashboard — real KPIs computed from existing tables.
adminRouter.get("/dashboard", async (req, res, next) => {
  try {
    const [
      profilesRes,
      workspacesRes,
      aiOpsRes,
      growthRes,
      activityRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id, created_at", { count: "exact", head: false }),
      supabase.from("workspaces").select("id", { count: "exact", head: true }),
      supabase.from("ai_operations").select("success", { count: "exact", head: false }),
      supabase.from("profiles").select("created_at").gte("created_at", _daysAgo(7)),
      supabase.from("business_audit_logs").select("id, action, actor_id, entity_type, created_at, metadata")
        .order("created_at", { ascending: false }).limit(10),
    ]);

    const aiOps = aiOpsRes.data || [];
    const growth = growthRes.data || [];

    // Build last-7-days user-growth buckets.
    const buckets = Array.from({ length: 7 }, (_, i) => ({
      label: _dayLabel(7 - i),
      count: 0,
      date: _daysAgo(7 - i),
    }));
    for (const p of growth) {
      const d = new Date(p.created_at);
      d.setHours(0, 0, 0, 0);
      const idx = buckets.findIndex((b) => new Date(b.date).getTime() === d.getTime());
      if (idx >= 0) buckets[idx].count++;
    }

    const kpis = {
      totalUsers: profilesRes.count || 0,
      activeWorkspaces: workspacesRes.count || 0,
      // V1 is Freemium + Ad-supported: no trial, no paid subscribers, no MRR.
      trialUsers: 0,
      paidSubscribers: 0,
      mrr: 0,
      aiActions: aiOpsRes.count || 0,
      model: "FREEMIUM",
    };

    const data = {
      kpis,
      userGrowth: buckets.map(({ label, count }) => ({ label, count })),
      conversion: {
        model: "FREEMIUM",
        trial: 0,
        paid: 0,
        expired: 0,
      },
      aiOps: {
        total: aiOps.length,
        success: aiOps.filter((r) => r.success).length,
        failed: aiOps.filter((r) => !r.success).length,
        status: getConfiguredProviders().length > 0 ? "ok" : "standby",
      },
      recentActivity: (activityRes.data || []).map((a) => ({
        id: a.id,
        action: a.action,
        actor: a.actor_id,
        label: a.entity_type || "",
        time: a.created_at,
        result: a.metadata?.result || null,
      })),
      alerts: [],
    };

    sendData(res, data);
  } catch (e) { next(e); }
});

// GET /system-health — real infrastructure status. Meta is reported as
// "paused" (Coming Soon) — its backend exists but is intentionally inactive.
adminRouter.get("/system-health", async (req, res, next) => {
  try {
    // DB connectivity: a lightweight query.
    let dbStatus = "ok";
    const { error: dbErr } = await supabase.from("workspaces").select("id", { count: "exact", head: true });
    if (dbErr) dbStatus = "degraded";

    const aiReady = getConfiguredProviders().length > 0;

    const items = [
      { id: "api", name: "API Gateway", status: "ok" },
      { id: "db", name: "Database", status: dbStatus },
      { id: "ai", name: "AI Gateway", status: aiReady ? "ok" : "standby" },
      { id: "meta", name: "Meta Webhook", status: "paused" },
    ];
    sendData(res, { items });
  } catch (e) { next(e); }
});

// GET /subscriptions — V1 is Freemium + Ad-supported. There are no paid
// subscriptions and no payment-verification queue. Returns an honest empty
// list with the current model so the admin UI does not fabricate metrics.
adminRouter.get("/subscriptions", async (req, res) => {
  sendData(res, {
    model: "FREEMIUM",
    items: [],
    pendingVerifications: [],
  });
});

// GET /settings — safe platform config. No secrets, no fake values.
adminRouter.get("/settings", async (req, res) => {
  sendData(res, {
    config: {
      platformName: "MHI BizMate",
      model: "FREEMIUM",
      maintenanceMode: false,
      paymentProviderConfigured: false,
      adProviderConfigured: false,
    },
  });
});

// GET /ai-employees — employee registry with per-employee usage counts.
adminRouter.get("/ai-employees", async (req, res, next) => {
  try {
    const employees = listEmployees();
    const { data: ops } = await supabase
      .from("ai_operations")
      .select("employee, success");

    const counts = {};
    for (const o of ops || []) {
      const k = o.employee || "unknown";
      if (!counts[k]) counts[k] = { actions: 0, errors: 0 };
      counts[k].actions++;
      if (!o.success) counts[k].errors++;
    }

    const list = employees.map((e) => {
      const c = counts[e.id] || { actions: 0, errors: 0 };
      return {
        id: e.id,
        name: e.name,
        role: e.role,
        audience: e.audience,
        status: e.audience === "customer" ? "paused" : "active",
        provider: e.defaultProvider,
        model: e.defaultModel,
        actions: c.actions,
        errors: c.errors,
        lastActivity: null,
      };
    });
    sendData(res, { employees: list });
  } catch (e) { next(e); }
});

// GET /ai-employees/:id — employee detail (summary only; no system prompt).
adminRouter.get("/ai-employees/:id", async (req, res, next) => {
  try {
    const employee = getEmployee(req.params.id);
    if (!employee) throw new ValidationError("Employee not found.");
    const summary = employee.toSummary();
    const providers = listProviders().map((p) => ({
      id: p.id,
      name: p.name,
      configured: p.isConfigured(),
      models: p.models,
    }));
    sendData(res, {
      employee: {
        id: summary.id,
        name: summary.name,
        role: summary.role,
        audience: summary.audience,
        status: summary.audience === "customer" ? "paused" : "active",
        provider: employee.defaultProvider,
        model: employee.defaultModel,
        actions: 0,
        errors: 0,
        lastActivity: null,
      },
      knowledge: {
        role: summary.role,
        instructions: "System instructions are not exposed. The employee is read-only and operates through approved context builders only.",
        rules: ["Read-only — no business mutations", "Workspace-scoped context", "Prompt-injection defense enforced"],
        version: 1,
      },
      providers,
    });
  } catch (e) { next(e); }
});