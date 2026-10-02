// MHI BizMate — Real Auth service (Step 2).
//
// Delegates to Supabase Auth via the browser-safe anon client. Maps Supabase
// errors to friendly, user-facing messages. The service-role key is never used
// here. Profile / role / workspace resolution happens in SupabaseAuthContext
// (reads public.profiles, which is protected by RLS).

import { supabase, isSupabaseConfigured } from "./supabaseClient";

const EMAIL_REDIRECT_TO = "https://mhibizmate.base44.app/home";
const RESET_REDIRECT_TO = "https://mhibizmate.base44.app/reset-password";

function friendly(error, fallback) {
  if (!error) return fallback;
  const msg = String(error.message || "").toLowerCase();
  if (msg.includes("invalid login credentials")) return "Incorrect email or password.";
  if (msg.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (msg.includes("user already registered")) return "An account with this email already exists.";
  if (msg.includes("password should be at least") || msg.includes("password must be"))
    return "Password must be at least 8 characters.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (msg.includes("expired") || msg.includes("token has expired"))
    return "This link has expired. Please request a new one.";
  return error.message || fallback;
}

function notConfigured() {
  const err = new Error("Authentication is not configured. Please contact support.");
  err.code = "AUTH_NOT_CONFIGURED";
  return err;
}

export const authApi = {
  // Sign in with email + password.
  login: async (email, password) => {
    if (!isSupabaseConfigured) throw notConfigured();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendly(error, "Sign in failed."));
    return { user: data.user, session: data.session };
  },

  // Sign up. The handle_new_user DB trigger creates workspace + profile + member.
  // Returns a session only when email auto-confirm is enabled in Supabase.
  register: async ({ email, password }) => {
    if (!isSupabaseConfigured) throw notConfigured();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: EMAIL_REDIRECT_TO },
    });
    if (error) throw new Error(friendly(error, "Registration failed."));
    return { user: data.user, session: data.session };
  },

  // Password reset request. Always appears to succeed (no account enumeration).
  resetPasswordRequest: async (email) => {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: RESET_REDIRECT_TO });
    } catch {
      /* swallow — caller always shows generic success */
    }
  },

  // Set new password after clicking the recovery link (session already restored).
  resetPassword: async ({ newPassword }) => {
    if (!isSupabaseConfigured) throw notConfigured();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(friendly(error, "Failed to reset password. The link may have expired."));
    return { ok: true };
  },

  signOut: async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
    }
  },

  logout: async (redirectUrl) => {
    await authApi.signOut();
    window.location.href = redirectUrl || "/login";
  },

  redirectToLogin: (nextUrl) => {
    window.location.href = nextUrl || "/login";
  },

  getSession: async () => {
    if (!isSupabaseConfigured) return { session: null };
    const { data } = await supabase.auth.getSession();
    return { session: data.session };
  },

  isAuthenticated: async () => {
    if (!isSupabaseConfigured) return false;
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  },

  // Current Supabase auth user (identity only — NOT role/workspace).
  getCurrentUser: async () => {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.auth.getUser();
    return data.user || null;
  },

  // Update own identity fields only (full_name, phone, photo_url).
  // role / status / workspace_id are protected server-side and cannot be set here.
  updateMe: async (data) => {
    if (!isSupabaseConfigured) throw notConfigured();
    const { data: upd, error } = await supabase
      .from("profiles")
      .update({
        full_name: data?.full_name,
        phone: data?.phone,
        photo_url: data?.photo_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (await supabase.auth.getUser()).data.user.id)
      .select()
      .single();
    if (error) throw new Error(friendly(error, "Failed to update profile."));
    return upd;
  },

  me: async () => authApi.getCurrentUser(),
  getPublicSettings: async () => ({}),
};