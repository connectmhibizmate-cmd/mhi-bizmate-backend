// MHI BizMate — Meta Webhook routes (PUBLIC — no auth).
//
// These routes are called by Meta's servers. They do NOT use the auth
// middleware — they use Meta's webhook signature verification instead.
//
// Routes:
//   GET  /webhooks/meta  — webhook verification (Meta subscribes)
//   POST /webhooks/meta  — webhook event delivery
//
// SECURITY:
//   - GET: validates META_VERIFY_TOKEN, returns the challenge.
//   - POST: validates X-Hub-Signature-256 against the raw body using App Secret.
//   - Invalid signatures are rejected with 401.
//   - The raw body is captured BEFORE JSON parsing for signature verification.
//   - No token, secret, or credential is logged or exposed.

import express from "express";
import { verifyChallenge, verifySignature, parseWebhookBody, processWebhookPayload } from "../../lib/meta/index.js";
import { MetaError, MetaSignatureInvalidError, MetaWebhookMalformedError } from "../../lib/meta/errors.js";

export const metaWebhookRouter = express.Router();

// Raw body parser for webhook POST — captures the raw body as a Buffer for
// signature verification. This is applied ONLY to the POST route, not globally.
const rawBodyParser = express.raw({
  type: "application/json",
  limit: "1mb",
});

// GET /webhooks/meta — webhook verification.
// Meta sends hub.mode=subscribe, hub.verify_token=<token>, hub.challenge=<challenge>.
// We validate the verify token and return the challenge.
metaWebhookRouter.get("/meta", (req, res) => {
  try {
    const { valid, challenge } = verifyChallenge(req.query);
    if (!valid) {
      return res.status(403).json({ error: "Verification failed.", code: "META_VERIFY_FAILED" });
    }
    // Meta expects the challenge as plain text (200 status)
    return res.status(200).send(challenge);
  } catch (e) {
    if (e instanceof MetaError) {
      return res.status(e.status || 503).json({ error: e.message, code: e.code });
    }
    return res.status(500).json({ error: "Webhook verification failed.", code: "INTERNAL_ERROR" });
  }
});

// POST /webhooks/meta — webhook event delivery.
// The raw body is captured by express.raw() middleware for signature
// verification. The signature is verified BEFORE any event processing occurs.
metaWebhookRouter.post("/meta", rawBodyParser, (req, res) => {
  try {
    // 1. Get the raw body (Buffer from express.raw)
    const rawBody = req.body;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      throw new MetaWebhookMalformedError("Missing raw body.");
    }

    // 2. Verify the signature
    const signatureHeader = req.headers["x-hub-signature-256"];
    try {
      verifySignature(rawBody, signatureHeader);
    } catch (e) {
      if (e instanceof MetaSignatureInvalidError) {
        return res.status(401).json({ error: "Signature verification failed.", code: "META_SIGNATURE_INVALID" });
      }
      throw e;
    }

    // 3. Parse the raw body as JSON
    const payload = parseWebhookBody(rawBody);

    // 4. Process the webhook payload asynchronously.
    //    Meta expects a 200 response quickly — we process events in the
    //    background and respond immediately.
    //    IMPORTANT: We process synchronously here because Meta requires a
    //    200 within a reasonable timeout. If processing takes too long, Meta
    //    will retry the webhook (which is safe due to idempotency).
    processWebhookPayload(payload)
      .then((result) => {
        console.log(`[META] Webhook processed: ${result.processed} events`);
      })
      .catch((e) => {
        console.error("[META] Webhook processing error:", e.message);
      });

    // Respond 200 immediately — Meta requires quick acknowledgment.
    // Event processing continues in the background.
    return res.status(200).json({ received: true });
  } catch (e) {
    if (e instanceof MetaError) {
      return res.status(e.status || 400).json({ error: e.message, code: e.code });
    }
    console.error("[META] Webhook error:", e);
    return res.status(500).json({ error: "Webhook processing failed.", code: "INTERNAL_ERROR" });
  }
});