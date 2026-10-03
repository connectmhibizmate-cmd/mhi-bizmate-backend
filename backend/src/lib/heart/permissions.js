// MHI BizMate — Heart of BizMate: Permission matrix.
// Maps each action to the minimum workspace role required. The Heart checks
// this BEFORE any business-rule validation or database write.
//
// Workspace roles (from workspace_members.role):
//   FOUNDER     — full access
//   CO_FOUNDER  — full business CRUD, no member management
//   MODERATOR   — business CRUD, no member management
//   MEMBER      — business CRUD (from migration 0003), no member management
//
// Platform roles (profiles.platform_role) are SEPARATE and do not affect
// workspace-level permissions.

const ROLE_RANK = { FOUNDER: 4, CO_FOUNDER: 3, MODERATOR: 2, MEMBER: 1 };

// Minimum role required for each action. Default: MEMBER (lowest).
const PERMISSIONS = {
  // Customer actions — any member can manage customers
  CREATE_CUSTOMER: "MEMBER",
  UPDATE_CUSTOMER: "MEMBER",
  DELETE_CUSTOMER: "MEMBER",

  // Product actions — any member can manage products
  CREATE_PRODUCT: "MEMBER",
  UPDATE_PRODUCT: "MEMBER",
  UPDATE_STOCK: "MEMBER",
  DELETE_PRODUCT: "MEMBER",

  // Lead actions
  CREATE_LEAD: "MEMBER",
  UPDATE_LEAD: "MEMBER",
  DELETE_LEAD: "MEMBER",

  // Order actions
  CREATE_PENDING_ORDER: "MEMBER",
  UPDATE_PENDING_ORDER: "MEMBER",
  CONFIRM_ORDER: "MEMBER",
  CANCEL_ORDER: "MEMBER",
  UPDATE_ORDER_STATUS: "MEMBER",

  // Transactions
  CREATE_TRANSACTION: "MEMBER",
  UPDATE_TRANSACTION: "MEMBER",
  DELETE_TRANSACTION: "MEMBER",

  // Notifications
  CREATE_NOTIFICATION: "MEMBER",
  UPDATE_NOTIFICATION: "MEMBER",
  DELETE_NOTIFICATION: "MEMBER",

  // Sourcing — suppliers
  CREATE_SUPPLIER: "MEMBER",
  UPDATE_SUPPLIER: "MEMBER",
  DELETE_SUPPLIER: "MEMBER",

  // Sourcing — purchases
  CREATE_PURCHASE: "MEMBER",
  UPDATE_PURCHASE: "MEMBER",
  DELETE_PURCHASE: "MEMBER",

  // Marketing — campaigns
  CREATE_CAMPAIGN: "MEMBER",
  UPDATE_CAMPAIGN: "MEMBER",
  DELETE_CAMPAIGN: "MEMBER",

  // Messages
  SEND_MESSAGE: "MEMBER",

  // Business profile — any member can read; only FOUNDER/CO_FOUNDER can update
  UPDATE_BUSINESS_PROFILE: "CO_FOUNDER",
};

export function hasPermission(role, action) {
  const required = PERMISSIONS[action];
  if (!required) return false;
  return (ROLE_RANK[role] || 0) >= (ROLE_RANK[required] || 0);
}

export { PERMISSIONS, ROLE_RANK };