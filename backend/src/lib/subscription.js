// MHI BizMate — Subscription & Trial (RESERVED for future PAID_SUBSCRIPTION mode).
//
// NOTE: This module is ISOLATED in V1. The current V1 model is FREEMIUM +
// Ad-supported (see ./entitlement.js). This file is kept for future reuse when
// a paid subscription tier is introduced — it is NOT imported by any active V1
// route. Do not delete.
//
// (Original V1-trial design — not active:)
//
// The backend is the ONLY authority for trial dates, subscription status, and
// entitlement. The frontend never supplies or modifies these values. A
// workspace_subscriptions row is auto-created (DB trigger) when a workspace is
// created; getOrCreateSubscription() is a lazy fallback for workspaces that
// pre-date the trigger.
//
// States: TRIALING | ACTIVE | EXPIRED | CANCELLED | PAST_DUE.
// V1 actively uses TRIALING, ACTIVE, EXPIRED. CANCELLED/PAST_DUE are reserved
// for the future payment provider.
//
// SECURITY:
//   - All reads/writes use the service-role Supabase client (bypasses RLS).
//   - Clients can only READ their own workspace subscription (RLS); they can
//     never start, extend, or modify it through the API.
//   - No payment secrets live here. The payment provider is an abstraction
//     (see PaymentProvider contract below) and is NOT yet configured.

import { supabase } from "./supabaseClient.js";
import { ForbiddenError } from "./errors.js";

export const TRIAL_DAYS = 14;
const ACTIVE_STATES = new Set(["TRIALING", "ACTIVE"]);

// ---- Payment provider abstraction (NOT configured in V1) ----
// A future provider implements: createCheckout, verifyPayment, handleWebhook,
// cancelSubscription, getSubscription. The business core talks to this
// interface only, so a provider can be plugged in without rebuilding
// subscription logic. No provider is wired yet — upgrade() reports this.
export const PaymentProvider = {
  configured: false,
  name: null,
};

// Get this workspace's subscription row, lazily creating a 14-day trial if no
// row exists yet (defensive; the DB trigger normally creates it).
export async function getOrCreateSubscription(ctx) {
  const { data: existing } = await supabase
    .from("workspace_subscriptions")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();
  if (existing) return existing;

  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const { data: created, error } = await supabase
    .from("workspace_subscriptions")
    .insert({
      workspace_id: ctx.workspaceId,
      status: "TRIALING",
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
    })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to initialize subscription: ${error.message}`);
  return created;
}

// Compute the effective status from the stored row + current time, without
// mutating the DB. A TRIALING row past trial_end is effectively EXPIRED; an
// ACTIVE row past subscription_end is effectively EXPIRED.
export function computeEffectiveStatus(sub) {
  if (!sub) return "EXPIRED";
  const now = Date.now();
  if (sub.status === "TRIALING" && new Date(sub.trial_end).getTime() <= now) {
    return "EXPIRED";
  }
  if (sub.status === "ACTIVE" && sub.subscription_end && new Date(sub.subscription_end).getTime() <= now) {
    return "EXPIRED";
  }
  return sub.status;
}

// Full status snapshot for the frontend subscription API.
export async function getStatus(ctx) {
  const sub = await getOrCreateSubscription(ctx);
  const status = computeEffectiveStatus(sub);
  const now = Date.now();
  const trialEndMs = new Date(sub.trial_end).getTime();
  const daysRemaining = Math.max(
    0,
    Math.ceil((trialEndMs - now) / (24 * 60 * 60 * 1000))
  );

  return {
    // ---- Clean V1 shape (authoritative) ----
    status, // TRIALING | ACTIVE | EXPIRED
    trial: {
      start: sub.trial_start,
      end: sub.trial_end,
      daysRemaining,
    },
    subscription: {
      plan: sub.plan || null,
      start: sub.subscription_start || null,
      end: sub.subscription_end || null,
      provider: sub.provider || null,
    },
    entitlements: {
      active: ACTIVE_STATES.has(status),
      ai: ACTIVE_STATES.has(status),
      coreBusiness: ACTIVE_STATES.has(status),
    },
    paymentProviderConfigured: PaymentProvider.configured,

    // ---- Backward-compatible fields for the existing UI (non-authoritative) ----
    // These let the locked Subscription UI render without redesign. The clean
    // fields above are the source of truth; these are derived views.
    effective_plan: status === "TRIALING" ? "TRIAL" : (sub.plan || null),
    remaining_trial_days: status === "TRIALING" ? daysRemaining : 0,
    ai_quota_total: 1200,
    trial_end_at: sub.trial_end,
    subscription_end_at: sub.subscription_end || null,
    payment_status: "NONE",
  };
}

// Entitlement check used by the middleware and by routes that need to verify
// access without a full status snapshot.
export async function checkEntitlement(ctx) {
  const sub = await getOrCreateSubscription(ctx);
  const status = computeEffectiveStatus(sub);
  return { allowed: ACTIVE_STATES.has(status), status };
}

// Express middleware: protects V1 business operations that require an active
// trial or subscription. Use on specific write/execution routes only — never
// on auth, subscription status, admin, or read-only list endpoints.
export async function requireEntitlement(req, res, next) {
  try {
    const { allowed, status } = await checkEntitlement(req.ctx);
    if (!allowed) {
      return res.status(402).json({
        error: "Your trial has ended. Subscribe to continue using this feature.",
        code: "SUBSCRIPTION_EXPIRED",
        status,
      });
    }
    next();
  } catch (e) {
    return res.status(500).json({ error: "Could not verify subscription.", code: "SUBSCRIPTION_CHECK_FAILED" });
  }
}

// ---- Server-side subscription lifecycle (called only by the backend) ----
// These are intentionally NOT exposed as client-writable endpoints. A future
// payment webhook / admin action will call them with the service role.

export async function activateSubscription(ctx, { plan, provider, providerReference, subscriptionEnd }) {
  const { data, error } = await supabase
    .from("workspace_subscriptions")
    .update({
      status: "ACTIVE",
      plan,
      provider,
      provider_reference: providerReference,
      subscription_start: new Date().toISOString(),
      subscription_end: subscriptionEnd || null,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", ctx.workspaceId)
    .select("*")
    .single();
  if (error) throw new Error(`Failed to activate subscription: ${error.message}`);
  return data;
}

// Mark a workspace's subscription expired (e.g. on webhook cancellation or
// post-trial sweep). Server-side only.
export async function markExpired(ctx) {
  const { data, error } = await supabase
    .from("workspace_subscriptions")
    .update({ status: "EXPIRED", updated_at: new Date().toISOString() })
    .eq("workspace_id", ctx.workspaceId)
    .select("*")
    .single();
  if (error) throw new Error(`Failed to mark subscription expired: ${error.message}`);
  return data;
}

// Guard: prevent a client from modifying subscription fields directly. Any
// client-facing route that accidentally tries to write subscription state must
// fail closed.
export function assertServerSide(ctx) {
  if (ctx?.userId) {
    throw new ForbiddenError("Subscription state can only be changed server-side.");
  }
}