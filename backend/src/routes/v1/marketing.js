// MHI BizMate — Marketing routes (campaigns)
import { Router } from "express";
import { campaignHandlers } from "../../lib/heart/index.js";
import { sendData, sendCreated, transformList, transformRow } from "../../lib/response.js";

export const marketingRouter = Router();

marketingRouter.get("/", async (req, res, next) => {
  try {
    const { sort, limit } = req.query;
    const rows = await campaignHandlers.list(req.ctx, { sort, limit: parseInt(limit, 10) });
    res.json({ data: transformList(rows) });
  } catch (e) { next(e); }
});

marketingRouter.post("/", async (req, res, next) => {
  try {
    const row = await campaignHandlers.create(req.ctx, req.body);
    sendCreated(res, transformRow(row));
  } catch (e) { next(e); }
});

marketingRouter.patch("/:id", async (req, res, next) => {
  try {
    const row = await campaignHandlers.update(req.ctx, req.params.id, req.body);
    sendData(res, transformRow(row));
  } catch (e) { next(e); }
});

marketingRouter.delete("/:id", async (req, res, next) => {
  try {
    await campaignHandlers.remove(req.ctx, req.params.id);
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});