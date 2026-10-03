import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { corsMiddleware } from "./middleware/cors.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { apiRateLimiter } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { v1Router } from "./routes/v1/index.js";
import metaRouter from "./routes/meta.js";
import { checkAuthReadiness } from "./lib/supabaseClient.js";

const app = express();
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);
app.use(requestIdMiddleware);
app.use("/webhooks/meta", metaRouter);

app.get("/health", apiRateLimiter, async (req, res) => {
  const r = await checkAuthReadiness();
  res.status(r.ready ? 200 : 503).json({ status: r.ready ? "ok" : "degraded" });
});

app.use("/api/v1", apiRateLimiter, v1Router);
app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

const PORT = env.port || process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
export default app;