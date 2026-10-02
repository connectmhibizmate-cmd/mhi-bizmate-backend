// MHI BizMate — Auth context (Supabase is the ONLY authentication authority).
//
// Section 1 cutover: this file no longer calls base44.auth.me(),
// base44.auth.logout(), base44.auth.redirectToLogin(), or
// base44.app.getPublicSettings(). Application authentication is 100% Supabase
// (SupabaseAuthContext: supabase.auth session + profiles row).
//
// The exports keep the legacy names (AuthProvider / useAuth) so the existing
// App.jsx scaffold and consumers continue to import the same symbols, but
// AuthProvider now renders the Supabase provider and useAuth returns the
// Supabase auth state. The base44 import is retained only because legacy
// backend-function invocation (client.js -> base44.functions.invoke) still
// needs the SDK client during the migration window; it is NOT used for auth.

import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { SupabaseAuthProvider, useSupabaseAuth } from '@/lib/SupabaseAuthContext';

const AuthContext = createContext();

// AuthProvider delegates to the Supabase-backed provider. No Base44 auth
// state, no Base44 token check, no getPublicSettings call.
export const AuthProvider = ({ children }) => <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;

// useAuth returns the Supabase auth context (same shape the old hook returned:
// user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError,
// authChecked, logout, navigateToLogin, checkUserAuth, checkAppState, session).
export const useAuth = useSupabaseAuth;