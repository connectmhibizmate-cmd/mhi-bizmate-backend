// MHI BizMate — Backend environment configuration
// Validates required env vars at startup so misconfiguration fails fast.
import dotenv from "dotenv";
dotenv.config();

function required(name) {
  const raw = process.env[name]?.trim();
  const v = raw && ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))
    ? raw.slice(1, -1).trim()
    : raw;
  if (!v) {
    console.error(`[CONFIG] Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return v;
}

export const env = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: (process.env.NODE_ENV || "development") === "production",

  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),

  corsOrigins: (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "300", 10),
  heartAiRateLimit: parseInt(process.env.HEART_AI_RATE_LIMIT || "60", 10),
};