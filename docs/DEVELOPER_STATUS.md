# MHI BizMate — Developer Status Export (A → Z)

**Date:** 2026-10-02
**Build status:** ✅ Passing (`npx vite build` exit 0)
**Published:** ❌ Not published yet (no live URL)

---

## 1. High-Level Summary

MHI BizMate is a mobile-first business management platform (customers, products,
orders, accounting, sourcing, marketing, AI assistant, Facebook/Meta integration,
inbox, subscriptions, and a full admin panel).

The app has gone through a **complete backend reset**. All Base44 entities,
backend functions, Supabase migrations, and shared backend modules were purged.
The **frontend is UI-locked and fully intact** — it renders in preview mode using
offline stubs. **No database, auth, AI, Meta, or payment backend is connected.**

The production backend ("Heart of BizMate") is the next phase: a server-side
orchestration layer between the UI and Supabase/AI/Meta. A full API contract is
already written (`docs/BACKEND_API_CONTRACT.md`).

---

## 2. Architecture — Current State

```
┌─────────────────────────────────────────────┐
│  FRONTEND (React + Vite + Tailwind + shadcn) │  ← INTACT, UI-LOCKED
│  src/pages · src/components · src/hooks      │
└──────────────────┬──────────────────────────┘
                   │ imports from
                   ▼
┌─────────────────────────────────────────────┐
│  API SERVICE LAYER (src/api/*.js)           │  ← ALL OFFLINE STUBS
│  Barrel: src/api/index.js                   │     (empty data / preview data)
└──────────────────┬──────────────────────────┘
                   │ (no live calls — all stubbed)
                   ▼
              ╳  NO BACKEND  ╳   ← Base44 SDK = null, Supabase = null
                                 (pending "Heart of BizMate" rebuild)
```

**Key principle:** Pages/components import ONLY from `@/api` (never from
`@base44/sdk` or `@/api/base44Client` directly). `src/api/index.js` is the single
seam. Swapping stubs → real adapters happens inside `src/api/*.js` only; the UI
stays untouched.

---

## 3. Backend Status — FULLY DISCONNECTED

| Layer | Status | File |
|---|---|---|
| Base44 SDK client | `base44 = null` | `src/api/base44Client.js` |
| Supabase client | `supabase = null`, `isSupabaseConfigured = false` | `src/api/supabaseClient.js` |
| HTTP client | `API_DRIVER = "offline"`, all transports reject | `src/api/client.js` |
| Base44 entities | Only `Subscription.jsonc` remains; all others deleted | `base44/entities/` |
| Base44 functions | All deleted | (none) |
| Supabase migrations | All deleted | (none) |
| Edge Functions | Spec written, not wired to frontend | (see contract doc) |

**Secrets configured in dashboard** (not used by frontend yet):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `ENV_NAME`, `ALLOWED_ORIGINS`.

> The frontend never holds a service-role key. All sensitive operations are
> server-side only (per the contract).

---

## 4. Authentication — PREVIEW PLACEHOLDER

| File | Role |
|---|---|
| `src/lib/AuthContext.jsx` | Exports `AuthProvider` / `useAuth` — delegates to Supabase context (legacy names preserved) |
| `src/lib/SupabaseAuthContext.jsx` | **Preview placeholder.** Returns a fixed `PREVIEW_USER` (id `preview-user`, email `owner@preview.local`, role `admin`). No real auth. |
| `src/api/auth.js` | **Stub.** All methods return preview data; `isAuthenticated()` → true. |

- Auth pages exist & render: `Login`, `Register`, `ForgotPassword`, `ResetPassword`.
- `ProtectedRoute` + `AdminRoute` guard routes (UI-only guards; real security
  must be server-side via Heart of BizMate + RBAC).
- "Continue with Google" removed from Login/Register/Splash per design decisions.

---

## 5. API Service Layer — Module Inventory (all stubs)

| Module | Exports | Behavior |
|---|---|---|
| `_offlineStub.js` | `emptyCrud()` | Empty list/get/noop CRUD factory |
| `auth.js` | `authApi` | Preview user, no real auth |
| `workspace.js` | `workspaceApi` | Returns `preview-workspace` |
| `business.js` | `businessApi` | get→null, createDefault→preview |
| `products.js` | `productsApi` | emptyCrud |
| `customers.js` | `customersApi` | emptyCrud |
| `orders.js` | `ordersApi` | emptyCrud + preview |
| `notifications.js` | `notificationsApi` | emptyCrud |
| `transactions.js` | `transactionsApi` | emptyCrud |
| `sourcing.js` | `sourcingApi` | suppliers/purchases emptyCrud |
| `marketing.js` | `marketingApi` | emptyCrud (campaigns) |
| `leads.js` | `leadsApi` | emptyCrud |
| `automation.js` | `automationApi` | emptyCrud |
| `conversations.js` | `conversationsApi` | empty list/get |
| `integrations.js` | `integrationsApi` | facebook→null, connections→[] |
| `ai.js` | `aiApi` | `ask()` → placeholder reply (honest, not faked) |
| `analytics.js` | `analyticsApi` | delegates to ordersApi |
| `files.js` | `filesApi` | upload→null, signedUrl→passthrough |
| `subscriptions.js` | `subscriptionsApi`, `PLANS` | **Preview data** (plan catalog + trial status) |
| `admin.js` | `adminApi` | **Preview data** per action (dashboard, systemHealth, subscriptions, settings, toggleSubscription) |
| `supabaseHelpers.js` | row mappers | Pure functions kept; CRUD stubs |
| `client.js` | `httpApi`, `tokenStore`, etc. | Inert; rejects with `BACKEND_NOT_CONNECTED` |
| `supabaseClient.js` | `supabase` (null), error helpers | Inert |
| `base44Client.js` | `base44` (null) | Inert |

---

## 6. Subscription & Billing (current focus)

### Plan catalog (`src/api/subscriptions.js` → `PLANS`)
| Key | Label | Price (BDT) | Duration | AI quota |
|---|---|---|---|---|
| TRIAL | Free Trial | 0 | 14 days | 1,200 |
| FREEMIUM | Freemium | 0 | no expiry | 100 |
| STARTER | Starter | 1,499 | 45 days | 5,000 |
| BUSINESS | Business | 4,999 | 180 days | 25,000 |
| BUSINESS_PRO | Business Pro | 9,999 | 365 days | 75,000 |

### User-side (Settings → ProfileSettings `/profile-settings`)
- `src/components/profile/SubscriptionManageCard.jsx` — shows the user's current
  plan, payment verification status (Verified/Pending/Rejected), trial days, and a
  "Verify & Manage Subscription" button → `/subscription`.
- `/subscription` page (`src/pages/Subscription.jsx`) — plan list, payment form,
  payment history (user submits payment proof; admin verifies).

### Admin-side (Admin Panel → `/admin-panel/subscriptions`)
- `src/pages/admin/AdminSubscriptionsBilling.jsx` — KPIs, pending payment
  verifications (approve/reject), and a subscriptions table with per-row
  Active/Inactive toggle. **Separate from user-side — not mixed.**

### Entity
- `base44/entities/Subscription.jsonc` — restored. RLS: admin-only for all ops.

---

## 7. Routes (src/App.jsx)

**Public (9):** `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`,
`/privacy-policy`, `/terms`, `/data-deletion`, `/facebook-callback`

**Protected app (20):** `/home`, `/customers`, `/customers/:id`, `/products`,
`/orders`, `/orders/new`, `/more`, `/analytics`, `/accounting`, `/sourcing`,
`/marketing`, `/reports`, `/ask-bizmate`, `/automation`, `/facebook-connection`,
`/facebook-product-post`, `/inbox`, `/subscription`, `/notifications`,
`/business-profile`, `/profile-settings`, `/profile`, `/my-profile`

**Admin panel (13, under `/admin-panel`):** index (Dashboard), `inbox`, `users`,
`users/:userId`, `subscriptions`, `ai-employees`, `ai-gateway`, `knowledge`,
`automations`, `meta`, `system-health`, `audit-logs`, `team`, `settings`

> `/admin/subscriptions` redirects → `/admin-panel/subscriptions`.

---

## 8. Design System

- Theme: deep navy / neon cyan fintech (tokens in `src/index.css`).
- Tailwind config: `tailwind.config.js` (HSL token classes).
- shadcn/ui components: `src/components/ui/*` (full set).
- Icons: `lucide-react`.
- Mobile-first, responsive (preview at 396px).

---

## 9. Known Issues (carried forward)

- Facebook redirect URI mismatch prevents connection on published app.
- No subscription trial enforcement in route guards (UI-only).
- Order cancel/restore is non-atomic (no backend yet).
- Product data model lacks variant fields (size/color/material).
- AskBizMate leaks raw JSON on backend errors (no backend yet).
- Customer upsert collapses records with empty phone numbers.
- Inbox input bar obscured by BottomNav.
- OrderNew allows quantity exceeding stock.
- FacebookProductPost is a non-functional placeholder.
- Edge Function errors are silently swallowed (not wired).
- Facebook callback CSRF state check is ineffective.

---

## 10. Open TODOs (next phase)

1. **Build "Heart of BizMate"** server-side API layer (Node/Edge).
2. **Reconnect real Supabase** (auth, DB with RLS, realtime).
3. **Replace stubs** in `src/api/*.js` with live adapters (UI untouched).
4. **Wire Edge Functions** (`ai-gateway`, `facebook-webhook`, `api-backend`).
5. **Implement real auth flow** (Supabase Auth → replace preview placeholder).
6. **Hook up Subscription UI** to live DB (status, upgrade, admin verify).
7. **Stripe** available for BD region (for paid plan checkout, when ready).

---

## 11. Key Files Reference

| Purpose | Path |
|---|---|
| Router | `src/App.jsx` |
| API barrel | `src/api/index.js` |
| Auth context | `src/lib/AuthContext.jsx`, `src/lib/SupabaseAuthContext.jsx` |
| Subscription entity | `base44/entities/Subscription.jsonc` |
| User subscription card | `src/components/profile/SubscriptionManageCard.jsx` |
| Admin billing | `src/pages/admin/AdminSubscriptionsBilling.jsx` |
| Backend API contract | `docs/BACKEND_API_CONTRACT.md` |
| Design tokens | `src/index.css`, `tailwind.config.js` |
| Vite config | `vite.config.js` |

---

## 12. How to Reconnect (when backend is ready)

1. Build the Heart of BizMate API per `docs/BACKEND_API_CONTRACT.md`.
2. Replace the stub bodies in `src/api/*.js` with real `fetch(`${BACKEND_URL}/api/...`)`
   calls (or direct Supabase) — keep the same exported names/signatures.
3. Set `VITE_BACKEND_URL` in the app dashboard Secrets page + redeploy.
4. Replace `src/lib/SupabaseAuthContext.jsx` preview placeholder with real
   `supabase.auth` session handling.
5. No UI/page changes required — the seam is entirely in `src/api/`.