// MHI BizMate — Backend URL configuration.
//
// Base44's build pipeline does NOT inject .env variables into the frontend
// bundle, so VITE_BACKEND_URL cannot be used. Instead, the backend URL is
// embedded here directly (same pattern as supabaseClient.js).
//
// WHEN EMPTY: the app runs in offline/preview mode (stubs return empty data).
// WHEN SET:   the app routes all business operations through the live
//             Heart of BizMate backend API.
//
// To enable: deploy the backend (see backend/DEPLOYMENT.md), then replace
// the empty string below with the deployed URL.
//   Example: "https://mhi-bizmate-backend.onrender.com"
export const BACKEND_URL = "";

export const API_BASE_URL = BACKEND_URL;
export const HAS_BACKEND = Boolean(BACKEND_URL);