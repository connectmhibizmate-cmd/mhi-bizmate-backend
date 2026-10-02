// MHI BizMate — Frontend API service barrel.
// Pages and components import from "@/api", never from @base44/sdk or
// @/api/base44Client directly. This is the single seam between the UI and the
// backend; swapping the interim Base44 adapter for the external API happens
// inside these service modules only.

export { authApi } from "./auth";
export { workspaceApi } from "./workspace";
export {
  supabase,
  isSupabaseConfigured,
  SupabaseNotConfiguredError,
  normalizeSupabaseError,
} from "./supabaseClient";
export { businessApi } from "./business";
export { productsApi } from "./products";
export { customersApi } from "./customers";
export { ordersApi } from "./orders";
export { notificationsApi } from "./notifications";
export { transactionsApi } from "./transactions";
export { filesApi } from "./files";
export { aiApi } from "./ai";
export { automationApi } from "./automation";
export { subscriptionsApi } from "./subscriptions";
export { conversationsApi } from "./conversations";
export { integrationsApi } from "./integrations";
export { adminApi } from "./admin";
export { analyticsApi } from "./analytics";
export { marketingApi } from "./marketing";
export { sourcingApi } from "./sourcing";
export { leadsApi } from "./leads";
export { API_BASE_URL, API_DRIVER, httpApi, tokenStore } from "./client";