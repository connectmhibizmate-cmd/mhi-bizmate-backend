import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/api/supabaseClient";
import { setAccessTokenResolver } from "@/api/client";

// MHI BizMate — Real authentication context (Step 2).
//
// Supabase Auth is the SOLE authentication authority. This provider:
//   - restores the persisted session on load (session persistence + refresh)
//   - subscribes to auth state changes
//   - reads the public.profiles row to resolve role, status, workspace_id
//   - exposes the same context shape the locked UI imports, plus profile/refreshProfile
//
// SECURITY: role / workspace_id / status come from the server (profiles row
// protected by RLS + a BEFORE UPDATE trigger that blocks client escalation).
// The browser never declares its own role or workspace. UI visibility is UX only.
//
// If the profiles table is not yet migrated, a valid session with no profile row
// surfaces as authError 'user_not_registered' (existing UserNotRegisteredError).

const AuthContext = createContext(null);

export const SupabaseAuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  const fetchProfile = useCallback(async (uid) => {
    if (!isSupabaseConfigured || !uid) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_id, email, full_name, role, status, workspace_id, phone, photo_url, platform_role, created_at, updated_at")
      .eq("id", uid)
      .maybeSingle();
    if (error) return null;
    return data;
  }, []);

  const resolveSession = useCallback(
    async (sess) => {
      setSession(sess);
      const authUser = sess?.user;
      if (!authUser) {
        setProfile(null);
        setAuthError(null);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }
      const prof = await fetchProfile(authUser.id);
      if (!prof) {
        // Valid session but no profile row → not registered (or migration not applied).
        setProfile(null);
        setAuthError({ type: "user_not_registered" });
      } else {
        setProfile(prof);
        setAuthError(null);
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    },
    [fetchProfile]
  );

  useEffect(() => {
    let mounted = true;
    if (!isSupabaseConfigured) {
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }
    // Register the token resolver so httpApi attaches the Supabase JWT as a
    // Bearer header to Heart of BizMate API requests (Step 2 session -> backend).
    setAccessTokenResolver(async () => {
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token || null;
    });
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) resolveSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (mounted) resolveSession(sess);
    });
    return () => {
      mounted = false;
      sub?.unsubscribe?.();
    };
  }, [resolveSession]);

  const logout = useCallback(async (shouldRedirect = true) => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
    }
    setSession(null);
    setProfile(null);
    setAuthError(null);
    if (shouldRedirect) window.location.href = "/login";
  }, []);

  const navigateToLogin = useCallback(() => {
    window.location.href = "/login";
  }, []);

  const checkUserAuth = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setAuthChecked(true);
      setIsLoadingAuth(false);
      return;
    }
    const { data } = await supabase.auth.getSession();
    await resolveSession(data.session);
  }, [resolveSession]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      const prof = await fetchProfile(session.user.id);
      if (prof) setProfile(prof);
    }
  }, [session, fetchProfile]);

  const authUser = session?.user || null;
  const isAuthenticated = Boolean(authUser) && Boolean(profile);
  const isBlocked = Boolean(profile) && profile.status === "blocked";

  // user keeps the legacy shape existing UI imports (id, email, role, blocked, …)
  // plus workspace_id. role is the server-derived profile role.
  const user = authUser
    ? {
        id: authUser.id,
        displayId: profile?.display_id || null,
        email: authUser.email || profile?.email || "",
        full_name: profile?.full_name || "",
        role: profile?.role || null,
        platformRole: profile?.platform_role || null,
        blocked: isBlocked,
        status: profile?.status || null,
        phone: profile?.phone || "",
        photo_url: profile?.photo_url || "",
        updated_date: profile?.updated_at || null,
        workspace_id: profile?.workspace_id || null,
      }
    : null;

  const value = {
    user,
    profile,
    session,
    isAuthenticated: isAuthenticated && !isBlocked,
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError,
    appPublicSettings: null,
    authChecked,
    logout,
    navigateToLogin,
    checkUserAuth,
    checkAppState: checkUserAuth,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useSupabaseAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  return ctx;
};