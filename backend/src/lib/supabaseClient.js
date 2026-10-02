// MHI BizMate — Supabase service-role client (server-side ONLY)
// This client uses the SERVICE ROLE key and bypasses RLS.
// It is NEVER imported by the frontend. The Heart of BizMate uses it for all
// privileged database operations after authorization + business-rule validation.
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});