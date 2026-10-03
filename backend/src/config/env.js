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

  // The SDK needs the project origin, not a copied REST/Auth endpoint path.
  supabaseUrl: new URL(required("SUPABASE_URL")).origin,
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),

  corsOrigins: (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "300", 10),
  heartAiRateLimit: parseInt(process.env.HEART_AI_RATE_LIMIT || "60", 10),

  // ---- Meta Connector (Facebook Page + Messenger) ----
  // All Meta secrets are backend-only. They are NEVER sent to the frontend,
  // AI models, logs, or audit records.
  meta: {
    appId: process.env.META_APP_ID?.trim() || "",
    appSecret: process.env.META_APP_SECRET?.trim() || "",
    verifyToken: process.env.META_VERIFY_TOKEN?.trim() || "",
    redirectUri: process.env.META_REDIRECT_URI?.trim() || "",
    graphVersion: process.env.META_GRAPH_API_VERSION?.trim() || "v20.0",
    tokenEncryptionKey: process.env.META_TOKEN_ENCRYPTION_KEY?.trim() || "",
    isConfigured: Boolean(
      process.env.META_APP_ID?.trim() &&
      process.env.META_APP_SECRET?.trim() &&
      process.env.META_VERIFY_TOKEN?.trim()
    ),
  },
};