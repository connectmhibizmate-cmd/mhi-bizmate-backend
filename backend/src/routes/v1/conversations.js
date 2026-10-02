// MHI BizMate — Conversations routes (structure for future Meta integration)
import { Router } from "express";
import { supabase } from "../../lib/supabaseClient.js";
import { transformList, transformRow } from "../../lib/response.js";
import { NotFoundError } from "../../lib/errors.js";

export const conversationsRouter = Router();

conversationsRouter.get("/", async (req, res, next) => {
  try {
    const { limit } = req.query;
    let query = supabase
      .from("conversations")
      .select("*")
      .eq("workspace_id", req.ctx.workspaceId)
      .order("updated_at", { ascending: false });
    if (limit) query = query.limit(parseInt(limit, 10));
    const { data, error } = await query;
    if (error) throw error;
    res.json({ data: transformList(data) });
  } catch (e) { next(e); }
});

conversationsRouter.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", req.params.id)
      .eq("workspace_id", req.ctx.workspaceId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError("Conversation");
    res.json({ data: transformRow(data) });
  } catch (e) { next(e); }
});

conversationsRouter.get("/:id/messages", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", req.params.id)
      .eq("workspace_id", req.ctx.workspaceId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    res.json({ data: transformList(data) });
  } catch (e) { next(e); }
});