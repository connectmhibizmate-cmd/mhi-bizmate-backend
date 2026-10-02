// MHI BizMate — Automation routes (settings)
import { Router } from "express";
import { supabase } from "../../lib/supabaseClient.js";
import { transformList, transformRow } from "../../lib/response.js";
import { ForbiddenError, HeartError } from "../../lib/errors.js";
import { hasPermission } from "../../lib/heart/permissions.js";

export const automationRouter = Router();

automationRouter.get("/settings", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("automation_settings")
      .select("*")
      .eq("workspace_id", req.ctx.workspaceId);
    if (error) throw new HeartError(`Failed to load automation settings: ${error.message}`);
    res.json({ data: transformList(data) });
  } catch (e) { next(e); }
});

automationRouter.post("/settings", async (req, res, next) => {
  try {
    if (!hasPermission(req.ctx.role, "UPDATE_BUSINESS_PROFILE")) {
      throw new ForbiddenError("Only the Founder or Co-Founder can configure automation.");
    }
    const row = { ...req.body, workspace_id: req.ctx.workspaceId };
    const { data, error } = await supabase
      .from("automation_settings")
      .insert(row)
      .select("*")
      .single();
    if (error) throw new HeartError(`Failed to save automation settings: ${error.message}`);
    res.status(201).json({ data: transformRow(data) });
  } catch (e) { next(e); }
});

automationRouter.patch("/settings/:id", async (req, res, next) => {
  try {
    if (!hasPermission(req.ctx.role, "UPDATE_BUSINESS_PROFILE")) {
      throw new ForbiddenError("Only the Founder or Co-Founder can configure automation.");
    }
    const { id: _id, workspace_id: _ws, ...updatable } = req.body;
    const { data, error } = await supabase
      .from("automation_settings")
      .update(updatable)
      .eq("id", req.params.id)
      .eq("workspace_id", req.ctx.workspaceId)
      .select("*")
      .maybeSingle();
    if (error) throw new HeartError(`Failed to update automation settings: ${error.message}`);
    res.json({ data: transformRow(data) });
  } catch (e) { next(e); }
});

automationRouter.get("/usage", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("automation_settings")
      .select("usage_count, usage_limit")
      .eq("workspace_id", req.ctx.workspaceId);
    if (error) throw new HeartError(`Failed to load usage: ${error.message}`);
    const total = (data || []).reduce((s, r) => s + (r.usage_count || 0), 0);
    const limit = (data || []).reduce((s, r) => s + (r.usage_limit || 0), 0);
    res.json({ data: { usage_count: total, usage_limit: limit } });
  } catch (e) { next(e); }
});