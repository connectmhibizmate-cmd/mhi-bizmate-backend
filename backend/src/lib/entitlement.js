// MHI BizMate — Entitlement & Ad-Reward abstraction (provider-independent).
//
// V1 MODEL: FREEMIUM + AD-SUPPORTED.
//   - No trial, no paid subscription, no payment provider.
//   - All core features are free (entitlement always granted).
//   - Ad-supported gating is a FUTURE capability: the interface is defined here
//     but NO ad provider is connected, and NO ad completion is ever faked.
//
// This layer keeps the Heart of BizMate and the AI Gateway independent of the
// monetization backend. Switching V1 to PAID_SUBSCRIPTION or AD_SUPPORTED later
// only changes this module — no business logic needs to change.
//
// SECURITY (when an ad provider is connected in the future):
//   - A frontend boolean like `adWatched=true` is NEVER trusted.
//   - Ad completion is verified server-side via the provider's server-to-server
//     callback / reward token.
//   - Rewards are idempotent (one reward per impression/user/workspace) and
//     workspace-scoped (no cross-workspace reward claims).
//   - Ad provider secrets never reach the frontend.
//
// WHAT IS REQUIRED LATER (when a real ad provider is selected):
//   1. Implement AdProvider.{isAdAvailable, verifyCompletion, requestReward}
//      against the provider's S2S reward API.
//   2. Add an `ad_rewards` table (workspace_id, impression_id, placement,
//      granted_at) with a unique constraint on (workspace_id, impression_id)
//      to enforce idempotency and prevent duplicate claims.
//   3. Flip ENTITLEMENT_MODE to "AD_SUPPORTED" and implement the AD_SUPPORTED
//     branch in checkEntitlement to require a verified, unclaimed reward.

export const ENTITLEMENT_MODE = "FREEMIUM"; // FREEMIUM | AD_SUPPORTED | PAID_SUBSCRIPTION

// ---- Ad Provider interface (NOT connected in V1) ----
// When a real ad provider is selected (e.g. AdMob, Meta Audience Network,
// Unity Ads), implement these methods against the provider's S2S reward API.
// Until then every method honestly reports "not available / not verified".
export const AdProvider = {
  configured: false,
  providerId: null,

  // Whether an ad is currently available for a placement/user.
  async isAdAvailable(_ctx, _placement) {
    return false;
  },

  // Verify a server-to-server ad completion callback / reward token.
  // Returns { verified: boolean, impressionId?: string }.
  // NEVER trust a client-supplied "adWatched" boolean.
  async verifyCompletion(_ctx, { impressionId, rewardToken } = {}) {
    return { verified: false, impressionId: impressionId || null };
  },

  // Record an ad reward grant (idempotent, workspace-scoped).
  // Not implemented until a provider + ad_rewards table exist.
  async grantReward(_ctx, { impressionId, placement } = {}) {
    return { granted: false, reason: "AD_PROVIDER_NOT_CONFIGURED" };
  },
};

// ---- Entitlement check ----
// FREEMIUM: all features are allowed. No trial, no subscription, no ad reward
// required. This is the V1 behavior.
// AD_SUPPORTED (future): would call AdProvider.verifyCompletion + an idempotent
//   reward lookup before granting.
// PAID_SUBSCRIPTION (future): would call the subscription module's
//   checkEntitlement (see ./subscription.js) before granting.
export async function checkEntitlement(ctx, feature) {
  if (ENTITLEMENT_MODE === "FREEMIUM") {
    return { allowed: true, mode: "FREEMIUM" };
  }
  // Future modes are intentionally not active in V1. They will be implemented
  // when a payment provider or ad provider is connected. Until then, default
  // to freemium (allow) so no user is ever locked out.
  return { allowed: true, mode: "FREEMIUM" };
}

// Express middleware: passes through in FREEMIUM mode (V1). In future modes it
// would reject with 402 ENTITLEMENT_REQUIRED. Keeping this hook on specific
// write/execution routes lets us switch models later without touching the
// Heart of BizMate or the AI Gateway.
export async function requireEntitlement(req, res, next) {
  try {
    const result = await checkEntitlement(req.ctx, "default");
    if (!result.allowed) {
      return res.status(402).json({
        error: "This feature requires an active entitlement.",
        code: "ENTITLEMENT_REQUIRED",
        details: result,
      });
    }
    req.entitlement = result;
    next();
  } catch (e) {
    next(e);
  }
}