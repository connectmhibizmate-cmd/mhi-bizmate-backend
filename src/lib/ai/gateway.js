// MHI BizMate — AI Gateway: Core orchestrator.
//
// Architecture:
//   AI Employee → AI Gateway → Provider Adapter → Gemini / Grok / Future
//
// The Gateway provides a STABLE internal interface to AI Employees:
//   - generateText(request)
//   - generateStructuredOutput(request)
//
// Employees never know which provider is active, how to authenticate, or
// what the provider's API looks like. They send a normalized request and
// receive a normalized response. Provider selection, retry, fallback,
// usage logging, and error normalization all happen here.
//
// SECURITY:
//   - The Gateway receives ctx (workspace context) but NEVER passes
//     credentials, tokens, or secrets to the provider. Only the system
//     prompt, user prompt, and structured context are sent.
//   - Provider API keys live inside the adapter (server-side env), never
//     in the request path.
//   - All operations are logged to ai_operations for observability.
//
// FAILURE HANDLING:
//   1. If the active provider is not configured → try fallback provider.
//   2. If the active provider throws a retryable error → retry up to
//      maxRetries with exponential backoff.
//   3. If all retries exhausted → try fallback provider.
//   4. If fallback also fails → return normalized AiError (never fake success).

import { resolveProvider, getProvider, listProviders, getConfiguredProviders } from "./providers/index.js";
import { AiError, AiProviderNotConfiguredError } from "./errors.js";
import { logAiOperation } from "./usage.js";

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_PREFERENCE = ["groq", "gemini", "grok"];

// Generate free-text output from an AI Employee request.
// Returns: { text, provider, model, usage, correlationId }
export async function generateText(ctx, request) {
  return _execute(ctx, request, "text");
}

// Generate structured (JSON) output validated against a schema.
// Returns: { data, provider, model, usage, correlationId }
export async function generateStructuredOutput(ctx, request) {
  return _execute(ctx, request, "structured");
}

async function _execute(ctx, request, mode) {
  const correlationId = request.correlationId || _generateId();
  const taskType = request.taskType || "unknown";
  const employeeId = request.employee || "unknown";

  // Resolve provider: explicit → preference list → any configured
  const preference = request.provider
    ? [request.provider, ...(request.fallbackProvider ? [request.fallbackProvider] : [])]
    : (request.preference || DEFAULT_PREFERENCE);

  const resolved = resolveProvider(preference);
  if (!resolved) {
    // No provider is configured at all — fail safely
    await logAiOperation(ctx, {
      employee: employeeId,
      provider: null,
      model: null,
      taskType,
      action: request.action || null,
      correlationId,
      success: false,
      errorCategory: "NOT_CONFIGURED",
      fallbackUsed: false,
    });
    throw new AiProviderNotConfiguredError(preference[0] || "any");
  }

  const { provider: primaryProvider, source: primarySource } = resolved;
  const fallbackId = request.fallbackProvider && request.fallbackProvider !== primarySource
    ? request.fallbackProvider
    : null;
  const fallbackProvider = fallbackId ? getProvider(fallbackId) : null;

  const model = request.model || primaryProvider.models[0];
  const timeout = request.timeout || DEFAULT_TIMEOUT;
  const maxRetries = request.maxRetries ?? DEFAULT_MAX_RETRIES;

  // Attempt primary provider with retry
  let lastError = null;
  let usedFallback = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = mode === "text"
        ? await primaryProvider.generateText({ ...request, model, timeout })
        : await primaryProvider.generateStructuredOutput({ ...request, model, timeout });

      await logAiOperation(ctx, {
        employee: employeeId,
        provider: primaryProvider.id,
        model,
        taskType,
        action: request.action || null,
        correlationId,
        inputTokens: result.usage?.inputTokens || 0,
        outputTokens: result.usage?.outputTokens || 0,
        success: true,
        fallbackUsed: false,
      });

      return {
        text: mode === "text" ? result.text : undefined,
        data: mode === "structured" ? result.data : undefined,
        provider: primaryProvider.id,
        model,
        usage: result.usage,
        correlationId,
      };
    } catch (e) {
      lastError = e;
      // Only retry on retryable errors
      if (!(e instanceof AiError) || !e.retryable) break;
      if (attempt < maxRetries) {
        await _backoff(attempt);
      }
    }
  }

  // Try fallback provider if available and different
  if (fallbackProvider && fallbackProvider.isConfigured()) {
    usedFallback = true;
    try {
      const fallbackModel = request.fallbackModel || fallbackProvider.models[0];
      const result = mode === "text"
        ? await fallbackProvider.generateText({ ...request, model: fallbackModel, timeout })
        : await fallbackProvider.generateStructuredOutput({ ...request, model: fallbackModel, timeout });

      await logAiOperation(ctx, {
        employee: employeeId,
        provider: fallbackProvider.id,
        model: fallbackModel,
        taskType,
        action: request.action || null,
        correlationId,
        inputTokens: result.usage?.inputTokens || 0,
        outputTokens: result.usage?.outputTokens || 0,
        success: true,
        fallbackUsed: true,
      });

      return {
        text: mode === "text" ? result.text : undefined,
        data: mode === "structured" ? result.data : undefined,
        provider: fallbackProvider.id,
        model: fallbackModel,
        usage: result.usage,
        correlationId,
      };
    } catch (e) {
      lastError = e;
    }
  }

  // All attempts failed — log and throw normalized error
  const errorCategory = lastError instanceof AiError ? lastError.category : "UNKNOWN";
  await logAiOperation(ctx, {
    employee: employeeId,
    provider: primaryProvider.id,
    model,
    taskType,
    action: request.action || null,
    correlationId,
    success: false,
    errorCategory,
    fallbackUsed: usedFallback,
  });

  throw lastError || new AiError("AI operation failed for unknown reasons.", "UNKNOWN");
}

function _backoff(attempt) {
  const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
  return new Promise((r) => setTimeout(r, delay));
}

function _generateId() {
  return `ai_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Gateway status — used by the /api/v1/ai/status endpoint and admin panel.
export function getGatewayStatus() {
  const all = listProviders();
  const configured = getConfiguredProviders();
  const activeId = process.env.AI_ACTIVE_PROVIDER?.trim() || (configured[0]?.id || "");
  const fallbackId = process.env.AI_FALLBACK_PROVIDER?.trim() || "";
  return {
    activeProvider: activeId,
    fallbackProvider: fallbackId,
    providers: all.map((p) => ({
      id: p.id,
      name: p.name,
      configured: p.isConfigured(),
      models: p.models,
    })),
    ready: configured.length > 0,
  };
}