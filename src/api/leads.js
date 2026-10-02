// MHI BizMate — Leads service.
import { makeAdapter } from "./_adapter";

const adapter = makeAdapter("leads");

export const leadsApi = {
  list: adapter.list,
  get: adapter.get,
  create: adapter.create,
  update: adapter.update,
  remove: adapter.remove,
};