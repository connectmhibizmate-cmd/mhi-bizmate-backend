// MHI BizMate — AI Gateway: Normalized error types.
// Every AI operation failure is categorized so the Gateway can decide
// retry/fallback strategy without leaking provider-specific details to
// AI Employees or the frontend.
//
// Error categories:
//   NOT_CONFIGURED — provider credentials absent; not retryable
//   TIMEOUT        — provider did not respond in time; retryable
//   UNAVAILABLE    — provider returned 5xx/network error; retryable
//   MALFORMED      — provider returned unparseable output; not retryable
//   SCHEMA         — structured output failed schema validation; not retryable
//   RATE_LIMIT     — provider rate-limited the request; retryable with backoff
//   TOKEN_LIMIT    — request exceeded token budget; not retryable
//   BACKEND        — Heart/backend rejected the action; not retryable
//   UNKNOWN        — uncategorized; not retryable by default

export class AiError extends Error {
  constructor(message, category, { provider, cause, retryable = false, details } = {}) {
    super(message);
    this.name = "AiError";
    this.category = category;
    this.provider = provider || null;
    this.cause = cause || null;
    this.retryable = retryable;
    this.details = details || null;
  }
}

export class AiProviderNotConfiguredError extends AiError {
  constructor(provider) {
    super(`AI provider "${provider}" is not configured.`, "NOT_CONFIGURED", { provider, retryable: false });
  }
}

export class AiProviderTimeoutError extends AiError {
  constructor(provider, timeoutMs) {
    super(`AI provider "${provider}" timed out after ${timeoutMs}ms.`, "TIMEOUT", { provider, retryable: true });
  }
}

export class AiProviderUnavailableError extends AiError {
  constructor(provider, status, detail) {
    super(`AI provider "${provider}" is unavailable (HTTP ${status}).`, "UNAVAILABLE", { provider, retryable: true, details: detail });
  }
}

export class AiMalformedOutputError extends AiError {
  constructor(provider, detail) {
    super(`AI provider "${provider}" returned malformed output.`, "MALFORMED", { provider, retryable: false, details: detail });
  }
}

export class AiSchemaValidationError extends AiError {
  constructor(action, errors) {
    super(`AI structured output failed schema validation for action "${action}".`, "SCHEMA", { retryable: false, details: errors });
  }
}

export class AiRateLimitError extends AiError {
  constructor(provider) {
    super(`AI provider "${provider}" rate limit exceeded.`, "RATE_LIMIT", { provider, retryable: true });
  }
}

export class AiTokenLimitError extends AiError {
  constructor(provider, requested, limit) {
    super(`Token limit exceeded for provider "${provider}".`, "TOKEN_LIMIT", { provider, retryable: false, details: { requested, limit } });
  }
}

// AI employee attempted to propose an action it is not permitted to propose.
// This is a safety boundary — each employee has a fixed allowedActions set,
// and this error fires if the AI tries to exceed its role.
export class AiForbiddenActionError extends AiError {
  constructor(employeeId, action) {
    super(`AI employee "${employeeId}" is not permitted to propose action "${action}".`, "PERMISSION", { retryable: false, details: { employeeId, action } });
  }
}