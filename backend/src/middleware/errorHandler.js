// MHI BizMate — Global error handler.
// Catches all unhandled errors and returns a structured JSON response.
import { ApiError } from "../lib/errors.js";
import { AiError } from "../lib/ai/errors.js";

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      details: err.details || undefined,
      requestId: req.id,
    });
  }

  // AI Gateway errors: surface a friendly, non-leaking message to the client
  // while logging the real category server-side for ops/admin diagnosis. This
  // avoids collapsing every AI failure into a generic 500 "unexpected error"
  // (which the user sees as "Not Available") without exposing provider details.
  if (err instanceof AiError) {
    console.error(`[AI ERROR] ${req.id} ${req.method} ${req.path}: ${err.category} ${err.message}`);
    const status = err.category === "RATE_LIMIT" ? 429
      : err.category === "TIMEOUT" ? 504
      : ["NOT_CONFIGURED", "UNAVAILABLE", "MALFORMED"].includes(err.category) ? 503
      : 500;
    return res.status(status).json({
      error: "The AI service is temporarily unavailable. Please try again in a moment.",
      code: err.category || "AI_ERROR",
      requestId: req.id,
    });
  }

  // Postgres / Supabase errors from RPC functions often arrive as PostgrestError
  if (err?.code && err?.message && err?.details !== undefined) {
    const status = err.status || 400;
    return res.status(status).json({
      error: err.message,
      code: err.code,
      requestId: req.id,
    });
  }

  console.error(`[ERROR] ${req.id} ${req.method} ${req.path}:`, err);
  return res.status(500).json({
    error: "An unexpected error occurred.",
    code: "INTERNAL_ERROR",
    requestId: req.id,
  });
}
