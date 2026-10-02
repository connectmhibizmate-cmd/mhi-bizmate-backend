// MHI BizMate — Products routes
import { Router } from "express";
import { productHandlers } from "../../lib/heart/index.js";
import { sendData, sendCreated, transformList, transformRow } from "../../lib/response.js";

export const productsRouter = Router();

productsRouter.get("/", async (req, res, next) => {
  try {
    const { sort, limit } = req.query;
    const filter = req.query.filter ? JSON.parse(req.query.filter) : undefined;
    const rows = await productHandlers.list(req.ctx, { sort, limit: parseInt(limit, 10), filter });
    res.json({ data: transformList(rows) });
  } catch (e) { next(e); }
});

productsRouter.get("/:id", async (req, res, next) => {
  try {
    const row = await productHandlers.get(req.ctx, req.params.id);
    sendData(res, transformRow(row));
  } catch (e) { next(e); }
});

productsRouter.post("/", async (req, res, next) => {
  try {
    const row = await productHandlers.create(req.ctx, req.body);
    sendCreated(res, transformRow(row));
  } catch (e) { next(e); }
});

productsRouter.patch("/:id", async (req, res, next) => {
  try {
    const row = await productHandlers.update(req.ctx, req.params.id, req.body);
    sendData(res, transformRow(row));
  } catch (e) { next(e); }
});

productsRouter.delete("/:id", async (req, res, next) => {
  try {
    await productHandlers.remove(req.ctx, req.params.id);
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});