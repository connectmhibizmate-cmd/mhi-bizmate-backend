// MHI BizMate — Workspace service (Step 3). Founder-side member management is
// backed by Supabase SECURITY DEFINER RPCs (migration 0003). The legacy
// getMyWorkspace/createWorkspace stubs remain for any existing callers; the real
// workspace context is derived in useWorkspace() from the profile row.
import { supabase, isSupabaseConfigured } from "./supabaseClient";

export const workspaceApi = {
  getMyWorkspace: async () => ({ id: "preview-workspace", name: "My Workspace", role: "founder" }),
  createWorkspace: async ({ name }) => ({ id: "preview-workspace", name: name || "My Workspace", role: "founder" }),

  // ---- System B: workspace member management (real, Supabase-backed) ----
  listMembers: async (workspaceId) => {
    if (!isSupabaseConfigured) return { items: [] };
    const { data, error } = await supabase.rpc("list_workspace_members", { p_workspace_id: workspaceId });
    if (error) throw error;
    return { items: data || [] };
  },
  listAuditLogs: async (workspaceId) => {
    if (!isSupabaseConfigured) return { items: [] };
    const { data, error } = await supabase.rpc("list_workspace_audit_logs", { p_workspace_id: workspaceId, p_limit: 100 });
    if (error) throw error;
    return { items: data || [] };
  },
  createInvitation: async (email, role) => {
    if (!isSupabaseConfigured) throw new Error("Authentication is not configured.");
    const { data, error } = await supabase.rpc("create_invitation", { p_email: email, p_role: role });
    if (error) throw error;
    return { token: data };
  },
  updateMemberRole: async (memberId, role) => {
    if (!isSupabaseConfigured) throw new Error("Authentication is not configured.");
    const { error } = await supabase.rpc("update_member_role", { p_member_id: memberId, p_role: role });
    if (error) throw error;
    return { ok: true };
  },
  setMemberStatus: async (memberId, status) => {
    if (!isSupabaseConfigured) throw new Error("Authentication is not configured.");
    const { error } = await supabase.rpc("set_member_status", { p_member_id: memberId, p_status: status });
    if (error) throw error;
    return { ok: true };
  },
  removeMember: async (memberId) => {
    if (!isSupabaseConfigured) throw new Error("Authentication is not configured.");
    const { error } = await supabase.rpc("remove_member", { p_member_id: memberId });
    if (error) throw error;
    return { ok: true };
  },
};