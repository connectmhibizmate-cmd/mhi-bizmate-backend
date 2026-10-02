// MHI BizMate — Global error handler.
// Catches all unhandled errors and returns a structured JSON response.
import { ApiError } from "../lib/errors.js";

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