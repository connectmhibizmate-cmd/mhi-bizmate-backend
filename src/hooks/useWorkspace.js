import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";

// MHI BizMate — Workspace hook (Step 2).
// Derives the workspace context from the real Supabase session + profiles row.
// workspace_id and role are server-derived; the browser never supplies them.
export function useWorkspace() {
  const { user, profile } = useSupabaseAuth();
  const workspaceId = user?.workspace_id || null;
  const workspace = workspaceId
    ? { id: workspaceId, name: profile?.full_name ? `${profile.full_name}'s Workspace` : "My Workspace", role: user?.role }
    : null;
  return {
    workspace,
    workspaceId,
    user,
    loading: false,
    needsOnboarding: !workspace,
  };
}