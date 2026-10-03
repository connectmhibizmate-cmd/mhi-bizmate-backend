// MHI BizMate — Meta Connector: Graph API client.
//
// A thin, fetch-based client for the Meta Graph API. No external dependencies
// — uses Node.js built-in fetch (Node 18+). All requests are server-side.
//
// SECURITY:
//   - App Secret is NEVER sent in request bodies or URLs. It is used only
//     to construct the appsecret_proof (HMAC-SHA256) for token-secured calls.
//   - Page Access Tokens are passed only to Meta's Graph API, never logged.
//   - Timeouts and error normalization happen here — callers receive
//     categorized MetaError instances, never raw fetch errors.
//   - No token, secret, or credential is included in error messages or logs.

import crypto from "node:crypto";
import {
  MetaApiError,
  MetaApiTimeoutError,
  MetaApiRateLimitError,
  MetaNotConfiguredError,
} from "./errors.js";

const DEFAULT_TIMEOUT = 15000;
const GRAPH_BASE = "https://graph.facebook.com";

function _graphVersion() {
  return process.env.META_GRAPH_API_VERSION?.trim() || "v20.0";
}

function _appSecret() {
  return process.env.META_APP_SECRET?.trim() || "";
}

// Construct the appsecret_proof for a token-secured Graph API call.
// Meta requires this when App Secret is configured — it prevents token
// replay by attackers who might intercept the access token.
function _appsecretProof(accessToken) {
  const secret = _appSecret();
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(accessToken).digest("hex");
}

// Internal: perform a Graph API call with timeout.
async function _graphFetch(path, params, { method = "GET", timeout = DEFAULT_TIMEOUT } = {}) {
  const url = new URL(`${GRAPH_BASE}/${_graphVersion()}${path}`);

  // Add all params to URL (GET) or body (POST)
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  let body;
  let fetchOptions = { method, signal: null, headers: {} };

  if (method === "GET") {
    url.search = searchParams.toString();
  } else {
    fetchOptions.headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = searchParams.toString();
    fetchOptions.body = body;
  }

  // Timeout via AbortController
  const controller = new AbortController();
  fetchOptions.signal = controller.signal;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url.toString(), fetchOptions);
    let payload = null;
    try {
      payload = await res.json();
    } catch {
      // Non-JSON response
    }

    if (!res.ok || payload?.error) {
      return _normalizeGraphError(res.status, payload?.error || {});
    }

    return payload;
  } catch (e) {
    if (e.name === "AbortError") {
      throw new MetaApiTimeoutError();
    }
    if (e instanceof MetaApiError) throw e;
    throw new MetaApiError("Facebook API request failed.", 502, { message: e.message });
  } finally {
    clearTimeout(timer);
  }
}

// Normalize a Graph API error into a categorized MetaError.
function _normalizeGraphError(status, error) {
  const code = error.code || status;
  const message = error.message || "Facebook API error.";
  const subcode = error.error_subcode;

  // Rate limit
  if (code === 4 || code === 17 || code === 32 || code === 613) {
    throw new MetaApiRateLimitError();
  }

  // Token expired/invalid
  if (code === 190 || subcode === 463 || subcode === 467) {
    const err = new MetaApiError(message, 401, error);
    err.category = "TOKEN_INVALID";
    throw err;
  }

  // Permission errors
  if (code === 10 || code === 200 || code === 2500) {
    const err = new MetaApiError(message, 403, error);
    err.category = "TOKEN_PERMISSION";
    throw err;
  }

  throw new MetaApiError(message, status, error);
}

// ---- Public API ----

// Exchange an OAuth authorization code for a user access token.
export async function exchangeCodeForToken(code, redirectUri) {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = _appSecret();
  if (!appId || !appSecret) {
    throw new MetaNotConfiguredError(["META_APP_ID", "META_APP_SECRET"].filter((n) => !process.env[n]?.trim()));
  }

  return _graphFetch("/oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
}

// Get long-lived user access token from a short-lived one.
export async function getLongLivedUserToken(shortLivedToken) {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = _appSecret();
  if (!appId || !appSecret) throw new MetaNotConfiguredError([]);

  return _graphFetch("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
}

// List Facebook Pages available to the user token.
export async function listUserPages(userAccessToken) {
  const proof = _appsecretProof(userAccessToken);
  const params = {
    access_token: userAccessToken,
    fields: "id,name,access_token,picture{url},link",
    limit: 100,
  };
  if (proof) params.appsecret_proof = proof;

  const result = await _graphFetch("/me/accounts", params);
  return result?.data || [];
}

// Get the Facebook user's profile (id, name).
export async function getUserProfile(userAccessToken) {
  const proof = _appsecretProof(userAccessToken);
  const params = { access_token: userAccessToken, fields: "id,name" };
  if (proof) params.appsecret_proof = proof;

  return _graphFetch("/me", params);
}

// Validate that a page access token is still valid by making a lightweight
// Graph API call. Returns { valid: boolean, pageName?: string }.
export async function validatePageToken(pageId, pageAccessToken) {
  const proof = _appsecretProof(pageAccessToken);
  const params = { access_token: pageAccessToken, fields: "id,name" };
  if (proof) params.appsecret_proof = proof;

  try {
    const result = await _graphFetch(`/${pageId}`, params);
    return { valid: true, pageName: result?.name || "" };
  } catch (e) {
    if (e.category === "TOKEN_INVALID" || e.category === "TOKEN_PERMISSION") {
      return { valid: false, errorCategory: e.category };
    }
    // Network/timeout errors don't mean the token is invalid — don't disconnect
    return { valid: true, errorCategory: e.category };
  }
}

// Send a comment reply on a Facebook Page post.
// POST /{comment-id}/replies
export async function sendCommentReply(commentId, message, pageAccessToken) {
  const proof = _appsecretProof(pageAccessToken);
  const params = { message, access_token: pageAccessToken };
  if (proof) params.appsecret_proof = proof;

  return _graphFetch(`/${commentId}/replies`, params, { method: "POST" });
}

// Send a private reply to a comment (inbox message).
// POST /{comment-id}/private_replies
export async function sendPrivateReply(commentId, message, pageAccessToken) {
  const proof = _appsecretProof(pageAccessToken);
  const params = { message, access_token: pageAccessToken };
  if (proof) params.appsecret_proof = proof;

  return _graphFetch(`/${commentId}/private_replies`, params, { method: "POST" });
}

// Send a Messenger message to a user.
// POST /{page-id}/messages with recipient={id: <user-psid>}
export async function sendMessengerMessage(pageId, recipientPsId, message, pageAccessToken) {
  const proof = _appsecretProof(pageAccessToken);
  const params = {
    recipient: JSON.stringify({ id: recipientPsId }),
    messaging_type: "RESPONSE",
    message: JSON.stringify({ text: message }),
    access_token: pageAccessToken,
  };
  if (proof) params.appsecret_proof = proof;

  return _graphFetch(`/${pageId}/messages`, params, { method: "POST" });
}

// Get a Facebook user's profile (name) from the Page-scoped ID (PSID).
export async function getMessengerProfile(psid, pageAccessToken) {
  const proof = _appsecretProof(pageAccessToken);
  const params = {
    access_token: pageAccessToken,
    fields: "first_name,last_name,profile_pic",
  };
  if (proof) params.appsecret_proof = proof;

  try {
    return await _graphFetch(`/${psid}`, params);
  } catch {
    return { first_name: "", last_name: "" };
  }
}