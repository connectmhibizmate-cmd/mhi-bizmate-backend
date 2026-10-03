// MHI BizMate — Supabase service-role client (server-side ONLY)
// This client uses the SERVICE ROLE key and bypasses RLS.
// It is NEVER imported by the frontend. The Heart of BizMate uses it for all
// privileged database operations after authorization + business-rule validation.
//
// Node.js 20 has no native global WebSocket (added in Node 22).
// @supabase/supabase-js v2 eagerly initializes its RealtimeClient inside
// createClient(), which throws "Node.js detected but native WebSocket not
// found" when no WebSocket implementation is available. This backend never
// uses realtime subscriptions, but the constructor still requires a
// WebSocket class to exist, so we polyfill it from `ws`.
//
// ESM import order: `ws` is imported first so its module is evaluated before
// @supabase/supabase-js. The polyfill is then set on globalThis before
// createClient() is called, ensuring the RealtimeClient constructor finds
// a WebSocket implementation.
import { WebSocket as WS } from "ws";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

if (!globalThis.WebSocket) {
  globalThis.WebSocket = WS;
}

export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let readinessPromise = null;
let readinessExpiresAt = 0;
export function checkAuthReadiness() {
  if (!readinessPromise || Date.now() >= readinessExpiresAt) {
    readinessExpiresAt = Date.now() + 30000;
    readinessPromise = supabase.auth.admin.listUsers({ page: 1, perPage: 1 }).then(({ error }) => {
      if (!error) return { ready: true };
      const configurationError = error.status === 401 || error.status === 403;
      console.error("[AUTH] Provider readiness failed", { status: error.status, code: error.code });
      return {
        ready: false,
        code: configurationError ? "AUTH_CONFIGURATION_ERROR" : "AUTH_SERVICE_UNAVAILABLE",
        providerStatus: Number.isFinite(error.status) ? error.status : null,
        reason: error.name === "AuthRetryableFetchError" ? "provider_unreachable" : "provider_request_failed",
      };
    }).catch(() => ({ ready: false, code: "AUTH_SERVICE_UNAVAILABLE", providerStatus: null, reason: "provider_request_failed" }));
  }
  return readinessPromise;
}