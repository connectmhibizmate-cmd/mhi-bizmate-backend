// MHI BizMate — Notifications service.
import { makeAdapter } from "./_adapter";

const adapter = makeAdapter("notifications");

export const notificationsApi = {
  list: adapter.list,
  filter: adapter.filter,
  update: adapter.update,
  bulkUpdate: (records) => Promise.resolve(records || []),
  remove: adapter.remove,
  removeMany: adapter.removeMany,
};