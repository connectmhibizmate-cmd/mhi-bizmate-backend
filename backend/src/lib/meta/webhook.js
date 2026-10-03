// MHI BizMate — Meta Connector: Webhook verification + signature validation.
//
// Implements:
//   1. verifyChallenge — the GET webhook verification (Meta sends a challenge).
//   2. verifySignature — the POST webhook signature check (X-Hub-Signature-256).
//
// SECURITY:
//   - The verify token is a backend-only secret (META_VERIFY_TOKEN).
//   - Signature is computed over the RAW request body using the App Secret
//     (HMAC-SHA256). The raw body must be captured BEFORE JSON parsing.
//   - Invalid signatures are rejected with 401 — no event processing occurs.
//   - The App Secret is NEVER logged or exposed.

import crypto from "node:crypto";
import { MetaSignatureInvalidError, MetaWebhookMalformedError, MetaNotConfiguredError } from "./errors.js";

// GET webhook verification: Meta sends hub.mode, hub.challenge, hub.verify_token.
// We validate the verify token and return the challenge.
export function verifyChallenge(query) {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];

  const expectedToken = process.env.META_VERIFY_TOKEN?.trim();
  if (!expectedToken) {
    throw new MetaNotConfiguredError(["META_VERIFY_TOKEN"]);
  }

  if (mode !== "subscribe" || token !== expectedToken) {
    return { valid: false, challenge: null };
  }

  if (!challenge) {
    throw new MetaWebhookMalformedError("Missing hub.challenge");
  }

  return { valid: true, challenge };
}

// POST webhook signature verification: validates X-Hub-Signature-256 against
// the raw body using the App Secret.
export function verifySignature(rawBody, signatureHeader) {
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appSecret) {
    throw new MetaNotConfiguredError(["META_APP_SECRET"]);
  }

  if (!signatureHeader) {
    throw new MetaSignatureInvalidError();
  }

  // Expected format: "sha256=<hex>"
  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    throw new MetaSignatureInvalidError();
  }

  const expected = parts[1];
  const computed = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  // Timing-safe comparison to prevent timing attacks
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(expected, "hex");

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new MetaSignatureInvalidError();
  }

  return true;
}

// Parse the raw webhook body (Buffer) as JSON. Throws on malformed JSON.
export function parseWebhookBody(rawBody) {
  try {
    if (typeof rawBody === "string") return JSON.parse(rawBody);
    return JSON.parse(rawBody.toString("utf8"));
  } catch (e) {
    throw new MetaWebhookMalformedError(e.message);
  }
}