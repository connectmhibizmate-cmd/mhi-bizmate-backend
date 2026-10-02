// MHI BizMate — Business profile routes
import { Router } from "express";
import { businessHandlers } from "../../lib/heart/index.js";
import { sendData, transformRow } from "../../lib/response.js";

export const businessRouter = Router();

businessRouter.get("/", async (req, res, next) => {
  try {
    const row = await businessHandlers.get(req.ctx);
    sendData(res, transformRow(row));
  } catch (e) { next(e); }
});

businessRouter.patch("/", async (req, res, next) => {
  try {
    const row = await businessHandlers.update(req.ctx, req.body);
    sendData(res, transformRow(row));
  } catch (e) { next(e); }
});