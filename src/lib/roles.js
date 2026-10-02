// MHI BizMate — Workspace roles & RBAC helpers (Step 2).
//
// Roles are the SOURCE OF TRUTH stored on public.profiles (server-derived).
// The frontend reads them only for UX visibility — NEVER for authorization.
// Actual authorization is enforced server-side (Supabase RLS + Heart of BizMate).
//
// Approved roles:
//   FOUNDER     — full workspace control, member management, sensitive settings.
//   CO_FOUNDER  — broad business access; max 2 per workspace; no ownership/security actions.
//   MODERATOR   — operational access; no ownership transfer / account deletion / security changes.
//   PLATFORM_ADMIN — (future) cross-workspace platform super-admin; not auto-granted.

export const ROLE = {
  FOUNDER: "FOUNDER",
  CO_FOUNDER: "CO_FOUNDER",
  MODERATOR: "MODERATOR",
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
};

// Admin Panel access is reserved for the workspace FOUNDER today.
// (PLATFORM_ADMIN will be added later as an explicit server-side permission.)
export const isWorkspaceAdmin = (role) => role === ROLE.FOUNDER || role === ROLE.PLATFORM_ADMIN;
export const isFounder = (role) => role === ROLE.FOUNDER;

// ---------------------------------------------------------------------------
// Global (platform) roles — System A: Global Admin Panel.
// Completely independent from the workspace roles above. Admin Panel access is
// gated on these ONLY. A workspace FOUNDER is NOT a global admin by default.
//   SUPER_ADMIN — application owner (seeded server-side, one-time).
//   ADMIN       — Global Admin Panel access; cannot assign global roles.
//   MANAGER     — Global Admin Panel access; cannot assign global roles.
//   null        — Normal User. No Admin Panel access.
// Source of truth: public.profiles.platform_role (server-derived, client cannot
// write it). Frontend reads it for UX visibility ONLY — never for authorization.
// ---------------------------------------------------------------------------
export const PLATFORM_ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
};

export const PLATFORM_ROLE_LABEL = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
};

// Global admin = any of the three platform roles. null/undefined = Normal User.
export const isGlobalAdmin = (platformRole) =>
  platformRole === PLATFORM_ROLE.SUPER_ADMIN ||
  platformRole === PLATFORM_ROLE.ADMIN ||
  platformRole === PLATFORM_ROLE.MANAGER;

export const isSuperAdmin = (platformRole) => platformRole === PLATFORM_ROLE.SUPER_ADMIN;