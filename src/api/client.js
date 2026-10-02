// MHI BizMate — Frontend API client stub (Backend Reset)
//
// The backend reset removed all backend drivers (Base44 SDK, Supabase, Edge
// Functions, professional HTTP backend). This module keeps the same exported
// names so service-module imports resolve, but every transport is inert and
// rejects with a clear "not connected" error if ever called. In practice the
// service modules have been replaced with offline stubs, so these transports
// are never reached.
//
// SECURITY: No secrets, no service-role keys, no Meta/AI/payment credentials
// live here. The frontend never receives sensitive credentials.

// Backend URL configuration — embedded directly (Base44 build pipeline does not
// inject .env into the frontend bundle). See src/api/backendConfig.js.
import { BACKEND_URL, HAS_BACKEND } from "./backendConfig";

export const API_BASE_URL = BACKEND_URL;
export { BACKEND_URL, HAS_BACKEND };
export const API_DRIVER = HAS_BACKEND ? "backend" : "offline";
export const FUNCTIONS_URL = BACKEND_URL ? `${BACKEND_URL}/functions` : "";
export const USE_EDGE_FUNCTIONS = HAS_BACKEND;

export const base44 = null;

const TOKEN_KEY = "mhi_api_token";
export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

// Step 2: resolve the current Supabase access token to attach as a Bearer header
// to Heart of BizMate API requests. The token is the Supabase session JWT; the
// backend validates it server-side. No service-role key ever reaches the browser.
let supabaseResolver = null;
export function setAccessTokenResolver(fn) { supabaseResolver = fn; }
export async function getAccessToken() {
  try {
    if (typeof supabaseResolver === "function") return await supabaseResolver();
    return tokenStore.get();
  } catch {
    return null;
  }
}
async function authHeaders() {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function notConnected() {
  const err = new Error("Backend is not connected. The backend was reset and is pending rebuild.");
  err.code = "BACKEND_NOT_CONNECTED";
  return err;
}

export async function edgeInvoke() { throw notConnected(); }

// When HAS_BACKEND is true, httpApi routes through the secure backend with the
// authenticated session token. When offline (no VITE_BACKEND_URL), it rejects so
// the offline stubs remain the source of data and no unauthenticated call leaks.
export const httpApi = {
  get:  (url, opts) => HAS_BACKEND ? fetchJson("GET",  url, opts) : Promise.reject(notConnected()),
  post: (url, body, opts) => HAS_BACKEND ? fetchJson("POST", url, opts, body) : Promise.reject(notConnected()),
  patch:(url, body, opts) => HAS_BACKEND ? fetchJson("PATCH",url, opts, body) : Promise.reject(notConnected()),
  delete: (url, opts) => HAS_BACKEND ? fetchJson("DELETE", url, opts) : Promise.reject(notConnected()),
};

async function fetchJson(method, url, opts, body) {
  const headers = { "Content-Type": "application/json", ...(await authHeaders()), ...(opts?.headers || {}) };
  const res = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...opts,
  });
  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) {
    const err = new Error(payload?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = payload?.code || `HTTP_${res.status}`;
    throw err;
  }
  return payload?.data !== undefined ? payload.data : payload;
}

export function backendCrud() {
  return {
    list: () => Promise.resolve([]),
    filter: () => Promise.resolve([]),
    get: () => Promise.resolve(null),
    create: () => Promise.resolve(null),
    update: () => Promise.resolve(null),
    remove: () => Promise.resolve(),
    removeMany: () => Promise.resolve(),
    bulkUpdate: (r) => Promise.resolve(r || []),
  };
}

export async function httpUpload() { throw notConnected(); }
export const backendCall = () => Promise.reject(notConnected());
export async function invoke() { throw notConnected(); }