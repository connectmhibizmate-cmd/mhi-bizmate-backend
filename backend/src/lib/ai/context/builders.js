// MHI BizMate — AI Gateway: Context Engine.
//
// The Context Engine builds task-specific, workspace-scoped, permission-aware
// context for AI Employees. The AI NEVER receives the entire workspace
// database — it receives a minimal, structured, relevant snapshot.
//
// Principles:
//   1. Workspace-scoped: every query is filtered by ctx.workspaceId.
//   2. Permission-aware: only data the user's role can read is included.
//   3. Task-specific: only data relevant to the current task is loaded.
//   4. Minimal: no unnecessary fields, no full-table dumps.
//   5. Current: reads live from the database at request time.
//   6. Structured: returns plain objects, not raw rows.
//
// These builders are used by AI Employees via their contextBuilder config.
// They reuse the existing Supabase service-role client (server-side only).

import { supabase } from "../../supabaseClient.js";

// Product context: for Product Q&A, order creation, stock checks.
// Input: { productId?, category?, lowStockOnly?, limit? }
export async function buildProductContext(ctx, input = {}) {
  let query = supabase
    .from("products")
    .select("id, name, description, sku, category, price, stock, status, image_url")
    .eq("workspace_id", ctx.workspaceId);

  if (input.productId) {
    query = query.eq("id", input.productId).limit(1);
  } else {
    if (input.category) query = query.eq("category", input.category);
    if (input.lowStockOnly) query = query.lt("stock", 5).eq("status", "active");
    query = query.eq("status", "active").limit(input.limit || 20);
  }
  const { data, error } = await query;
  if (error) return { products: [], error: "Failed to load products" };
  return { products: data || [] };
}

// Customer context: for Messenger AI, lead management, order creation.
// Input: { customerId?, phone?, facebookId?, limit? }
export async function buildCustomerContext(ctx, input = {}) {
  let query = supabase
    .from("customers")
    .select("id, name, phone, email, address, type, notes, status, total_orders, total_spent, facebook_id")
    .eq("workspace_id", ctx.workspaceId);

  if (input.customerId) {
    query = query.eq("id", input.customerId).limit(1);
  } else if (input.phone) {
    query = query.eq("phone", input.phone).limit(1);
  } else if (input.facebookId) {
    query = query.eq("facebook_id", input.facebookId).limit(1);
  } else {
    query = query.eq("status", "active").limit(input.limit || 20);
  }
  const { data, error } = await query;
  if (error) return { customers: [], error: "Failed to load customers" };
  return { customers: data || [] };
}

// Conversation context: for Messenger AI, follow-up automation.
// Input: { conversationId, messageLimit? }
export async function buildConversationContext(ctx, input = {}) {
  if (!input.conversationId) return { conversation: null, messages: [] };

  const [convRes, msgRes] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, name, customer_id, facebook_id, status, needs_human, ai_paused, last_message")
      .eq("id", input.conversationId)
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, sender_type, content, created_at")
      .eq("conversation_id", input.conversationId)
      .eq("workspace_id", ctx.workspaceId)
      .order("created_at", { ascending: true })
      .limit(input.messageLimit || 20),
  ]);

  return {
    conversation: convRes.data || null,
    messages: msgRes.data || [],
  };
}

// Lead context: for Messenger AI lead management.
// Input: { leadId?, status?, limit? }
export async function buildLeadContext(ctx, input = {}) {
  let query = supabase
    .from("leads")
    .select("id, name, phone, source, status, notes, customer_id, created_at")
    .eq("workspace_id", ctx.workspaceId);

  if (input.leadId) {
    query = query.eq("id", input.leadId).limit(1);
  } else {
    if (input.status) query = query.eq("status", input.status);
    query = query.limit(input.limit || 20);
  }
  const { data, error } = await query;
  if (error) return { leads: [], error: "Failed to load leads" };
  return { leads: data || [] };
}

// Pending order context: for order confirmation automation.
// Input: { orderId?, customerId?, limit? }
export async function buildPendingOrderContext(ctx, input = {}) {
  let query = supabase
    .from("orders")
    .select("id, order_number, customer_id, customer_name, customer_phone, customer_address, status, payment_status, total, subtotal, discount, delivery_charge, notes, created_at")
    .eq("workspace_id", ctx.workspaceId);

  if (input.orderId) {
    query = query.eq("id", input.orderId).limit(1);
  } else {
    query = query.eq("status", "Pending").limit(input.limit || 10);
  }
  const { data: orders, error } = await query;
  if (error) return { orders: [], error: "Failed to load orders" };

  // Enrich with items for specific order
  if (input.orderId && orders.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, product_name, quantity, unit_price, total")
      .eq("order_id", input.orderId)
      .eq("workspace_id", ctx.workspaceId);
    return { orders, items: items || [] };
  }
  return { orders: orders || [], items: [] };
}

// Business intelligence context: for the owner-facing BI AI.
// Returns dashboard-level metrics — no individual customer PII.
export async function buildBusinessIntelContext(ctx) {
  const ws = ctx.workspaceId;
  const [
    { data: orders },
    { data: products },
    { data: customers },
    { data: leads },
  ] = await Promise.all([
    supabase.from("orders").select("total, status, payment_status, created_at").eq("workspace_id", ws),
    supabase.from("products").select("stock, status, price, cost, name").eq("workspace_id", ws),
    supabase.from("customers").select("id, status, total_orders, total_spent").eq("workspace_id", ws),
    supabase.from("leads").select("status, created_at").eq("workspace_id", ws),
  ]);

  const validOrders = (orders || []).filter((o) => o.status !== "Cancelled");
  return {
    metrics: {
      totalSales: validOrders.reduce((s, o) => s + Number(o.total || 0), 0),
      totalOrders: (orders || []).length,
      pendingOrders: (orders || []).filter((o) => o.status === "Pending").length,
      deliveredOrders: (orders || []).filter((o) => o.status === "Delivered").length,
      lowStockProducts: (products || []).filter((p) => p.status === "active" && Number(p.stock) < 5).map((p) => ({ name: p.name, stock: p.stock })),
      totalProducts: (products || []).length,
      totalCustomers: (customers || []).length,
      activeCustomers: (customers || []).filter((c) => c.status === "active").length,
      inventoryValue: (products || []).reduce((s, p) => s + Number(p.price || 0) * Number(p.stock || 0), 0),
      potentialProfit: (products || []).reduce((s, p) => s + (Number(p.price || 0) - Number(p.cost || 0)) * Number(p.stock || 0), 0),
      newLeads: (leads || []).filter((l) => l.status === "new").length,
      convertedLeads: (leads || []).filter((l) => l.status === "converted").length,
    },
  };
}

// Admin/support context: for the internal Admin Panel AI.
// Returns platform-level status — no workspace business data.
export async function buildAdminSupportContext(ctx, input = {}) {
  // The Admin Panel AI only sees what the authenticated admin's platform
  // role permits. It does NOT receive workspace business data.
  return {
    adminUser: {
      id: ctx.userId,
      role: ctx.role,
      platformRole: ctx.platformRole || null,
    },
    task: input.task || "general_support",
    // No business data — this employee is internal-facing only.
  };
}