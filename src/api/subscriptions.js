// MHI BizMate — Subscriptions service (Preview data, Backend Reset).
// Returns the plan catalog + a preview trial status so the Subscription UI
// renders. The Heart of BizMate will replace these with live Supabase queries.

export const PLANS = [
  { key: "TRIAL", label: "Free Trial", price: 0, duration_days: 14, ai_total: 1200 },
  { key: "FREEMIUM", label: "Freemium", price: 0, duration_days: 0, ai_total: 100 },
  { key: "STARTER", label: "Starter", price: 1499, duration_days: 45, ai_total: 5000 },
  { key: "BUSINESS", label: "Business", price: 4999, duration_days: 180, ai_total: 25000 },
  { key: "BUSINESS_PRO", label: "Business Pro", price: 9999, duration_days: 365, ai_total: 75000 },
];

const PREVIEW_VERIFICATIONS = [
  { id: "v-1", user_id: "u-003", user_email: "starter.biz@example.com", plan_type: "STARTER", amount: 1499, transaction_id: "9XK4F2LQ7", status: "PENDING" },
];

export const subscriptionsApi = {
  status: async () => ({
    plan_type: "TRIAL",
    status: "TRIAL_ACTIVE",
    effective_plan: "TRIAL",
    remaining_trial_days: 14,
    ai_quota_total: 1200,
    trial_end_at: null,
    subscription_end_at: null,
    payment_status: "NONE",
    plans: PLANS,
  }),
  upgrade: async () => null,
  adminVerify: async (payload) => {
    if (payload?.action === "list") return { items: PREVIEW_VERIFICATIONS };
    return null;
  },
  paymentVerifications: async () => [],
};