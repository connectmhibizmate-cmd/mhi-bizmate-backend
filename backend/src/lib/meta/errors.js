// MHI BizMate — Meta Connector: Normalized error types.
//
// Every Meta API failure is categorized so the connector can decide retry
// strategy without leaking App Secret, tokens, or internal details to the
// frontend or AI layer.
//
// Error categories:
//   NOT_CONFIGURED   — Meta env vars absent (App ID/Secret/Verify Token)
//   OAUTH_STATE      — invalid/expired/used OAuth state
//   OAUTH_DENIED     — user denied the OAuth authorization
//   OAUTH_EXCHANGE   — authorization code exchange failed
//   TOKEN_INVALID    — token expired or revoked
//   TOKEN_PERMISSION — token lacks required permissions
//   API_TIMEOUT       — Meta Graph API timed out
//   API_RATE_LIMIT   — Meta rate-limited the request
//   API_ERROR         — Meta returned an error response
//   SIGNATURE_INVALID— webhook signature verification failed
//   WEBHOOK_MALFORMED — webhook payload could not be parsed
//   UNKNOWN_PAGE      — event belongs to a page not connected to any workspace
//   INACTIVE_PAGE     — event belongs to a page that is no longer active
//   REPLY_FAILED      — could not send reply to Meta
//   UNKNOWN           — uncategorized

import { ApiError } from "../errors.js";

export class MetaError extends ApiError {
  constructor(message, category, { status = 502, details = null } = {}) {
    super(message, status, `META_${category}`, details);
    this.name = "MetaError";
    this.category = category;
  }
}

export class MetaNotConfiguredError extends MetaError {
  constructor(missing) {
    super("Meta integration is not configured.", "NOT_CONFIGURED", { status: 503, details: { missing } });
  }
}

export class MetaOAuthStateError extends MetaError {
  constructor(reason) {
    super(`OAuth state ${reason}.`, "OAUTH_STATE", { status: 400 });
  }
}

export class MetaOAuthDeniedError extends MetaError {
  constructor() {
    super("Facebook authorization was denied.", "OAUTH_DENIED", { status: 400 });
  }
}

export class MetaOAuthExchangeError extends MetaError {
  constructor(detail) {
    super("Failed to exchange authorization code with Meta.", "OAUTH_EXCHANGE", { details: detail });
  }
}

export class MetaTokenInvalidError extends MetaError {
  constructor() {
    super("Facebook connection token is invalid or expired. Please reconnect.", "TOKEN_INVALID", { status: 401 });
  }
}

export class MetaApiTimeoutError extends MetaError {
  constructor() {
    super("Facebook API request timed out.", "API_TIMEOUT", { status: 504 });
  }
}

export class MetaApiRateLimitError extends MetaError {
  constructor() {
    super("Facebook API rate limit exceeded.", "API_RATE_LIMIT", { status: 429 });
  }
}

export class MetaApiError extends MetaError {
  constructor(message, status, detail) {
    super(message || "Facebook API error.", "API_ERROR", { status: status || 502, details: detail });
  }
}

export class MetaSignatureInvalidError extends MetaError {
  constructor() {
    super("Webhook signature verification failed.", "SIGNATURE_INVALID", { status: 401 });
  }
}

export class MetaWebhookMalformedError extends MetaError {
  constructor(detail) {
    super("Malformed webhook payload.", "WEBHOOK_MALFORMED", { status: 400, details: detail });
  }
}

export class MetaUnknownPageError extends MetaError {
  constructor(pageId) {
    super("Event belongs to a page not connected to any workspace.", "UNKNOWN_PAGE", { status: 200 });
    this.pageId = pageId;
  }
}

export class MetaInactivePageError extends MetaError {
  constructor(pageId) {
    super("Event belongs to a page that is no longer active.", "INACTIVE_PAGE", { status: 200 });
    this.pageId = pageId;
  }
}

export class MetaReplyFailedError extends MetaError {
  constructor(detail) {
    super("Failed to send reply to Facebook.", "REPLY_FAILED", { details: detail });
  }
}