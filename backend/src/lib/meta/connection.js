// MHI BizMate — Meta Connector: Connection management.
//
// Manages the workspace's Meta connection state:
//   - connectPage: select and activate a Facebook Page
//   - disconnectPage: deactivate the active page (history preserved)
//   - changePage: switch the active page (old page deactivated, history preserved)
//   - reconnectPage: re-run the OAuth flow to refresh tokens
//   - getConnectionStatus: safe status for the frontend (no tokens)
//   - getConnectionHealth: validate that stored tokens still work
//   - getActivePageForWorkspace: trusted server-side workspace→page mapping
//   - decryptPageToken: retrieve the decrypted page token (backend only)
//
// SECURITY:
//   - 1 Workspace → 1 Active Page (enforced by DB + application logic).
//   - Page tokens are encrypted at rest; decrypted only when sending a reply.
//   - Status responses to the frontend NEVER include tokens, secrets, or
//     encrypted values — only page name, link, and connection state.
//   - Historical pages remain in meta_pages with is_active=false.
//   - The active page is always validated server-side from the DB mapping,
//     never from client-supplied page_id.

import { supabase } from "../supabaseClient.js";
import { encryptToken, decryptToken } from "./crypto.js";
import { listUserPages, validatePageToken } from "./client.js";
import { MetaError, MetaNotConfiguredError, MetaTokenInvalidError } from "./errors.js";

// ---- Connect a page: mark it as the workspace's active page ----
export async function connectPage(ctx, pageId) {
  // 1. Get the workspace's Meta connection (user token)
  const connection = await _getConnection(ctx);
  if (!connection) {
    throw new MetaError("No Meta connection found. Please authorize first.", "OAUTH_EXCHANGE");
  }

  const userToken = decryptToken(connection.encrypted_user_token);

  // 2. List available pages and find the selected one
  const pages = await listUserPages(userToken);
  const selectedPage = pages.find((p) => p.id === pageId);
  if (!selectedPage) {
    throw new MetaError("Selected page is not available or you do not have admin access.", "TOKEN_PERMISSION");
  }
  if (!selectedPage.access_token) {
    throw new MetaError("Page access token is missing. Please ensure you have the required permissions.", "TOKEN_PERMISSION");
  }

  // 3. Deactivate any currently active page (Change Page behavior)
  await supabase
    .from("meta_pages")
    .update({ is_active: false, disconnected_at: new Date().toISOString() })
    .eq("workspace_id", ctx.workspaceId)
    .eq("is_active", true);

  // 4. Upsert the selected page as the active page
  const encryptedPageToken = encryptToken(selectedPage.access_token);
  const { data: pageRow, error } = await supabase
    .from("meta_pages")
    .upsert(
      {
        workspace_id: ctx.workspaceId,
        page_id: selectedPage.id,
        page_name: selectedPage.name,
        page_link: selectedPage.link || "",
        encrypted_page_token: encryptedPageToken,
        is_active: true,
        connected_at: new Date().toISOString(),
        disconnected_at: null,
        last_validated_at: new Date().toISOString(),
        last_error_category: null,
      },
      { onConflict: "workspace_id,page_id" }
    )
    .select("id")
    .single();

  if (error) {
    // 23505 from the unique partial indexes means either another page is
    // already active for this workspace, or this page is already active for
    // a different workspace. Both are isolation violations — fail clearly.
    if (error.code === "23505") {
      throw new MetaError(
        "This Facebook Page cannot be activated. Either another Page is already active for this workspace (use Change Page), or this Page is already connected to another workspace.",
        "PAGE_CONFLICT"
      );
    }
    throw new MetaError("Failed to connect page.", "API_ERROR", { details: error.message });
  }

  return { pageId: selectedPage.id, pageName: selectedPage.name };
}

// ---- Disconnect: deactivate the active page (history preserved) ----
export async function disconnectPage(ctx) {
  const { data, error } = await supabase
    .from("meta_pages")
    .update({ is_active: false, disconnected_at: new Date().toISOString() })
    .eq("workspace_id", ctx.workspaceId)
    .eq("is_active", true)
    .select("page_id, page_name");

  if (error) {
    throw new MetaError("Failed to disconnect page.", "API_ERROR", { details: error.message });
  }

  // Also mark the connection as disconnected
  await supabase
    .from("meta_connections")
    .update({ status: "disconnected" })
    .eq("workspace_id", ctx.workspaceId);

  return { disconnected: Boolean(data?.length > 0) };
}

// ---- Change page: same as connectPage (old page auto-deactivated) ----
export async function changePage(ctx, pageId) {
  return connectPage(ctx, pageId);
}

// ---- Reconnect: re-run OAuth (frontend triggers a new OAuth flow) ----
export async function reconnectPage(ctx) {
  // Mark connection as needing reconnect; the frontend will trigger OAuth
  const { error } = await supabase
    .from("meta_connections")
    .update({ status: "reconnect_required" })
    .eq("workspace_id", ctx.workspaceId);

  if (error) {
    throw new MetaError("Failed to mark connection for reconnect.", "API_ERROR", { details: error.message });
  }

  return { reconnectRequired: true };
}

// ---- Get connection status (safe for frontend — no tokens) ----
export async function getConnectionStatus(ctx) {
  const [connRes, pageRes] = await Promise.all([
    supabase
      .from("meta_connections")
      .select("status, meta_user_name, last_error_category, last_validated_at")
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle(),
    supabase
      .from("meta_pages")
      .select("page_id, page_name, page_link, is_active, connected_at, last_validated_at, last_error_category")
      .eq("workspace_id", ctx.workspaceId)
      .order("connected_at", { ascending: false }),
  ]);

  const conn = connRes.data;
  const pages = pageRes.data || [];
  const activePage = pages.find((p) => p.is_active);

  if (!conn) {
    return { connected: false, connection: null };
  }

  return {
    connected: Boolean(activePage),
    connection: {
      status: activePage ? "connected" : conn.status,
      page_name: activePage?.page_name || "",
      page_link: activePage?.page_link || "",
      meta_user_name: conn.meta_user_name || "",
      last_validated: conn.last_validated_at || null,
      last_error: conn.last_error_category || null,
    },
  };
}

// ---- Get connection health (validates tokens still work) ----
export async function getConnectionHealth(ctx) {
  const conn = await _getConnection(ctx);
  if (!conn) {
    return { status: "disconnected", lastValidated: null, lastError: null };
  }

  const pageRes = await supabase
    .from("meta_pages")
    .select("page_id, page_name, encrypted_page_token, is_active, last_validated_at, last_error_category")
    .eq("workspace_id", ctx.workspaceId)
    .eq("is_active", true)
    .maybeSingle();

  const page = pageRes.data;
  if (!page) {
    return { status: "reconnect_required", lastValidated: conn.last_validated_at, lastError: null };
  }

  // Validate the page token
  const pageToken = decryptToken(page.encrypted_page_token);
  const validation = await validatePageToken(page.page_id, pageToken);

  let status = "connected";
  let errorCategory = null;

  if (!validation.valid) {
    status = "reconnect_required";
    errorCategory = validation.errorCategory || "TOKEN_INVALID";

    // Update the DB with the error
    await supabase
      .from("meta_pages")
      .update({ last_error_category: errorCategory, last_validated_at: new Date().toISOString() })
      .eq("page_id", page.page_id)
      .eq("workspace_id", ctx.workspaceId);

    await supabase
      .from("meta_connections")
      .update({ status: "reconnect_required", last_error_category: errorCategory })
      .eq("workspace_id", ctx.workspaceId);
  } else {
    // Token is valid — update last_validated
    await supabase
      .from("meta_pages")
      .update({ last_validated_at: new Date().toISOString(), last_error_category: null })
      .eq("page_id", page.page_id)
      .eq("workspace_id", ctx.workspaceId);

    await supabase
      .from("meta_connections")
      .update({ status: "connected", last_validated_at: new Date().toISOString(), last_error_category: null })
      .eq("workspace_id", ctx.workspaceId);
  }

  return {
    status,
    pageName: page.page_name,
    lastValidated: new Date().toISOString(),
    lastError: errorCategory,
  };
}

// ---- Trusted server-side mapping: workspace → active page ----
// This is the ONLY function that resolves a page_id to a workspace_id.
// Webhook events use this — they never trust the payload's workspace.
export async function getWorkspaceForPage(pageId) {
  const { data, error } = await supabase
    .from("meta_pages")
    .select("workspace_id, is_active, page_name, encrypted_page_token")
    .eq("page_id", pageId)
    .maybeSingle();

  if (error || !data) {
    return null; // Unknown page
  }

  if (!data.is_active) {
    return { workspaceId: data.workspace_id, isActive: false, pageName: data.page_name };
  }

  return {
    workspaceId: data.workspace_id,
    isActive: true,
    pageName: data.page_name,
    encryptedPageToken: data.encrypted_page_token,
  };
}

// ---- Get the active page for a workspace (backend only) ----
export async function getActivePage(ctx) {
  const { data, error } = await supabase
    .from("meta_pages")
    .select("page_id, page_name, page_link, encrypted_page_token, is_active")
    .eq("workspace_id", ctx.workspaceId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    pageId: data.page_id,
    pageName: data.page_name,
    pageLink: data.page_link,
    pageToken: decryptToken(data.encrypted_page_token),
  };
}

// ---- Internal: get the workspace's Meta connection ----
async function _getConnection(ctx) {
  const { data, error } = await supabase
    .from("meta_connections")
    .select("encrypted_user_token, meta_user_id, meta_user_name, status, last_validated_at")
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}