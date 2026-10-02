// MHI BizMate — Notifications routes
import { Router } from "express";
import { notificationHandlers } from "../../lib/heart/index.js";
import { transformList, transformRow } from "../../lib/response.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const { sort, limit } = req.query;
    const filter = req.query.filter ? JSON.parse(req.query.filter) : undefined;
    const rows = await notificationHandlers.list(req.ctx, { sort, limit: parseInt(limit, 10), filter });
    res.json({ data: transformList(rows) });
  } catch (e) { next(e); }
});

notificationsRouter.patch("/:id", async (req, res, next) => {
  try {
    const row = await notificationHandlers.update(req.ctx, req.params.id, req.body);
    res.json({ data: transformRow(row) });
  } catch (e) { next(e); }
});

notificationsRouter.delete("/:id", async (req, res, next) => {
  try {
    await notificationHandlers.remove(req.ctx, req.params.id);
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});

notificationsRouter.delete("/", async (req, res, next) => {
  try {
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    await notificationHandlers.removeMany(req.ctx, filter);
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});