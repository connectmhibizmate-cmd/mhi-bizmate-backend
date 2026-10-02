// MHI BizMate — CORS configuration.
// Only allows the configured origins (published app URL + custom domain).
import cors from "cors";
import { env } from "../config/env.js";

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow same-origin / no-origin requests (curl, server-to-server)
    if (!origin) return callback(null, true);
    if (env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
  maxAge: 86400,
});