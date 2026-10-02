import React from "react";
import { Navigate } from "react-router-dom";
import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";
import { isGlobalAdmin } from "@/lib/roles";

// UI-side guard for Global Admin Panel routes. Non-admins are redirected to Home.
// This is UX only — actual authorization is enforced server-side (Supabase RLS +
// SECURITY DEFINER RPCs). Admin Panel access is gated on the GLOBAL platform role
// (Super Admin / Admin / Manager) — NEVER on the workspace FOUNDER role. A
// workspace FOUNDER is not a global admin by default. Deny by default when the
// platform role is missing.
export default function AdminRoute({ children }) {
  const { user, isLoadingAuth, authChecked } = useSupabaseAuth();
  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!isGlobalAdmin(user?.platformRole)) return <Navigate to="/home" replace />;
  return children;
}