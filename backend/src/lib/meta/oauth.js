// MHI BizMate — Meta Connector: OAuth flow.
//
// Implements the secure server-side OAuth flow:
//   1. generateOAuthUrl — creates a cryptographically strong state tied to the
//      authenticated user + workspace, stores it in meta_oauth_states (single-use,
//      10-minute expiry), returns the Facebook authorization URL.
//   2. consumeState — validates the returned state against the DB (must exist,
//      not expired, not used, match user + workspace). Marks as used.
//   3. exchangeCode — consumes the state, exchanges the authorization code
//      server-side for a user access token, gets long-lived token, stores
//      the encrypted connection in meta_connections.
//   4. listAvailablePages — uses the stored user token to list Facebook Pages.
//
// SECURITY:
//   - State is cryptographically random (32 bytes hex).
//   - State is tied to user_id + workspace_id — a state from User A cannot be
//     used by User B.
//   - State expires after 10 minutes.
//   - State is single-use — once consumed, it cannot be reused.
//   - Authorization code exchange happens ONLY server-side — the App Secret
//     never reaches the frontend.
//   - User access token is encrypted (AES-256-GCM) before storage.

import { supabase } from "../supabaseClient.js";
import { generateStateToken, encryptToken } from "./crypto.js";
import {
  exchangeCodeForToken,
  getLongLivedUserToken,
  listUserPages,
  getUserProfile,
} from "./client.js";
import {
  MetaError,
  MetaOAuthStateError,
  MetaOAuthDeniedError,
  MetaOAuthExchangeError,
  MetaNotConfiguredError,
} from "./errors.js";

const STATE_TTL_MINUTES = 10;
const OAUTH_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "pages_messaging",
  "pages_manage_posts",
].join(",");

function _appId() {
  const id = process.env.META_APP_ID?.trim();
  if (!id) throw new MetaNotConfiguredError(["META_APP_ID"]);
  return id;
}

function _redirectUri() {
  const uri = process.env.META_REDIRECT_URI?.trim();
  if (!uri) throw new MetaNotConfiguredError(["META_REDIRECT_URI"]);
  return uri;
}

// Generate the OAuth authorization URL with a cryptographic state.
// Stores the state in meta_oauth_states tied to the user + workspace.
export async function generateOAuthUrl(ctx) {
  const appId = _appId();
  const redirectUri = _redirectUri();
  const state = generateStateToken();

  // Store the state in the DB (tied to user + workspace, 10-min expiry)
  const { error } = await supabase.from("meta_oauth_states").insert({
    workspace_id: ctx.workspaceId,
    user_id: ctx.userId,
    state,
    expires_at: new Date(Date.now() + STATE_TTL_MINUTES * 60 * 1000).toISOString(),
  });
  if (error) {
    throw new MetaError("Failed to initiate OAuth flow.", "OAUTH_STATE", { details: error.message });
  }

  const url = new URL("https://www.facebook.com/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", OAUTH_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("auth_type", "rerequest");

  return { url: url.toString(), state };
}

// Consume and validate an OAuth state. Returns the stored workspace/user
// context if valid. Throws if the state is invalid, expired, already used,
// or does not match the authenticated user.
export async function consumeState(state, ctx) {
  if (!state) throw new MetaOAuthStateError("is missing");

  const { data: stateRow, error } = await supabase
    .from("meta_oauth_states")
    .select("id, workspace_id, user_id, expires_at, used_at")
    .eq("state", state)
    .maybeSingle();

  if (error || !stateRow) {
    throw new MetaOAuthStateError("is invalid");
  }

  // Single-use: already consumed
  if (stateRow.used_at) {
    throw new MetaOAuthStateError("has already been used");
  }

  // Expired
  if (new Date(stateRow.expires_at) < new Date()) {
    throw new MetaOAuthStateError("has expired");
  }

  // Must match the authenticated user + workspace
  if (stateRow.user_id !== ctx.userId || stateRow.workspace_id !== ctx.workspaceId) {
    throw new MetaOAuthStateError("does not match the current user");
  }

  // Mark as used (single-use enforcement)
  const { error: updateErr } = await supabase
    .from("meta_oauth_states")
    .update({ used_at: new Date().toISOString() })
    .eq("id", stateRow.id);

  if (updateErr) {
    // If the update fails (e.g., race condition), the state might be reused.
    // Fail safely — reject the exchange.
    throw new MetaOAuthStateError("could not be marked as used");
  }

  return { workspaceId: stateRow.workspace_id, userId: stateRow.user_id };
}

// Exchange the authorization code for a user access token, get a long-lived
// token, fetch the user's profile, and store the encrypted connection.
// Returns the list of available Facebook Pages.
export async function exchangeCodeAndConnect(code, state, ctx) {
  // 1. Validate and consume the state
  await consumeState(state, ctx);

  // 2. Exchange the code server-side (App Secret never reaches frontend)
  const redirectUri = _redirectUri();
  let tokenResponse;
  try {
    tokenResponse = await exchangeCodeForToken(code, redirectUri);
  } catch (e) {
    if (e instanceof MetaError) throw e;
    throw new MetaOAuthExchangeError(e.message);
  }

  if (!tokenResponse?.access_token) {
    throw new MetaOAuthExchangeError("No access token in Meta response.");
  }

  // 3. Exchange for a long-lived user token (60 days)
  let longLivedToken = tokenResponse.access_token;
  try {
    const longLived = await getLongLivedUserToken(tokenResponse.access_token);
    if (longLived?.access_token) {
      longLivedToken = longLived.access_token;
    }
  } catch {
    // Short-lived token is still usable — continue
  }

  // 4. Get the user's Meta profile
  let metaUser = { id: "", name: "" };
  try {
    metaUser = await getUserProfile(longLivedToken);
  } catch {
    // Continue even if profile fetch fails
  }

  // 5. Store the encrypted connection (upsert — one connection per workspace)
  const encryptedToken = encryptToken(longLivedToken);
  const tokenExpiresAt = tokenResponse.expires_in
    ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
    : null;

  const { error: upsertErr } = await supabase
    .from("meta_connections")
    .upsert(
      {
        workspace_id: ctx.workspaceId,
        user_id: ctx.userId,
        meta_user_id: metaUser.id || "",
        meta_user_name: metaUser.name || "",
        encrypted_user_token: encryptedToken,
        token_expires_at: tokenExpiresAt,
        status: "connected",
        last_error_category: null,
        last_validated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );

  if (upsertErr) {
    throw new MetaError("Failed to store Meta connection.", "OAUTH_EXCHANGE", { details: upsertErr.message });
  }

  // 6. List available pages using the stored user token
  const pages = await listUserPages(longLivedToken);

  return {
    pages: pages.map((p) => ({
      id: p.id,
      name: p.name,
      picture: p.picture?.data?.url || "",
      link: p.link || "",
      has_token: Boolean(p.access_token),
    })),
  };
}