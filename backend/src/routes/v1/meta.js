// MHI BizMate — Meta Connector API routes (authenticated).
//
// These routes are used by the frontend Facebook Connection UI. All require
// authentication (inherited from v1Router). No tokens, secrets, or encrypted
// values are ever returned to the frontend.
//
// Routes:
//   GET  /api/v1/meta/status       — connection status (safe for frontend)
//   POST /api/v1/meta/oauth-url    — generate OAuth authorization URL
//   POST /api/v1/meta/exchange     — exchange OAuth code (server-side)
//   POST /api/v1/meta/connect      — select and connect a page
//   POST /api/v1/meta/disconnect   — disconnect the active page
//   POST /api/v1/meta/change-page  — change the active page
//   POST /api/v1/meta/reconnect    — mark connection for reconnect
//   GET  /api/v1/meta/health       — connection health check

import { Router } from "express";
import {
  generateOAuthUrl,
  exchangeCodeAndConnect,
  connectPage,
  disconnectPage,
  changePage,
  reconnectPage,
  getConnectionStatus,
  getConnectionHealth,
} from "../../lib/meta/index.js";
import { MetaError, MetaOAuthDeniedError } from "../../lib/meta/errors.js";
import { ValidationError } from "../../lib/errors.js";

export const metaRouter = Router();

// GET /api/v1/meta/status — safe connection status for the frontend.
metaRouter.get("/status", async (req, res, next) => {
  try {
    const status = await getConnectionStatus(req.ctx);
    res.json({ data: status });
  } catch (e) { next(e); }
});

// POST /api/v1/meta/oauth-url — generate the OAuth authorization URL.
// The frontend redirects the user to this URL to start the OAuth flow.
metaRouter.post("/oauth-url", async (req, res, next) => {
  try {
    const result = await generateOAuthUrl(req.ctx);
    res.json({ data: { url: result.url } });
  } catch (e) { next(e); }
});

// POST /api/v1/meta/exchange — exchange the OAuth code for a user token.
// Body: { code, state }
// The state is validated server-side (CSRF protection, single-use, expiry).
// The code is exchanged server-side (App Secret never reaches frontend).
metaRouter.post("/exchange", async (req, res, next) => {
  try {
    const { code, state } = req.body || {};
    if (!code) throw new ValidationError("Authorization code is required.");
    if (!state) throw new ValidationError("OAuth state is required.");

    const result = await exchangeCodeAndConnect(code, state, req.ctx);
    res.json({ data: { pages: result.pages } });
  } catch (e) {
    // Map OAuth denial to a user-friendly error
    if (e instanceof MetaOAuthDeniedError) {
      return res.status(400).json({ error: "Facebook authorization was cancelled.", code: "META_OAUTH_DENIED" });
    }
    next(e);
  }
});

// POST /api/v1/meta/connect — select and connect a Facebook Page.
// Body: { page_id }
metaRouter.post("/connect", async (req, res, next) => {
  try {
    const { page_id } = req.body || {};
    if (!page_id) throw new ValidationError("Page ID is required.");
    const result = await connectPage(req.ctx, page_id);
    res.json({ data: result });
  } catch (e) { next(e); }
});

// POST /api/v1/meta/disconnect — disconnect the active page.
metaRouter.post("/disconnect", async (req, res, next) => {
  try {
    const result = await disconnectPage(req.ctx);
    res.json({ data: result });
  } catch (e) { next(e); }
});

// POST /api/v1/meta/change-page — change the active page.
// Body: { page_id }
metaRouter.post("/change-page", async (req, res, next) => {
  try {
    const { page_id } = req.body || {};
    if (!page_id) throw new ValidationError("Page ID is required.");
    const result = await changePage(req.ctx, page_id);
    res.json({ data: result });
  } catch (e) { next(e); }
});

// POST /api/v1/meta/reconnect — mark connection for reconnect.
metaRouter.post("/reconnect", async (req, res, next) => {
  try {
    const result = await reconnectPage(req.ctx);
    res.json({ data: result });
  } catch (e) { next(e); }
});

// GET /api/v1/meta/health — connection health check.
metaRouter.get("/health", async (req, res, next) => {
  try {
    const health = await getConnectionHealth(req.ctx);
    res.json({ data: health });
  } catch (e) { next(e); }
});