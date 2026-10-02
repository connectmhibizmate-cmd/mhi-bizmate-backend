// MHI BizMate — Sourcing service (suppliers + purchases).
import { httpApi, HAS_BACKEND } from "./client";
import { emptyCrud } from "./_offlineStub";

const stub = emptyCrud();

function buildQuery({ sort, limit } = {}) {
  const params = new URLSearchParams();
  if (sort) params.set("sort", sort);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

const suppliersBase = "/api/v1/sourcing/suppliers";
const purchasesBase = "/api/v1/sourcing/purchases";

export const sourcingApi = {
  suppliers: {
    list: HAS_BACKEND ? (sort, limit) => httpApi.get(`${suppliersBase}${buildQuery({ sort, limit })}`) : stub.list,
    get: HAS_BACKEND ? (id) => httpApi.get(`${suppliersBase}/${id}`) : stub.get,
    create: HAS_BACKEND ? (data) => httpApi.post(suppliersBase, data) : stub.create,
    update: HAS_BACKEND ? (id, data) => httpApi.patch(`${suppliersBase}/${id}`, data) : stub.update,
    remove: HAS_BACKEND ? (id) => httpApi.delete(`${suppliersBase}/${id}`) : stub.remove,
  },
  purchases: {
    list: HAS_BACKEND ? (sort, limit) => httpApi.get(`${purchasesBase}${buildQuery({ sort, limit })}`) : stub.list,
    get: HAS_BACKEND ? (id) => httpApi.get(`${purchasesBase}/${id}`) : stub.get,
    create: HAS_BACKEND ? (data) => httpApi.post(purchasesBase, data) : stub.create,
    update: HAS_BACKEND ? (id, data) => httpApi.patch(`${purchasesBase}/${id}`, data) : stub.update,
    remove: HAS_BACKEND ? (id) => httpApi.delete(`${purchasesBase}/${id}`) : stub.remove,
  },
};