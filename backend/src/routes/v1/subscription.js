// MHI BizMate — Subscription API routes.
//
// Read-only for clients. The backend is the sole authority for trial/subscription
// state. There is NO client endpoint to start, extend, or modify a trial or
// subscription — those happen server-side (payment webhook / admin action).
//
// Routes:
//   GET  /api/v1/subscription/status   — current workspace subscription state
//   POST /api/v1/subscription/upgrade — not available until a payment provider
//                                        is configured (returns 501, never fakes)

import { Router } from "express";
import { ENTITLEMENT_MODE, AdProvider } from "../../lib/entitlement.js";

export const subscriptionRouter = Router();

// GET /status — V1 FREEMIUM snapshot for the frontend.
// No trial, no paid subscription, no payment provider. The frontend uses this
// to render the Freemium / Ad-supported state honestly.
subscriptionRouter.get("/status", async (req, res) => {
  res.json({
    data: {
      model: "FREEMIUM",
      status: "FREEMIUM",
      entitlements: { active: true, ai: true, coreBusiness: true },
      adSupported: {
        enabled: false,
        providerConfigured: AdProvider.configured,
      },
      paymentProviderConfigured: false,
      // Legacy fields kept non-authoritative so any older UI does not break.
      effective_plan: "FREEMIUM",
      remaining_trial_days: 0,
      ai_quota_total: 0,
      trial_end_at: null,
      subscription_end_at: null,
      payment_status: "NONE",
    },
  });
});

// POST /upgrade — V1 runs on FREEMIUM + Ad-supported. Paid subscriptions are a
// future capability and are NOT available now. This never fakes a payment or
// activation.
subscriptionRouter.post("/upgrade", async (req, res) => {
  return res.status(501).json({
    error: "MHI BizMate is currently Freemium. Paid subscriptions are not available yet.",
    code: "PAID_SUBSCRIPTION_NOT_AVAILABLE",
  });
});