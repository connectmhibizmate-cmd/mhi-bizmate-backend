// MHI BizMate — Products service.
// Real HTTP adapter when VITE_BACKEND_URL is set; offline stub in preview mode.
import { makeAdapter } from "./_adapter";
import { HAS_BACKEND } from "./client";

const adapter = makeAdapter("products");

export const productsApi = {
  list: adapter.list,
  filter: adapter.filter,
  get: adapter.get,
  create: adapter.create,
  update: adapter.update,
  remove: adapter.remove,
  // Image uploads go through Supabase Storage directly (anon key + RLS).
  // Not yet wired to the backend; returns null in preview mode.
  uploadImage: async () => null,
};