// MHI BizMate — AI Gateway: Context Engine entry.
//
// Re-exports all context builders. AI Employees import from here, not from
// the builders module directly, so the engine can evolve independently.

export {
  buildProductContext,
  buildCustomerContext,
  buildConversationContext,
  buildLeadContext,
  buildPendingOrderContext,
  buildBusinessIntelContext,
  buildAdminSupportContext,
} from "./builders.js";