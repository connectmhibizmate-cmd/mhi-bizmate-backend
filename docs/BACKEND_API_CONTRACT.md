# MHI BizMate — Backend API Contract

The MHI BizMate frontend is driver-agnostic: when `VITE_BACKEND_URL` is set, every
adapter routes through `fetch(`${BACKEND_URL}/api/...`)` with a Supabase Bearer
token; when unset, it falls back to direct Supabase (RLS-scoped). This document is
the spec for the professional backend so it can be built to match the frontend
exactly — no UI changes will be needed.

## Conventions

- **Base URL**: the value of `VITE_BACKEND_URL` (no trailing slash), e.g.
  `https://your-backend.fly.dev`.
- **Auth**: every request carries `Authorization: Bearer <supabase access_token>`.
  The backend validates the JWT, resolves the caller's `workspace_id` (1 Account =
  1 Workspace), and enforces tenant isolation server-side. `workspace_id` is
  **never** sent in the body for CRUD — it is derived from the token.
- **Envelope**: all JSON responses use
  `{ "success": true, "data": <payload> }` or
  `{ "success": false, "error": { "code": "...", "message": "..." } }`.
- **Row shape**: data rows are returned in **UI shape** — `id`, `created_date`,
  `updated_date` (ISO strings), plus the entity's fields. The frontend already
  maps DB `created_at`/`updated_at` to these for Supabase; the backend should do
  the same so adapters are identical across drivers.
- **Sort**: `sort` query param is the Base44-style token, e.g. `-created_date`
  (leading `-` = descending). Map `created_date`→`created_at`,
  `updated_date`→`updated_at`, `last_message_time`→`last_message_time`.
- **Errors**: HTTP 4xx/5xx with the error envelope above. The frontend throws an
  `Error` with `.code` and `.status`.

## Products — `/api/products`
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/products?sort=&limit=` | — | `Product[]` |
| POST | `/api/products/filter` | `{ query, sort, limit }` | `Product[]` |
| GET | `/api/products/:id` | — | `Product` |
| POST | `/api/products` | `Product` | `Product` |
| PATCH | `/api/products/:id` | `Partial<Product>` | `Product` |
| DELETE | `/api/products/:id` | — | `null` |
| POST | `/api/products/upload` | multipart `file` | `{ url }` |

UI alias: `stock` ↔ DB `stock_qty`. Images are **public** — each gets a permanent
public URL (product-images bucket equivalent).

## Orders — `/api/orders`
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/orders?sort=&limit=` | — | `Order[]` (with `customer.name` + `items[]`) |
| GET | `/api/orders/:id` | — | `Order` (with relations) |
| PATCH | `/api/orders/:id` | `Partial<Order>` | `Order` |
| DELETE | `/api/orders/:id` | — | `null` |
| GET | `/api/orders/:id/items` | — | `OrderItem[]` |
| POST | `/api/orders/create` | `{ customer_id, items[], discount, delivery_charge, payment_status, status, notes }` | `{ id, order_number }` |

**Atomic**: order + order_items insert and product stock decrement happen in one
transaction; reject if any product would go negative (stock must never be < 0).
On success also update the customer's `total_orders`/`total_spent`.

## Customers — `/api/customers`
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/customers?sort=&limit=` | — | `Customer[]` |
| GET | `/api/customers/:id` | — | `Customer` |
| POST | `/api/customers` | `Customer` | `Customer` (upsert by `phone_normalized` within workspace) |
| PATCH | `/api/customers/:id` | `Partial<Customer>` | `Customer` |
| DELETE | `/api/customers/:id` | — | `null` |

`syncUpdate` is an alias of PATCH. Photos are **public** (business-assets bucket).

## Suppliers — `/api/suppliers` · Purchases — `/api/purchases`
Standard CRUD: `GET ?sort=&limit=`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id`,
`POST /delete-batch { query }`, `POST /bulk-update { records }`, `POST /filter { query, sort, limit }`.

## Transactions — `/api/transactions`
Standard CRUD (same shape as suppliers). Fields: `type` (Income/Expense), `category`,
`amount`, `description`, `date`, `related_order_id`.

## Notifications — `/api/notifications`
Standard CRUD + `bulk-update { records: [{id, read}] }`. Fields: `title`, `body`,
`type` (order/stock/payment/system), `read`, `link`.

## Campaigns — `/api/campaigns`
Standard CRUD. Fields: `name`, `channel`, `budget`, `spent`, `status`
(Active/Scheduled/Completed/Paused), `start_date`, `end_date`, `notes`.

## Automations — `/api/automations`
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/automations?sort=&limit=1` | — | `AutomationSettings[]` (one per workspace) |
| POST | `/api/automations` | `AutomationSettings` | `AutomationSettings` |
| PATCH | `/api/automations/:id` | `Partial` | `AutomationSettings` |
| POST | `/api/automations/usage` | `{ action: "report"\|"allocate", allocations? }` | usage report / allocation result |

Settings booleans: `facebook_comment_reply`, `messenger_ai_assistant`, `product_qa`,
`customer_info_collection`, `order_confirmation`, `followup_12h`.

## Business profile — `/api/business`
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/business` | — | `BusinessProfile \| null` |
| POST | `/api/business` | `{ business_name, assistant_name }` | `BusinessProfile` |
| PATCH | `/api/business/:id` | `Partial` | `BusinessProfile` |

## Conversations / Messages
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/conversations?sort=&limit=` | — | `FacebookConversation[]` |
| GET | `/api/conversations/:id` | — | `FacebookConversation` |
| PATCH | `/api/conversations/:id` | `Partial` | `FacebookConversation` |
| GET | `/api/conversations/:id/messages?sort=&limit=` | — | `FacebookMessage[]` |
| POST | `/api/meta/send-message` | `{ conversation_id, message, ... }` | send result |
| GET | `/api/inbox/messages?userId=&sort=&limit=` | — | `AdminMessage[]` |
| POST | `/api/inbox/messages` | `AdminMessage` | `AdminMessage` |
| POST | `/api/inbox/ai-reply` | `{ ... }` | AI reply result |

Realtime stays on Supabase `postgres_changes` (no backend endpoint needed).

## Meta (Facebook) integration
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/meta/connect` | `{ action: "status"\|"disconnect"\|..., code?, ... }` | connection status / OAuth result |
| GET | `/api/meta/connections?sort=&limit=` | — | `FacebookConnection[]` |

Page access tokens stay server-side only.

## Subscriptions / Billing
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/subscriptions/status` | `{}` | `{ status, effective_plan, plans[], remaining_trial_days, ai_quota_total, subscription_end_at }` |
| POST | `/api/subscriptions/upgrade` | `{ plan_type, payment_amount, transaction_id }` | result |
| POST | `/api/subscriptions/admin/verify` | `{ action, ... }` | admin verify result |
| GET | `/api/subscriptions/payments?sort=&limit=` | — | `PaymentVerification[]` (caller's own) |

## AI gateway
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/ai/gateway` | `{ question, assistant_name, business_name }` | `{ reply }` |

## Admin (super-admin, cross-workspace)
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/admin/panel` | `{ action, ... }` | panel data |
| POST | `/api/admin/control` | `{ action, ... }` | control result |
| POST | `/api/account/delete` | `{}` | deletion result |

## Leads — `/api/leads`
Standard CRUD. Fields: `name`, `phone`, `email`, `status`, `notes`.

## Uploads — `/api/uploads`
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/uploads` | multipart `file` | `{ url }` |

General business assets (customer photos, profile photos, logos). Files are
**public** — each gets a permanent public URL.

## Webhooks (Meta → backend)
- `POST /webhooks/facebook` — Meta Messenger webhook. Writes
  `facebook_conversations` + `facebook_messages` with the page owner's
  `workspace_id` (replaces the current Base44 `facebook-webhook` function).
- Verify with `hub.verify_token`; echo `hub.challenge`.

## Edge Functions (Turn F — implemented, not yet wired to frontend)
- `supabase/functions/ai-gateway/index.ts` — **AI = Employee flow** (Rule #7, #8):
  `POST { employee_id, prompt, context, action }` → `getContext` (JWT →
  workspace_id) → check `ai_policies` for the employee+workspace → if
  `action='confirm_order'` and `can_confirm_order=false`, **block** and log
  `status='blocked'` → otherwise call Gemini (or mock when `GEMINI_API_KEY`
  absent) → log to `ai_activity_logs` (provider, tokens) → return
  `{ reply, blocked }`. **AI never writes business data — only text + its own
  activity log.**
- `supabase/functions/facebook-webhook/index.ts` — Meta webhook. GET verifies
  (`hub.mode=subscribe` + `META_VERIFY_TOKEN` → echo `hub.challenge`). POST
  resolves `workspace_id` from `meta_pages` by `page_id` (1 active page per
  workspace via unique constraint), upserts `conversations` + inserts `messages`,
  then invokes `ai-gateway` internally with the matching employee (Comment AI
  for comments, Messenger AI for messages).
- `supabase/functions/api-backend/index.ts` — Unified CRUD. Routes
  `/api-backend/<resource>` via pathname. **Order atomic logic**: lock products,
  verify `stock_qty >= qty` (reject 409 `INSUFFICIENT_STOCK` if short), insert
  order + `order_items`, call `decrement_stock` RPC, write `audit_logs` +
  `notifications` — stock never goes negative. **Subscription status** (Rule #9):
  backend reads `subscriptions` table and computes trialing/active/expired; the
  frontend cannot self-approve.
- `supabase/functions/_shared/auth.ts` — `getContext(req)` → verifies JWT,
  resolves `workspace_id` + `role` from `profiles`.
- `supabase/functions/_shared/cors.ts` — shared CORS headers.
- `supabase/config.toml` — function config + required secrets.

> The frontend stays on direct Supabase (`HAS_BACKEND=false`) — these functions
> are deployed but not yet invoked by the app. Wiring is a future turn.

## Notes
- **SQL migration implemented**: `supabase/migrations/20241001_full_production.sql`
  (AI policies, activity logs, meta_pages, automations + runs, plans/subscriptions/
  events, notifications, audit_logs — RLS enabled). Executed by the backend team in
  the Supabase SQL Editor; not run from Base44.
- **Edge Function shared helpers**: `supabase/functions/_shared/auth.ts`
  (verify JWT → `{ user_id, workspace_id, role }`) and `_shared/cors.ts`.
- The frontend selects the driver at module load via `HAS_BACKEND`
  (`!!VITE_BACKEND_URL`). With it unset, **all** adapters use direct Supabase —
  so the live app is unaffected until the backend is deployed and the env var set.
- When the backend is ready, set `VITE_BACKEND_URL` in the app dashboard's Secrets
  page and redeploy; no code changes required.