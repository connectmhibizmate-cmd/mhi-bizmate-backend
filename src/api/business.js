// MHI BizMate — Business profile service.
import { httpApi, HAS_BACKEND } from "./client";

export const businessApi = {
  get: HAS_BACKEND ? () => httpApi.get("/api/v1/business") : async () => null,
  createDefault: HAS_BACKEND
    ? async () => httpApi.get("/api/v1/business")
    : async () => ({ id: "preview", business_name: "", assistant_name: "BizMate" }),
  // The backend resolves the business profile from the workspace (auth context),
  // so the id parameter is accepted for signature compatibility but not sent.
  update: HAS_BACKEND ? (id, data) => httpApi.patch("/api/v1/business", data) : async () => null,
};