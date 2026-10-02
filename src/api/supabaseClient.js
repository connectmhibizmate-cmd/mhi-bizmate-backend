// MHI BizMate — Real Supabase client (Step 2).
//
// Browser-safe: uses ONLY the public anon key (VITE_SUPABASE_ANON_KEY).
// The service-role key is NEVER imported or referenced in frontend code.
// All privileged operations run server-side (Supabase RLS + Heart of BizMate).

import { createClient } from "@supabase/supabase-js";

// Public, browser-safe Supabase project configuration.
// These are the anon/publishable values (NOT the service-role key) and are
// intentionally embedded in the client bundle — Supabase security is enforced
// by RLS, not by key secrecy. The service-role key is never used in frontend code.
const SUPABASE_URL = "https://dmscflxqjzvasnyqbhlu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtc2NmbHhxanp2YXNueXFiaGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MDQyODUsImV4cCI6MjEwNjQ4MDI4NX0.zQeIEfFUp3NYqf6fzu86kG5z3D0fNlLQkeMX_daTYyY";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "mhi_sb_auth",
      },
    })
  : null;

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    this.code = "AUTH_NOT_CONFIGURED";
    this.name = "SupabaseNotConfiguredError";
  }
}

export function normalizeSupabaseError(error) {
  return error instanceof Error
    ? error
    : new Error(String(error?.message || error || "Unknown error"));
}