// MHI BizMate — Request ID middleware.
// Generates a unique ID for every request for tracing in logs.
import { randomUUID } from "crypto";

export function requestIdMiddleware(req, res, next) {
  const id = req.headers["x-request-id"] || randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
}