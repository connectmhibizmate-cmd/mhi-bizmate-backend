// MHI BizMate — Supabase helpers stub (Backend Reset)
//
// The workspace-resolution and CRUD factory helpers were removed during the
// backend reset. Row mappers are kept as pure functions so any residual import
// resolves. `getWorkspaceId` resolves a preview workspace id so hooks that call
// it don't throw.

const PREVIEW_WS = "preview-workspace";

export async function getWorkspaceId() { return PREVIEW_WS; }

export function parseSort(sort) {
  if (!sort) return { column: "created_at", ascending: false };
  const desc = sort.startsWith("-");
  const col = desc ? sort.slice(1) : sort;
  const map = { created_date: "created_at", updated_date: "updated_at" };
  return { column: map[col] || col, ascending: !desc };
}

export function mapRow(row) {
  if (!row) return row;
  if (row.created_at && row.created_date === undefined) row.created_date = row.created_at;
  if (row.updated_at && row.updated_date === undefined) row.updated_date = row.updated_at;
  return row;
}

export function mapProductRow(row) {
  if (!row) return row;
  mapRow(row);
  if (row.stock_qty !== undefined && row.stock === undefined) row.stock = row.stock_qty;
  return row;
}

export function mapOrderRow(row) {
  if (!row) return row;
  mapRow(row);
  if (row.customer && typeof row.customer === "object" && row.customer_name === undefined) {
    row.customer_name = row.customer.name || "";
  }
  if (Array.isArray(row.items) && row.items_count === undefined) {
    row.items_count = row.items.length;
  }
  return row;
}

export function normalizePhone(phone) {
  let d = (phone || "").replace(/\D/g, "");
  if (d.startsWith("880")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  return d;
}

export async function getCurrentUserId() { return "preview-user"; }

export function makeCrud() {
  return {
    list: () => Promise.resolve([]),
    filter: () => Promise.resolve([]),
    get: () => Promise.resolve(null),
    create: () => Promise.resolve(null),
    update: () => Promise.resolve(null),
    remove: () => Promise.resolve(),
    removeMany: () => Promise.resolve(),
    bulkUpdate: (r) => Promise.resolve(r || []),
  };
}