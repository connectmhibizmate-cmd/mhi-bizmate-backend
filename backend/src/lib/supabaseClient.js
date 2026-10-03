// MHI BizMate — Supabase service-role client (server-side ONLY)
// This client uses the SERVICE ROLE key and bypasses RLS.
// It is NEVER imported by the frontend. The Heart of BizMate uses it for all
// privileged database operations after authorization + business-rule validation.
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

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