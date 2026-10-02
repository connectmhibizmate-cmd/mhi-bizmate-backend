// MHI BizMate — Rate limiting.
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const apiRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ctx?.userId || req.ip,
  message: { error: "Too many requests. Please slow down.", code: "RATE_LIMITED" },
});

// Tighter limit for AI proposal endpoints (Heart)
export const heartAiRateLimiter = rateLimit({
  windowMs: 60000,
  max: env.heartAiRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ctx?.userId || req.ip,
  message: { error: "AI proposal rate limit reached.", code: "AI_RATE_LIMITED" },
});