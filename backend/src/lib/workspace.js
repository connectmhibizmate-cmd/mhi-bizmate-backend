// MHI BizMate — Workspace resolver.
// Independently resolves the authenticated user's workspace_id and role from
// the authoritative workspace_members table. NEVER trusts a client-supplied
// workspace_id or role.
import { supabase } from "./supabaseClient.js";
import { AuthError, ForbiddenError } from "./errors.js";

// Resolves: { userId, email, workspaceId, role, status, fullName, displayName, platformRole }
export async function resolveContext(userId) {
  if (!userId) throw new AuthError();

  // 1. Fetch the user's profile (email, full_name, platform_role, status)
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, email, full_name, status, platform_role")
    .eq("id", userId)
    .maybeSingle();
  if (pErr) throw new Error(`Profile lookup failed: ${pErr.message}`);
  if (!profile) throw new AuthError("User profile not found.");

  if (profile.status === "blocked") {
    throw new ForbiddenError("Your account has been blocked.");
  }

  // 2. Resolve the authoritative workspace membership
  const { data: membership, error: mErr } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (mErr) throw new Error(`Membership lookup failed: ${mErr.message}`);

  // A user with no active membership has no workspace (e.g. invited but not joined)
  if (!membership) {
    throw new ForbiddenError("You do not have an active workspace membership.");
  }

  return {
    userId,
    email: profile.email,
    fullName: profile.full_name || "",
    displayName: profile.full_name || (profile.email || "").split("@")[0] || "Owner",
    workspaceId: membership.workspace_id,
    role: membership.role,
    platformRole: profile.platform_role || null,
  };
}