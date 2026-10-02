// MHI BizMate — Customers routes
import { Router } from "express";
import { customerHandlers } from "../../lib/heart/index.js";
import { sendData, sendCreated, transformList, transformRow } from "../../lib/response.js";

export const customersRouter = Router();

customersRouter.get("/", async (req, res, next) => {
  try {
    const { sort, limit } = req.query;
    const filter = req.query.filter ? JSON.parse(req.query.filter) : undefined;
    const rows = await customerHandlers.list(req.ctx, { sort, limit: parseInt(limit, 10), filter });
    res.json({ data: transformList(rows) });
  } catch (e) { next(e); }
});

customersRouter.get("/:id", async (req, res, next) => {
  try {
    const row = await customerHandlers.get(req.ctx, req.params.id);
    sendData(res, transformRow(row));
  } catch (e) { next(e); }
});

customersRouter.post("/", async (req, res, next) => {
  try {
    const row = await customerHandlers.create(req.ctx, req.body);
    sendCreated(res, transformRow(row));
  } catch (e) { next(e); }
});

customersRouter.patch("/:id", async (req, res, next) => {
  try {
    const row = await customerHandlers.update(req.ctx, req.params.id, req.body);
    sendData(res, transformRow(row));
  } catch (e) { next(e); }
});

customersRouter.delete("/:id", async (req, res, next) => {
  try {
    await customerHandlers.remove(req.ctx, req.params.id);
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});

customersRouter.delete("/", async (req, res, next) => {
  try {
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    await customerHandlers.removeMany(req.ctx, filter);
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});