// MHI BizMate — API adapter helper.
// When VITE_BACKEND_URL is set (HAS_BACKEND=true), creates real HTTP adapters
// that route through the Heart of BizMate backend. When unset (preview mode),
// falls back to offline stubs so the UI renders with empty states.
//
// This preserves the existing frontend-facing function signatures: list(sort, limit),
// filter(query, sort, limit), get(id), create(data), update(id, data), remove(id).
import { httpApi, HAS_BACKEND } from "./client";
import { emptyCrud } from "./_offlineStub";

function buildQuery({ sort, limit, filter } = {}) {
  const params = new URLSearchParams();
  if (sort) params.set("sort", sort);
  if (limit !== undefined && limit !== null && limit !== "") params.set("limit", String(limit));
  if (filter && typeof filter === "object" && Object.keys(filter).length > 0) {
    params.set("filter", JSON.stringify(filter));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function makeAdapter(resourcePath) {
  if (!HAS_BACKEND) return emptyCrud();

  const base = `/api/v1/${resourcePath}`;
  return {
    list: (sort, limit) => httpApi.get(`${base}${buildQuery({ sort, limit })}`),
    filter: (filter, sort, limit) => httpApi.get(`${base}${buildQuery({ sort, limit, filter })}`),
    get: (id) => httpApi.get(`${base}/${id}`),
    create: (data) => httpApi.post(base, data),
    update: (id, data) => httpApi.patch(`${base}/${id}`, data),
    remove: (id) => httpApi.delete(`${base}/${id}`),
    removeMany: (query) => httpApi.delete(`${base}${buildQuery({ filter: query })}`),
    bulkUpdate: (records) => Promise.resolve(records || []),
  };
}