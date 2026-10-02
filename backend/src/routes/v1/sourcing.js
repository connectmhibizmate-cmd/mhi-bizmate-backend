// MHI BizMate — Sourcing routes (suppliers + purchases)
import { Router } from "express";
import { supplierHandlers, purchaseHandlers } from "../../lib/heart/index.js";
import { sendData, sendCreated, transformList, transformRow } from "../../lib/response.js";

export const sourcingRouter = Router();

// ---- Suppliers ----
sourcingRouter.get("/suppliers", async (req, res, next) => {
  try {
    const { sort, limit } = req.query;
    const rows = await supplierHandlers.list(req.ctx, { sort, limit: parseInt(limit, 10) });
    res.json({ data: transformList(rows) });
  } catch (e) { next(e); }
});

sourcingRouter.post("/suppliers", async (req, res, next) => {
  try {
    const row = await supplierHandlers.create(req.ctx, req.body);
    sendCreated(res, transformRow(row));
  } catch (e) { next(e); }
});

sourcingRouter.patch("/suppliers/:id", async (req, res, next) => {
  try {
    const row = await supplierHandlers.update(req.ctx, req.params.id, req.body);
    sendData(res, transformRow(row));
  } catch (e) { next(e); }
});

sourcingRouter.delete("/suppliers/:id", async (req, res, next) => {
  try {
    await supplierHandlers.remove(req.ctx, req.params.id);
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});

// ---- Purchases ----
sourcingRouter.get("/purchases", async (req, res, next) => {
  try {
    const { sort, limit } = req.query;
    const rows = await purchaseHandlers.list(req.ctx, { sort, limit: parseInt(limit, 10) });
    res.json({ data: transformList(rows) });
  } catch (e) { next(e); }
});

sourcingRouter.post("/purchases", async (req, res, next) => {
  try {
    const row = await purchaseHandlers.create(req.ctx, req.body);
    sendCreated(res, transformRow(row));
  } catch (e) { next(e); }
});

sourcingRouter.patch("/purchases/:id", async (req, res, next) => {
  try {
    const row = await purchaseHandlers.update(req.ctx, req.params.id, req.body);
    sendData(res, transformRow(row));
  } catch (e) { next(e); }
});

sourcingRouter.delete("/purchases/:id", async (req, res, next) => {
  try {
    await purchaseHandlers.remove(req.ctx, req.params.id);
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});