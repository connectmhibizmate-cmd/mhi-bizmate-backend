// MHI BizMate — Heart of BizMate: Order handlers (transaction-safe via RPC).
// Order creation and status transitions use Postgres SECURITY DEFINER functions
// (heart_create_order, heart_update_order_status) to guarantee atomic stock
// updates, customer total sync, and income transaction consistency.
import { supabase } from "../supabaseClient.js";
import { hasPermission } from "./permissions.js";
import { ForbiddenError, NotFoundError, ValidationError, HeartError } from "../errors.js";
import { auditLog } from "../audit.js";

export const orderHandlers = {
  async list(ctx, { sort, limit, filter } = {}) {
    let query = supabase.from("orders").select("*").eq("workspace_id", ctx.workspaceId);
    if (filter) {
      for (const [k, v] of Object.entries(filter)) {
        if (v !== undefined && v !== null && v !== "") query = query.eq(k, v);
      }
    }
    if (sort) {
      const desc = sort.startsWith("-");
      const col = desc ? sort.slice(1) : sort;
      const colMap = { created_date: "created_at", order_date: "order_date" };
      query = query.order(colMap[col] || col, { ascending: !desc });
    }
    if (limit) query = query.limit(parseInt(limit, 10));
    const { data, error } = await query;
    if (error) throw new HeartError(`Failed to list orders: ${error.message}`);

    // Enrich each order with items_count
    if (data.length > 0) {
      const orderIds = data.map((o) => o.id);
      const { data: counts } = await supabase
        .from("order_items")
        .select("order_id")
        .in("order_id", orderIds);
      const countMap = (counts || []).reduce((m, r) => {
        m[r.order_id] = (m[r.order_id] || 0) + 1;
        return m;
      }, {});
      data.forEach((o) => { o.items_count = countMap[o.id] || 0; });
    }
    return data;
  },

  async get(ctx, id) {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();
    if (error) throw new HeartError(`Failed to get order: ${error.message}`);
    if (!data) throw new NotFoundError("Order");
    return data;
  },

  async items(ctx, orderId) {
    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .eq("workspace_id", ctx.workspaceId)
      .order("created_at", { ascending: true });
    if (error) throw new HeartError(`Failed to get order items: ${error.message}`);
    return data || [];
  },

  async create(ctx, body) {
    if (!hasPermission(ctx.role, "CREATE_PENDING_ORDER")) {
      throw new ForbiddenError("Your role cannot create orders.");
    }
    if (!body.customer_id) throw new ValidationError("A customer is required.");
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      throw new ValidationError("At least one product is required.");
    }

    // Call the atomic Postgres function for stock-safe order creation
    const { data, error } = await supabase.rpc("heart_create_order", {
      p_workspace_id: ctx.workspaceId,
      p_actor_id: ctx.userId,
      p_customer_id: body.customer_id,
      p_items: body.items,
      p_discount: Number(body.discount) || 0,
      p_delivery_charge: Number(body.delivery_charge) || 0,
      p_payment_status: body.payment_status || "Unpaid",
      p_status: body.status || "Pending",
      p_notes: body.notes || "",
    });
    if (error) throw new HeartError(error.message);
    return data;
  },

  async updateStatus(ctx, id, status) {
    if (!hasPermission(ctx.role, "UPDATE_ORDER_STATUS")) {
      throw new ForbiddenError("Your role cannot change order status.");
    }
    const { data, error } = await supabase.rpc("heart_update_order_status", {
      p_workspace_id: ctx.workspaceId,
      p_actor_id: ctx.userId,
      p_order_id: id,
      p_new_status: status,
    });
    if (error) throw new HeartError(error.message);
    return data;
  },

  async update(ctx, id, body) {
    // General update (notes, payment_status, etc.) — NOT status (use updateStatus)
    if (!hasPermission(ctx.role, "UPDATE_PENDING_ORDER")) {
      throw new ForbiddenError("Your role cannot update orders.");
    }
    const { id: _id, workspace_id: _ws, created_at: _ca, status: _status, ...updatable } = body;
    const { data, error } = await supabase
      .from("orders")
      .update(updatable)
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId)
      .select("*")
      .maybeSingle();
    if (error) throw new HeartError(`Failed to update order: ${error.message}`);
    if (!data) throw new NotFoundError("Order");
    await auditLog(ctx, "order.updated", "order", id, { fields: Object.keys(updatable) });
    return data;
  },

  async remove(ctx, id) {
    if (!hasPermission(ctx.role, "CANCEL_ORDER")) {
      throw new ForbiddenError("Your role cannot delete orders.");
    }
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId);
    if (error) throw new HeartError(`Failed to delete order: ${error.message}`);
    await auditLog(ctx, "order.deleted", "order", id, {});
    return true;
  },
};