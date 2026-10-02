// MHI BizMate — Orders service.
// Real HTTP adapter when VITE_BACKEND_URL is set; offline stub in preview mode.
// Order creation and status transitions go through the Heart of BizMate's
// atomic RPC functions for stock-safe, transaction-consistent operations.
import { httpApi, HAS_BACKEND } from "./client";
import { emptyCrud } from "./_offlineStub";

const stub = emptyCrud();
const base = "/api/v1/orders";

export const ordersApi = {
  list: HAS_BACKEND
    ? (sort, limit) => httpApi.get(`${base}${buildOrdersQuery({ sort, limit })}`)
    : stub.list,
  get: HAS_BACKEND ? (id) => httpApi.get(`${base}/${id}`) : stub.get,
  create: HAS_BACKEND
    ? (data) => httpApi.post(base, data)
    : async () => ({ id: "preview-order", order_number: "ORD-PREVIEW" }),
  update: HAS_BACKEND
    ? (id, data) => httpApi.patch(`${base}/${id}`, data)
    : stub.update,
  remove: HAS_BACKEND ? (id) => httpApi.delete(`${base}/${id}`) : stub.remove,
  items: HAS_BACKEND ? (id) => httpApi.get(`${base}/${id}/items`) : async () => [],
};

function buildOrdersQuery({ sort, limit, filter } = {}) {
  const params = new URLSearchParams();
  if (sort) params.set("sort", sort);
  if (limit !== undefined && limit !== null && limit !== "") params.set("limit", String(limit));
  if (filter && typeof filter === "object" && Object.keys(filter).length > 0) {
    params.set("filter", JSON.stringify(filter));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}