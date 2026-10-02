# MHI BizMate — STEP 1: Foundation & Frontend/Backend Contract Lock

**Date:** 2026-10-02
**Step:** 1 of the production rebuild (audit + contract lock only — NO backend built)
**Build:** ✅ Passing (`npx vite build` exit 0, no new errors)
**UI changes:** ❌ None (UI is LOCKED — no colors, layout, routes, or buttons touched)

---

## 1. COMPLETED

- Full frontend structure audit (all pages, routes, components, hooks).
- Full `src/api/` layer audit — every module, export, and consumer mapped.
- Preview/stub identification — every fake/offline data source located.
- Authentication audit — preview placeholder located and boundary preserved.
- Subscription audit — user-side and admin-side separation confirmed.
- Security scan of frontend source for exposed credentials.
- **Env-based backend config placeholder added** to `src/api/client.js`
  (`VITE_BACKEND_URL` → switches `API_DRIVER` from `offline` → `backend`).
  No production URL hardcoded; unset = current offline/preview mode.
- API contract boundary (`src/api/index.js` single seam) preserved and documented.
- Build verified after the one config change.

## 2. VERIFIED

- `npx vite build` succeeds (exit 0), no compilation/import errors.
- All 42 routes resolve (9 public + 20 protected app + 13 admin).
- All `@/api` imports resolve — no broken API imports.
- No accidental UI changes (only `src/api/client.js` config constants changed).
- No secrets/keys found in frontend source (see §5).
- `API_DRIVER` stays `"offline"` when `VITE_BACKEND_URL` is unset → no behavior change.

## 3. API DEPENDENCY MAP

Single seam: **`src/api/index.js`** — pages/components import ONLY from `@/api`,
never from `@base44/sdk` or `@/api/base44Client` directly. 24 modules:

| Module | Exports | Consumers (pages/components/hooks) | Responsibility |
|---|---|---|---|
| `auth.js` | `authApi` | Login, Register, ForgotPassword, ResetPassword, MyProfile, EditProfile | Login/register/OTP/reset/session/me |
| `workspace.js` | `workspaceApi` | (via useWorkspace hook) | Workspace resolve/create |
| `business.js` | `businessApi` | useBusinessProfile | Business profile CRUD |
| `products.js` | `productsApi` | Products, Orders, OrderNew, ProductFormDialog | Product CRUD + upload |
| `customers.js` | `customersApi` | Customers, CustomerDetail, Orders, OrderNew, Analytics, Reports, CustomerFormDialog | Customer CRUD |
| `orders.js` | `ordersApi` | Home, Orders, OrderNew, CustomerDetail, Analytics, Reports | Order CRUD + create atomic |
| `notifications.js` | `notificationsApi` | Home, Notifications | Notification CRUD + bulk-read |
| `transactions.js` | `transactionsApi` | Accounting, Orders, TransactionFormDialog | Income/expense CRUD |
| `sourcing.js` | `sourcingApi` | Sourcing, SupplierFormDialog, PurchaseFormDialog | Suppliers + purchases CRUD |
| `marketing.js` | `marketingApi` | Marketing, CampaignFormDialog | Campaign CRUD |
| `leads.js` | `leadsApi` | (no direct consumer — reserved) | Lead CRUD |
| `automation.js` | `automationApi` | Automation, AiUsagePanel, useAutomationSettings | Automation settings + AI usage |
| `conversations.js` | `conversationsApi` | Inbox | Facebook conversations/messages |
| `integrations.js` | `integrationsApi` | FacebookConnection, facebook-callback, Automation, MyProfile | Meta connection status |
| `ai.js` | `aiApi` | AskBizMate | AI gateway ask() |
| `analytics.js` | `analyticsApi` | (delegates to ordersApi) | Analytics aggregation |
| `files.js` | `filesApi` | EditProfile, CustomerFormDialog | Public/private upload + signed URL |
| `subscriptions.js` | `subscriptionsApi`, `PLANS` | Subscription, SubscriptionManageCard, UpgradeForm, AdminSubscriptionsBilling, AdminSubscriptions, useSubscription | Plan catalog + status + upgrade + admin verify |
| `admin.js` | `adminApi` | All 13 admin pages + AdminPanel + AdminUserView + UserDetailDrawer + MyProfile | Admin panel/control (dashboard, systemHealth, subscriptions, settings, toggle) |
| `supabaseClient.js` | `supabase`(null), `isSupabaseConfigured`(false), error helpers | (inert) | Supabase client (removed) |
| `supabaseHelpers.js` | row mappers, `getCurrentUserId` | residual imports | Row normalization (pure fns) |
| `client.js` | `API_BASE_URL`, `API_DRIVER`, `HAS_BACKEND`, `httpApi`, `tokenStore`, `backendCrud`, `invoke` | (transport layer) | HTTP transport + env config |
| `base44Client.js` | `base44`(null) | (inert) | Base44 SDK (removed) |
| `_offlineStub.js` | `emptyCrud()` | all CRUD modules | Empty CRUD factory |

> **Note:** `workspaceApi`, `analyticsApi`, `leadsApi`, `supabase`,
> `isSupabaseConfigured` have no direct page-level importers today — they are
> consumed indirectly (hooks) or reserved. Their exports are preserved to avoid
> breaking the barrel.

## 4. PREVIEW / STUB DEPENDENCIES (fake → later replaced)

| What | Where | Current fake value |
|---|---|---|
| Preview user | `src/lib/SupabaseAuthContext.jsx` (`PREVIEW_USER`) | id `preview-user`, email `owner@preview.local`, role `admin` |
| Preview user (auth API) | `src/api/auth.js` (`PREVIEW_USER`) | same; `isAuthenticated()` → true |
| Preview workspace | `src/api/workspace.js`, `useWorkspace.js`, `supabaseHelpers.js` | id `preview-workspace`, role `founder` |
| Preview subscription status | `src/api/subscriptions.js` `status()` | TRIAL_ACTIVE, 14 days, 1200 AI quota |
| Preview verifications | `src/api/subscriptions.js` + `admin.js` (`PREVIEW_VERIFICATIONS`) | 1 fake pending STARTER payment |
| Preview admin subs | `src/api/admin.js` (`PREVIEW_SUBS`) | 3 fake subscription rows |
| Preview admin config | `src/api/admin.js` (`PREVIEW_CONFIG`) | platformName, supportEmail, trialDays |
| Preview admin dashboard | `src/api/admin.js` `control({action:"dashboard"})` | fake KPIs, userGrowth, conversion, aiOps |
| Preview system health | `src/api/admin.js` `control({action:"systemHealth"})` | 4 services = standby/paused |
| AI placeholder reply | `src/api/ai.js` `ask()` | hardcoded "not connected" string |
| Empty CRUD | `_offlineStub.js` `emptyCrud()` | list→[], get→null, create/update→null |
| Offline transport | `src/api/client.js` `httpApi`/`invoke` | reject with `BACKEND_NOT_CONNECTED` |
| Super-admin email | `src/components/AdminRoute.jsx` | hardcoded `admin@mhigroupbd.com` (UI guard only) |
| Plan catalog | `src/api/subscriptions.js` `PLANS` | 5 hardcoded plans (Trial→Business Pro) |

All of the above is **intentionally fake and clearly labeled** in source. None
of it will be moved into the backend; it will be **replaced** by real adapters
inside `src/api/*.js` when the backend is ready. UI stays untouched.

## 5. SECURITY FINDINGS

**No exposed credentials found in frontend source.** Scanned for:
service-role keys, `SUPABASE_SERVICE_ROLE`, `sk_live`/`sk_secret`, Meta App
Secret, `GEMINI_API_KEY`/`OPENAI_API_KEY`, Stripe secret, webhook secret,
encryption key, `client_secret`, and hardcoded backend URLs.

- ✅ `src/api/supabaseClient.js` → `supabase = null`, no URL/key in source.
- ✅ `src/api/base44Client.js` → `base44 = null`.
- ✅ `src/api/client.js` → no secrets; `API_BASE_URL` now env-driven, empty by default.
- ✅ The only references to key names (`GEMINI_API_KEY`) and a sample backend URL
  (`https://your-backend.fly.dev`) are in **documentation**
  (`docs/BACKEND_API_CONTRACT.md`), not executable code.

**Dashboard secrets exist** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, etc.) but are
**not referenced or imported by frontend source** — they are reserved for the
future server-side backend. The service-role key must NEVER reach the browser.

**No rotation required at this step** (nothing was exposed). When the backend is
built, all privileged credentials stay server-side only.

## 6. FRONTEND/BACKEND CONTRACT

```
Base44 Frontend (LOCKED)
      │  imports only from @/api (single seam: src/api/index.js)
      ▼
Authenticated Secure API  ←  Authorization: Bearer <supabase access_token>
      │                     ←  VITE_BACKEND_URL (env, dashboard Secrets)
      ▼
Business Service / Heart of BizMate
      │
      ▼
Supabase · AI Gateway · Meta Connector · Billing · Audit · Usage
```

**Current boundary:** `src/api/*.js` modules export named functions with stable
signatures. Today they return stub/preview data. The real backend adapter
replaces the **bodies** of these functions with `fetch(`${BACKEND_URL}/api/...`)`
calls (or direct Supabase) — **exported names and signatures stay identical**, so
no frontend file changes.

**Env config (added this step):** `src/api/client.js` now derives
`API_BASE_URL` / `BACKEND_URL` / `HAS_BACKEND` / `API_DRIVER` from
`import.meta.env.VITE_BACKEND_URL`. Unset → `offline` (current). Set → `backend`.
No URL is hardcoded.

**What the real backend must provide** (full spec in `docs/BACKEND_API_CONTRACT.md`):
products, orders (atomic create + stock), customers (upsert by phone),
suppliers, purchases, transactions, notifications, campaigns, automations,
business profile, conversations/messages, Meta connect, inbox, subscriptions
(status/upgrade/admin-verify/payments), AI gateway, admin panel/control, leads,
uploads, webhooks. Standard envelope `{ success, data }` / `{ success, error }`.
JWT auth, server-derived `workspace_id`, tenant isolation, RLS.

**Error handling the adapter must normalize** (user-friendly, no raw stack traces):
200 success · 400 validation · 401 auth · 403 permission · 404 not found ·
409 conflict · 422 business validation · 429 rate limit · 500 server ·
502/503 dependency · timeout/network. Existing UI error UX (toasts, inline
errors, `AdminError`/`EmptyState` components) is preserved — the adapter throws
`Error` with `.code`/`.status`; pages keep their current catch-and-display.

## 7. REMAINING (later phases — NOT this step)

- **Step 2:** Real Supabase Auth — replace `SupabaseAuthContext.jsx` preview with
  `supabase.auth` session + `profiles` row; replace `auth.js` stub.
- **Step 3:** Heart of BizMate API build (Node/Edge) per contract.
- **Step 4:** Replace `src/api/*.js` stub bodies with live adapters (signatures unchanged).
- **Step 5:** Wire Edge Functions (ai-gateway, facebook-webhook, api-backend).
- **Step 6:** Billing (Stripe, available in BD region) for paid plan checkout.
- **Step 7:** Meta OAuth + webhooks, AI Gateway, AI Employees, Automation Engine.
- **Step 8:** Usage tracking, audit logging, monitoring, backup/recovery.
- Set `VITE_BACKEND_URL` in dashboard Secrets + redeploy when backend is live.

## 8. RISKS

1. **UI-only route guards are not security.** `ProtectedRoute` and `AdminRoute`
   rely on the preview user (`role: admin`). Real enforcement MUST be server-side
   (JWT + RBAC + RLS) in Step 2+. A non-admin can currently browse admin URLs in
   preview mode — acceptable now, fatal in production.
2. **`AdminRoute` super-admin email is hardcoded** (`admin@mhigroupbd.com`) as a
   UI guard. Must be replaced by a server-returned `role`/permission in Step 2.
3. **No trial/subscription enforcement anywhere** — preview always returns
   TRIAL_ACTIVE. Backend must compute real status; frontend cannot self-approve.
4. **Order stock/atomicity not enforced** — no backend yet; `OrderNew` can exceed
   stock. Backend must reject (409 `INSUFFICIENT_STOCK`) per contract.
5. **`leadsApi`, `analyticsApi`, `workspaceApi` have thin/no direct consumers** —
   verify they are still needed before wiring, to avoid dead adapters.
6. **Stale preview data could be mistaken for real data** by a reviewer — all
   stubs are labeled, but the admin dashboard shows non-zero KPIs in preview.

## 9. CLIENT DECISION

- **Super-admin email:** `admin@mhigroupbd.com` is hardcoded as the UI admin
  guard. Confirm this is the correct production admin email (or provide the real
  one) so Step 2 can wire it to the `profiles.role` server-side check.
- **Backend URL:** not yet available. No action needed now — when the Heart of
  BizMate API is deployed, provide its URL via the dashboard Secrets page
  (`VITE_BACKEND_URL`) and redeploy. No code change required.

## 10. YOUR OPINION (recommendation)

The frontend is in excellent shape for this transition: a clean single-seam API
boundary (`src/api/index.js`), clearly-labeled stubs, no exposed secrets, and a
full backend contract already written. Step 1 is complete — the frontend is
visually and functionally intact with a stable, replaceable API boundary.

**Recommended next step (Step 2):** implement real Supabase Auth first. Auth is
the foundation every other adapter depends on (the Bearer token, workspace_id,
and role all come from the session). Replace `SupabaseAuthContext.jsx` +
`src/api/auth.js` with real `supabase.auth` wiring, add the `profiles` table
with RLS + the role/status BEFORE UPDATE trigger, and switch `AdminRoute` to the
server-returned role. Once auth is real, the remaining adapters can be swapped
one module at a time without touching the UI.

> ⚠️ This step does NOT make the application production-ready. It is only
> FOUNDATION & FRONTEND/BACKEND CONTRACT LOCK.