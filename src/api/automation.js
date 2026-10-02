// MHI BizMate — Automation service (settings).
import { httpApi, HAS_BACKEND } from "./client";

export const automationApi = {
  getSettings: HAS_BACKEND ? () => httpApi.get("/api/v1/automation/settings") : async () => [],
  createSettings: HAS_BACKEND ? (data) => httpApi.post("/api/v1/automation/settings", data) : async () => null,
  saveSettings: HAS_BACKEND ? (id, data) => httpApi.patch(`/api/v1/automation/settings/${id}`, data) : async () => null,
  usage: HAS_BACKEND ? () => httpApi.get("/api/v1/automation/usage") : async () => ({ usage_count: 0, usage_limit: 0 }),
};