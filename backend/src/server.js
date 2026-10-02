// MHI BizMate — Heart of BizMate: Express server entry point.
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { corsMiddleware } from "./middleware/cors.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { apiRateLimiter } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { v1Router } from "./routes/v1/index.js";

const app = express();

// ---- Security & parsing ----
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);
app.use(requestIdMiddleware);

// ---- Health check (no auth) ----
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "heart-of-bizmate", timestamp: new Date().toISOString() });
});

// ---- API v1 ----
app.use("/api/v1", apiRateLimiter, v1Router);

// ---- 404 ----
app.use((req, res) => {
  res.status(404).json({ error: "Not found.", code: "NOT_FOUND", requestId: req.id });
});

// ---- Global error handler ----
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`[Heart of BizMate] listening on port ${env.port} (${env.nodeEnv})`);
});