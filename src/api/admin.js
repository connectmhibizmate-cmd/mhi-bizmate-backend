// MHI BizMate — Admin service (Preview data, Backend Reset).
// Returns structured preview data per action so admin pages render without a
// backend. The Heart of BizMate will replace these with live Supabase queries.
import { PLANS } from "./subscriptions";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

const PREVIEW_SUBS = [
  { id: "sub-1", userId: "u-001", user_email: "shop.owner@example.com", plan: "BUSINESS", status: "BUSINESS", price: 4999, end: "2026-06-30T00:00:00Z", payment_status: "VERIFIED", active: true },
  { id: "sub-2", userId: "u-002", user_email: "new.user@example.com", plan: "TRIAL", status: "TRIAL_ACTIVE", price: 0, end: null, payment_status: "NONE", active: true },
  { id: "sub-3", userId: "u-003", user_email: "starter.biz@example.com", plan: "STARTER", status: "PAYMENT_PENDING", price: 1499, end: null, payment_status: "PENDING", active: false },
];

const PREVIEW_VERIFICATIONS = [
  { id: "v-1", user_id: "u-003", user_email: "starter.biz@example.com", plan_type: "STARTER", amount: 1499, transaction_id: "9XK4F2LQ7", status: "PENDING" },
];

const PREVIEW_CONFIG = {
  platformName: "MHI BizMate",
  supportEmail: "support@mhigroupbd.com",
  trialDays: 14,
  maintenanceMode: false,
  plans: PLANS,
};

export const adminApi = {
  panel: async () => ({}),
  control: async (payload = {}) => {
    switch (payload.action) {
      case "dashboard":
        return {
          kpis: { totalUsers: 1, activeWorkspaces: 1, trialUsers: 1, paidSubscribers: 1, mrr: 4999, aiActions: 0 },
          userGrowth: [
            { label: "Mon", count: 0 }, { label: "Tue", count: 1 }, { label: "Wed", count: 1 },
            { label: "Thu", count: 1 }, { label: "Fri", count: 1 }, { label: "Sat", count: 1 }, { label: "Sun", count: 1 },
          ],
          conversion: { trial: 1, paid: 1, expired: 0 },
          aiOps: { total: 0, success: 0, failed: 0, status: "standby" },
          recentActivity: [],
          alerts: [],
        };
      case "systemHealth":
        return {
          items: [
            { id: "api", name: "API Gateway", status: "standby" },
            { id: "ai", name: "AI Gateway", status: "standby" },
            { id: "db", name: "Database", status: "standby" },
            { id: "meta", name: "Meta Webhook", status: "paused" },
          ],
        };
      case "subscriptions":
        return { items: PREVIEW_SUBS, pendingVerifications: PREVIEW_VERIFICATIONS };
      case "settings":
        return { config: PREVIEW_CONFIG };
      case "updateSettings":
        return {};
      case "toggleSubscription":
        return {};
      default:
        return {};
    }
  },
  deleteAccount: async () => ({}),
  // ---- System A: Global Admin Panel (real, Supabase-backed) ----
  listPlatformUsers: async () => {
    if (!isSupabaseConfigured) return { items: [] };
    const { data, error } = await supabase.rpc("list_platform_users");
    if (error) throw error;
    return { items: data || [] };
  },
  setPlatformRole: async (userId, role) => {
    if (!isSupabaseConfigured) throw new Error("Authentication is not configured.");
    const { error } = await supabase.rpc("set_platform_role", {
      p_target_user_id: userId,
      p_role: role,
    });
    if (error) throw error;
    return { ok: true };
  },
};