// MHI BizMate — Conversations service.
// Meta integration is pending; the backend exposes read-only endpoints.
// Real HTTP adapter when VITE_BACKEND_URL is set; offline stub in preview mode.
import { httpApi, HAS_BACKEND } from "./client";

export const conversationsApi = {
  list: HAS_BACKEND ? () => httpApi.get("/api/v1/conversations") : async () => [],
  get: HAS_BACKEND ? (id) => httpApi.get(`/api/v1/conversations/${id}`) : async () => null,
  update: async () => null,
  messages: HAS_BACKEND ? (id) => httpApi.get(`/api/v1/conversations/${id}/messages`) : async () => [],
  send: async () => null,
  adminMessages: async () => [],
  createAdminMessage: async () => null,
  adminAiReply: async () => null,
  subscribe: () => () => {},
  subscribeMessages: () => () => {},
};