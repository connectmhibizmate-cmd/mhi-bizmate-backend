// MHI BizMate — Marketing service (campaigns).
import { makeAdapter } from "./_adapter";

const adapter = makeAdapter("marketing");

export const marketingApi = {
  list: adapter.list,
  create: adapter.create,
  update: adapter.update,
  remove: adapter.remove,
};