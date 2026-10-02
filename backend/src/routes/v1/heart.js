// MHI BizMate — Heart of BizMate: AI proposal endpoint.
// AI employees propose actions; the Heart validates and executes (or rejects).
// AI NEVER writes to Supabase directly — every proposal passes through here.
import { Router } from "express";
import { execute } from "../../lib/heart/index.js";
import { heartAiRateLimiter } from "../../middleware/rateLimit.js";
import { ALL_ACTIONS } from "../../lib/heart/actions.js";
import { HeartError } from "../../lib/errors.js";

export const heartRouter = Router();

// Apply the tighter AI rate limit
heartRouter.use(heartAiRateLimiter);

// POST /api/v1/heart/propose
// Body: { action: "CREATE_CUSTOMER", data: { ... } }
// Response: { data: <result> } or { error: "HEART_REJECTED", ... }
heartRouter.post("/propose", async (req, res, next) => {
  try {
    const { action, data } = req.body;
    if (!action || !ALL_ACTIONS.includes(action)) {
      throw new HeartError(`Invalid or missing action. Valid actions: ${ALL_ACTIONS.join(", ")}`);
    }
    const result = await execute(action, req.ctx, data || {});
    res.json({ data: result, action });
  } catch (e) { next(e); }
});

// GET /api/v1/heart/actions — list all valid actions (for AI discovery)
heartRouter.get("/actions", (req, res) => {
  res.json({ data: ALL_ACTIONS });
});