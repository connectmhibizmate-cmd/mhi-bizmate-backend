// MHI BizMate — Customers service.
// Real HTTP adapter when VITE_BACKEND_URL is set; offline stub in preview mode.
import { makeAdapter } from "./_adapter";

const adapter = makeAdapter("customers");

export const customersApi = {
  list: adapter.list,
  get: adapter.get,
  update: adapter.update,
  remove: adapter.remove,
  create: adapter.create,
  syncUpdate: adapter.update,
};