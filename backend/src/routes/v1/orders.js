// MHI BizMate — Orders routes
import { Router } from "express";
import { orderHandlers } from "../../lib/heart/orders.js";
import { withIdempotency } from "../../lib/idempotency.js";
import { sendData, sendCreated, transformList, transformRow } from "../../lib/response.js";
import { requireEntitlement } from "../../lib/entitlement.js";

// Add computed profit field (total - cost_total) to each order
function transformOrder(row) {
  const t = transformRow(row);
  if (t) t.profit = Number(t.total || 0) - Number(t.cost_total || 0);
  return t;
}

export const ordersRouter = Router();

ordersRouter.get("/", async (req, res, next) => {
  try {
    const { sort, limit } = req.query;
    const filter = req.query.filter ? JSON.parse(req.query.filter) : undefined;
    const rows = await orderHandlers.list(req.ctx, { sort, limit: parseInt(limit, 10), filter });
    res.json({ data: rows.map(transformOrder) });
  } catch (e) { next(e); }
});

ordersRouter.get("/:id", async (req, res, next) => {
  try {
    const row = await orderHandlers.get(req.ctx, req.params.id);
    sendData(res, transformOrder(row));
  } catch (e) { next(e); }
});

ordersRouter.get("/:id/items", async (req, res, next) => {
  try {
    const rows = await orderHandlers.items(req.ctx, req.params.id);
    res.json({ data: transformList(rows) });
  } catch (e) { next(e); }
});

ordersRouter.post("/", requireEntitlement, async (req, res, next) => {
  try {
    const idempotencyKey = req.headers["idempotency-key"];
    const result = await withIdempotency(req.ctx, idempotencyKey, "CREATE_ORDER", () =>
      orderHandlers.create(req.ctx, req.body)
    );
    if (result?.__idempotentReplay) {
      return res.status(result.code || 200).json({ data: result.body, idempotent: true });
    }
    sendCreated(res, result);
  } catch (e) { next(e); }
});

ordersRouter.patch("/:id", async (req, res, next) => {
  try {
    // If status is being changed, use the atomic status transition handler
    if (req.body.status) {
      const result = await orderHandlers.updateStatus(req.ctx, req.params.id, req.body.status);
      const { status: _s, ...rest } = req.body;
      // If there are other fields to update besides status, update them too
      if (Object.keys(rest).length > 0) {
        const updated = await orderHandlers.update(req.ctx, req.params.id, rest);
        sendData(res, transformRow(updated));
      } else {
        sendData(res, result);
      }
    } else {
      const row = await orderHandlers.update(req.ctx, req.params.id, req.body);
      sendData(res, transformRow(row));
    }
  } catch (e) { next(e); }
});

ordersRouter.delete("/:id", async (req, res, next) => {
  try {
    await orderHandlers.remove(req.ctx, req.params.id);
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});