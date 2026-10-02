// MHI BizMate — Transactions service (accounting).
import { makeAdapter } from "./_adapter";

const adapter = makeAdapter("transactions");

export const transactionsApi = {
  list: adapter.list,
  filter: adapter.filter,
  create: adapter.create,
  update: adapter.update,
  remove: adapter.remove,
  removeMany: adapter.removeMany,
};