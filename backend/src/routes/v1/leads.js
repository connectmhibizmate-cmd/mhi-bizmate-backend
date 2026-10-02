// MHI BizMate — Leads routes
import { Router } from "express";
import { leadHandlers } from "../../lib/heart/index.js";
import { sendData, sendCreated, transformList, transformRow } from "../../lib/response.js";

export const leadsRouter = Router();

leadsRouter.get("/", async (req, res, next) => {
  try {
    const { sort, limit } = req.query;
    const filter = req.query.filter ? JSON.parse(req.query.filter) : undefined;
    const rows = await leadHandlers.list(req.ctx, { sort, limit: parseInt(limit, 10), filter });
    res.json({ data: transformList(rows) });
  } catch (e) { next(e); }
});

leadsRouter.get("/:id", async (req, res, next) => {
  try {
    const row = await leadHandlers.get(req.ctx, req.params.id);
    sendData(res, transformRow(row));
  } catch (e) { next(e); }
});

leadsRouter.post("/", async (req, res, next) => {
  try {
    const row = await leadHandlers.create(req.ctx, req.body);
    sendCreated(res, transformRow(row));
  } catch (e) { next(e); }
});

leadsRouter.patch("/:id", async (req, res, next) => {
  try {
    const row = await leadHandlers.update(req.ctx, req.params.id, req.body);
    sendData(res, transformRow(row));
  } catch (e) { next(e); }
});

leadsRouter.delete("/:id", async (req, res, next) => {
  try {
    await leadHandlers.remove(req.ctx, req.params.id);
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});