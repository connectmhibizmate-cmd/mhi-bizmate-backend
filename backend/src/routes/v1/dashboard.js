// MHI BizMate — Dashboard routes (computed metrics)
import { Router } from "express";
import { supabase } from "../../lib/supabaseClient.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (req, res, next) => {
  try {
    const ws = req.ctx.workspaceId;

    // Compute metrics from orders in parallel
    const [
      { data: orders },
      { data: products },
      { data: customers },
    ] = await Promise.all([
      supabase.from("orders").select("total, status, payment_status, created_at").eq("workspace_id", ws),
      supabase.from("products").select("stock, status, price, cost").eq("workspace_id", ws),
      supabase.from("customers").select("id").eq("workspace_id", ws),
    ]);

    const totalSales = (orders || []).filter((o) => o.status !== "Cancelled").reduce((s, o) => s + Number(o.total || 0), 0);
    const totalOrders = (orders || []).length;
    const pendingOrders = (orders || []).filter((o) => o.status === "Pending").length;
    const deliveredOrders = (orders || []).filter((o) => o.status === "Delivered").length;
    const lowStockProducts = (products || []).filter((p) => p.status === "active" && Number(p.stock) < 5).length;
    const totalProducts = (products || []).length;
    const totalCustomers = (customers || []).length;
    const inventoryValue = (products || []).reduce((s, p) => s + Number(p.price || 0) * Number(p.stock || 0), 0);
    const potentialProfit = (products || []).reduce((s, p) => s + (Number(p.price || 0) - Number(p.cost || 0)) * Number(p.stock || 0), 0);

    res.json({
      data: {
        totalSales,
        totalOrders,
        pendingOrders,
        deliveredOrders,
        lowStockProducts,
        totalProducts,
        totalCustomers,
        inventoryValue,
        potentialProfit,
      },
    });
  } catch (e) { next(e); }
});