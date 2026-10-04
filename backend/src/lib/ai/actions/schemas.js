// MHI BizMate — AI Gateway: Structured action JSON schemas.
//
// These schemas define the EXACT payload structure the AI must return for
// each structured action. They are aligned with the existing Heart of
// BizMate contracts — no conflicting database structures are invented.
//
// Validation flow:
//   AI Output → Schema Validation → Permission Validation → Workspace
//   Validation → Business Rule Validation → Required Field Validation →
//   Duplicate Validation → Heart of BizMate → Execution
//
// In the foundation phase, schema validation is implemented. The remaining
// validation layers are enforced by the Heart's existing execute() function
// and the permission matrix.

// CREATE_LEAD — aligned with leads table + leadHandlers.create()
export const CREATE_LEAD_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", const: "CREATE_LEAD" },
    data: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1, maxLength: 200 },
        phone: { type: "string", maxLength: 30 },
        source: { type: "string", maxLength: 50 },
        notes: { type: "string", maxLength: 2000 },
        customer_id: { type: "string", format: "uuid" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  required: ["action", "data"],
  additionalProperties: false,
};

// CREATE_CUSTOMER — aligned with customers table + customerHandlers.create()
// Used by the Messenger AI to create a new customer through the Heart when no
// existing identity match is found. facebook_id ties the customer to the
// verified Meta sender identity; the DB unique partial index prevents
// duplicates under repeated webhook delivery.
export const CREATE_CUSTOMER_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", const: "CREATE_CUSTOMER" },
    data: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1, maxLength: 200 },
        phone: { type: "string", maxLength: 30 },
        facebook_id: { type: "string", maxLength: 100 },
        email: { type: "string", maxLength: 200 },
        address: { type: "string", maxLength: 500 },
        type: { type: "string", enum: ["Individual", "Retailer", "Wholesaler", "Distributor"] },
        notes: { type: "string", maxLength: 2000 },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  required: ["action", "data"],
  additionalProperties: false,
};

// UPDATE_CUSTOMER — aligned with customers table + customerHandlers.update()
export const UPDATE_CUSTOMER_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", const: "UPDATE_CUSTOMER" },
    data: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string", maxLength: 200 },
        phone: { type: "string", maxLength: 30 },
        email: { type: "string", maxLength: 200 },
        address: { type: "string", maxLength: 500 },
        notes: { type: "string", maxLength: 2000 },
        type: { type: "string", enum: ["Individual", "Retailer", "Wholesaler", "Distributor"] },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  required: ["action", "data"],
  additionalProperties: false,
};

// CREATE_PENDING_ORDER — aligned with heart_create_order RPC
export const CREATE_PENDING_ORDER_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", const: "CREATE_PENDING_ORDER" },
    data: {
      type: "object",
      properties: {
        customer_id: { type: "string", format: "uuid" },
        items: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              product_id: { type: "string", format: "uuid" },
              quantity: { type: "integer", minimum: 1 },
            },
            required: ["product_id", "quantity"],
            additionalProperties: false,
          },
        },
        discount: { type: "number", minimum: 0 },
        delivery_charge: { type: "number", minimum: 0 },
        payment_status: { type: "string", enum: ["Unpaid", "Partial", "Paid"] },
        notes: { type: "string", maxLength: 2000 },
      },
      required: ["customer_id", "items"],
      additionalProperties: false,
    },
  },
  required: ["action", "data"],
  additionalProperties: false,
};

// UPDATE_PENDING_ORDER — aligned with orderHandlers.update()
export const UPDATE_PENDING_ORDER_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", const: "UPDATE_PENDING_ORDER" },
    data: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        notes: { type: "string", maxLength: 2000 },
        payment_status: { type: "string", enum: ["Unpaid", "Partial", "Paid"] },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  required: ["action", "data"],
  additionalProperties: false,
};

// REQUEST_ORDER_CONFIRMATION — asks the owner to approve an order
export const REQUEST_ORDER_CONFIRMATION_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", const: "REQUEST_ORDER_CONFIRMATION" },
    data: {
      type: "object",
      properties: {
        order_id: { type: "string", format: "uuid" },
        order_number: { type: "string" },
        summary: { type: "string", maxLength: 500 },
        customer_name: { type: "string", maxLength: 200 },
        total: { type: "number", minimum: 0 },
      },
      required: ["order_id"],
      additionalProperties: false,
    },
  },
  required: ["action", "data"],
  additionalProperties: false,
};

// SCHEDULE_FOLLOWUP — schedules a follow-up reminder
export const SCHEDULE_FOLLOWUP_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", const: "SCHEDULE_FOLLOWUP" },
    data: {
      type: "object",
      properties: {
        customer_id: { type: "string", format: "uuid" },
        conversation_id: { type: "string", format: "uuid" },
        delay_hours: { type: "integer", minimum: 1, maximum: 720 },
        message: { type: "string", maxLength: 500 },
      },
      required: ["customer_id", "delay_hours"],
      additionalProperties: false,
    },
  },
  required: ["action", "data"],
  additionalProperties: false,
};

// UPDATE_PRODUCT — aligned with products table + productHandlers.update()
export const UPDATE_PRODUCT_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", const: "UPDATE_PRODUCT" },
    data: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string", maxLength: 200 },
        description: { type: "string", maxLength: 2000 },
        price: { type: "number", minimum: 0 },
        cost: { type: "number", minimum: 0 },
        stock: { type: "integer", minimum: 0 },
        category: { type: "string", maxLength: 100 },
        status: { type: "string", enum: ["active", "archived"] },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  required: ["action", "data"],
  additionalProperties: false,
};

// CREATE_PRODUCT — aligned with products table + productHandlers.create()
export const CREATE_PRODUCT_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", const: "CREATE_PRODUCT" },
    data: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1, maxLength: 200 },
        description: { type: "string", maxLength: 2000 },
        sku: { type: "string", maxLength: 100 },
        category: { type: "string", maxLength: 100 },
        price: { type: "number", minimum: 0 },
        cost: { type: "number", minimum: 0 },
        stock: { type: "integer", minimum: 0 },
        status: { type: "string", enum: ["active", "archived"] },
      },
      required: ["name", "price"],
      additionalProperties: false,
    },
  },
  required: ["action", "data"],
  additionalProperties: false,
};

// CREATE_NOTIFICATION — aligned with notifications table + notificationHandlers.create()
// Used by the Support AI to escalate an unsolvable user problem to the admin
// team as a persistent report. Workspace-scoped; no direct database access.
export const CREATE_NOTIFICATION_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", const: "CREATE_NOTIFICATION" },
    data: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1, maxLength: 200 },
        body: { type: "string", maxLength: 2000 },
        type: { type: "string", maxLength: 50 },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  required: ["action", "data"],
  additionalProperties: false,
};

// CONVERSATION_RESPONSE — unified output schema for customer-facing employees.
// The AI returns a conversational reply AND optionally a structured action.
// If "action" is null/absent, the reply is returned as-is.
// If "action" is present, { action, data } is validated against the specific
// action schema (e.g., CREATE_LEAD_SCHEMA) before reaching the Heart.
export const CONVERSATION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string", minLength: 1, maxLength: 2000 },
    action: { type: "string", nullable: true, maxLength: 50 },
    data: { type: "object" },
  },
  required: ["reply"],
  additionalProperties: false,
};

export const ACTION_SCHEMAS = {
  CREATE_CUSTOMER: CREATE_CUSTOMER_SCHEMA,
  CREATE_LEAD: CREATE_LEAD_SCHEMA,
  UPDATE_CUSTOMER: UPDATE_CUSTOMER_SCHEMA,
  CREATE_PENDING_ORDER: CREATE_PENDING_ORDER_SCHEMA,
  UPDATE_PENDING_ORDER: UPDATE_PENDING_ORDER_SCHEMA,
  REQUEST_ORDER_CONFIRMATION: REQUEST_ORDER_CONFIRMATION_SCHEMA,
  SCHEDULE_FOLLOWUP: SCHEDULE_FOLLOWUP_SCHEMA,
  UPDATE_PRODUCT: UPDATE_PRODUCT_SCHEMA,
  CREATE_PRODUCT: CREATE_PRODUCT_SCHEMA,
  CREATE_NOTIFICATION: CREATE_NOTIFICATION_SCHEMA,
};