// MHI BizMate — Transactions routes (accounting)
import { Router } from "express";
import { transactionHandlers } from "../../lib/heart/index.js";
import { sendData, sendCreated, transformList, transformRow } from "../../lib/response.js";

export const transactionsRouter = Router();

transactionsRouter.get("/", async (req, res, next) => {
  try {
    const { sort, limit } = req.query;
    const filter = req.query.filter ? JSON.parse(req.query.filter) : undefined;
    const rows = await transactionHandlers.list(req.ctx, { sort, limit: parseInt(limit, 10), filter });
    res.json({ data: transformList(rows) });
  } catch (e) { next(e); }
});

transactionsRouter.post("/", async (req, res, next) => {
  try {
    const row = await transactionHandlers.create(req.ctx, req.body);
    sendCreated(res, transformRow(row));
  } catch (e) { next(e); }
});

transactionsRouter.patch("/:id", async (req, res, next) => {
  try {
    const row = await transactionHandlers.update(req.ctx, req.params.id, req.body);
    sendData(res, transformRow(row));
  } catch (e) { next(e); }
});

transactionsRouter.delete("/:id", async (req, res, next) => {
  try {
    await transactionHandlers.remove(req.ctx, req.params.id);
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});

transactionsRouter.delete("/", async (req, res, next) => {
  try {
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    await transactionHandlers.removeMany(req.ctx, filter);
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});