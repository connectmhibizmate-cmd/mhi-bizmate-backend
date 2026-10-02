# MHI BizMate — STEP 2: Real Authentication + Workspace + RBAC

**Date:** 2026-10-02
**Step:** 2 of the production rebuild (Auth + Workspace + RBAC foundation)
**Build:** ✅ Passing (`npx vite build` exit 0)
**UI changes:** ❌ None — no colors, layout, routes, buttons, or typography touched. Only functional auth/RBAC wiring changed.

---

## 1. COMPLETED

- Real Supabase Auth client (`src/api/supabaseClient.js`) using browser-safe anon key only.
- Real auth context (`src/lib/SupabaseAuthContext.jsx`): session restore, `onAuthStateChange`, profile/role/workspace resolution, loading/blocked/not-registered states.
- Real `authApi` (`src/api/auth.js`): sign in, sign up, sign out, reset request, reset password, session, friendly error mapping.
- Auth pages wired to real Supabase (Login, Register, ForgotPassword, ResetPassword) — no UI changes, only the backing calls are real.
- API client token attachment (`src/api/client.js`): Supabase session JWT → `Authorization: Bearer` to Heart of BizMate; offline mode preserved when no backend.
- Role-based admin guard (`src/components/AdminRoute.jsx`): hardcoded email removed; admin = FOUNDER (server-derived).
- Role helper module (`src/lib/roles.js`): FOUNDER / CO_FOUNDER / MODERATOR / PLATFORM_ADMIN.
- `useWorkspace` hook (`src/hooks/useWorkspace.js`): derives workspace_id + role from real session/profile.
- UI role checks updated to real roles (More, MyProfile, AdminSubscriptions) — visibility only, not authorization.
- Full SQL migration authored (`supabase/migrations/0001_auth_workspace_rbac.sql`): tables, triggers, RLS, invitation RPC.
- Security scan: no service-role key, no JWT secret, no DB password in frontend source.
- Build verified after all changes.

## 2. AUTHENTICATION IMPLEMENTATION

- **Sign up:** `supabase.auth.signUp` with `emailRedirectTo`. The `handle_new_user` trigger auto-creates workspace + profile (FOUNDER) + member row. If Supabase email-confirm is ON, no session returns → "check your email" screen (existing UI). If auto-confirm, session returns → redirect to `/home`.
- **Sign in:** `supabase.auth.signInWithPassword`. Errors mapped: "Incorrect email or password", "Please confirm your email", rate-limit.
- **Sign out:** `supabase.auth.signOut` + clear local state + redirect to `/login`.
- **Session persistence:** `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true` (Supabase JS client). Survives refresh.
- **Session restoration:** `supabase.auth.getSession()` on provider mount.
- **Auth state loading:** `isLoadingAuth` true until first session resolves; `ProtectedRoute` shows spinner.
- **Invalid/expired session:** `onAuthStateChange` fires `SIGNED_OUT`; context clears → protected routes redirect to login.
- **Password reset:** `resetPasswordForEmail` (request) + `updateUser({password})` (after recovery link restores session). Generic success on request (no enumeration).
- **Email verification:** handled by Supabase email-confirm setting + redirect.

`PREVIEW_USER` / `preview-user` / `owner@preview.local` / fixed fake auth are **removed from the auth path** (`SupabaseAuthContext.jsx`, `auth.js`).

## 3. WORKSPACE MODEL

- **1 Account → 1 Workspace → 1 Facebook Page.** On signup, `handle_new_user` creates one workspace, sets the user as FOUNDER, and creates a `workspace_members` row.
- Tables: `profiles` (1:1 with `auth.users`), `workspaces` (founder_user_id), `workspace_members` (workspace_id + user_id + role + status), `workspace_invitations`.
- `profiles.workspace_id` ties the identity to its workspace. Every workspace-owned resource (added in later steps) will carry `workspace_id` and be RLS-scoped.
- Architecture is forward-compatible: `workspace_members` is many-to-one, so multi-member and future multi-workspace expansion need no schema rewrite.

## 4. RBAC IMPLEMENTATION

- Roles: **FOUNDER** (full control, member management, sensitive settings), **CO_FOUNDER** (max 2, broad business, no ownership/security), **MODERATOR** (operational, no ownership/security).
- `role` and `status` live on `profiles` (server-derived). A **BEFORE UPDATE trigger** (`protect_profile_privileged_cols`) forces these columns back to old values when the caller is the profile owner — a user **cannot** self-escalate role/status/workspace_id.
- Admin Panel access = FOUNDER (`AdminRoute` + UI visibility). A future **PLATFORM_ADMIN** role is reserved in the check constraint for cross-workspace super-admin (to be granted server-side only).
- **Authorization is NOT done by hiding buttons.** UI visibility is UX; real enforcement is RLS + the Heart of BizMate backend.

## 5. RLS POLICIES

All four tables have RLS enabled. Least-privilege, workspace-scoped:

- **profiles:** self read/update only; no client insert/delete (trigger manages). Privileged cols protected by trigger.
- **workspaces:** members read; founder manage.
- **workspace_members:** members read; **founder-only** insert/update/delete (membership privilege escalation blocked).
- **workspace_invitations:** members read; **founder-only** manage.
- Helper `my_workspace_ids()` returns active-membership workspace ids for the current user.
- Cross-workspace read/write/update/delete is denied (policy `workspace_id in (select my_workspace_ids())`).
- Role escalation denied (trigger). Membership modification by non-founders denied (policy).

**Required verification scenarios** (must be run against the migrated DB — see §9): founder access, co-founder access, moderator access, cross-workspace denial, self-role-change denial, non-founder membership change denial, unauthenticated denial.

## 6. INVITATION FOUNDATION

- `workspace_invitations` table: token, invited email, intended role (CO_FOUNDER/MODERATOR only), status, `expires_at` (7 days), `invited_by`, `accepted_at`, `accepted_user_id`.
- **No client-side acceptance.** `accept_invitation(token)` is a `SECURITY DEFINER` RPC that validates token, expiration, and status, then creates the membership inside the function. Clients cannot insert into `workspace_members` for an invitation.
- Co-founder limit (max 2) enforced by `enforce_cofounder_limit` trigger on insert/update.
- Founder ownership protected: only FOUNDER can manage members/invitations (RLS); FOUNDER role cannot be removed by normal members (trigger blocks non-service role changes).
- Existing frontend invitation UI (if any) will be connected in a later step without redesign.

## 7. API AUTHENTICATION FLOW

```
Browser (anon key only)
  └─ supabase.auth → session.access_token (JWT)
       └─ httpApi attaches Authorization: Bearer <JWT>
            └─ Heart of BizMate backend
                  1. validate JWT (Supabase JWK)
                  2. resolve user
                  3. resolve workspace membership + role (server query)
                  4. establish trusted request context
                  5. enforce authorization before business ops
```

- `setAccessTokenResolver` in `SupabaseAuthContext` feeds the live session token to `httpApi`.
- The browser **never** declares "I am Founder" / "I belong to workspace X" / "I can do Y". The backend derives all of it from the validated token.
- No privileged credentials in browser code. Offline mode (no `VITE_BACKEND_URL`) keeps `httpApi` rejecting — no unauthenticated call leaks.

## 8. SECURITY VERIFICATION

| Check | Result |
|---|---|
| Service-role key in frontend | ❌ None (scan clean) |
| DB password in frontend | ❌ None |
| JWT signing secret in frontend | ❌ None |
| Backend secret in Base44 source | ❌ None |
| Auth based only on localStorage | ❌ No — Supabase session JWT |
| Role auth based only on frontend state | ❌ No — server-derived profile.role |
| User-controlled workspace isolation | ❌ No — workspace_id from profiles (trigger-protected) |
| Insecure invitation acceptance | ❌ No — SECURITY DEFINER RPC validates |
| Privilege escalation path | ❌ Blocked by BEFORE UPDATE trigger |
| Cross-tenant data access | ❌ Blocked by RLS my_workspace_ids() |
| Secure session handling | ✅ Supabase managed JWT, auto-refresh |
| Safe error responses | ✅ Friendly messages, no stack traces |
| Secrets in logs | ❌ None logged |

## 9. TEST RESULTS

**Frontend build:** ✅ Pass (exit 0, no broken imports).

**Automated live tests (sign up/in/out, RLS scenarios):** ⚠️ **NOT RUN** — these require the SQL migration to be applied to the Supabase project and real user accounts. They cannot be executed from the Base44 frontend repo.

The migration file is ready at `supabase/migrations/0001_auth_workspace_rbac.sql`. After the client applies it, the following must be verified in Supabase:

- AUTH: sign up → profile+workspace auto-created; sign in; sign out; refresh restores session; invalid credentials → friendly error; expired session → redirect to login.
- WORKSPACE: user gets correct workspace_id; cross-workspace query denied.
- RBAC: founder can manage members; co-founder cannot change ownership; moderator cannot access founder-only ops; role escalation rejected by trigger.
- RLS: own-workspace access OK; other-workspace denied; non-founder membership edit denied; unauthenticated denied.
- API: missing token → 401; invalid token → 401; authenticated-but-unauthorized → 403; valid → correct response (requires Heart of BizMate backend, Step 3+).

**Regression:** all 42 routes resolve; `@/api` seam intact; existing design unchanged; no broken imports.

## 10. BUILD RESULT

`npx vite build` → **exit 0**, no errors. All auth imports resolve; `@supabase/supabase-js` (already installed) used via anon key only.

## 11. REMAINING PREVIEW/STUB DEPENDENCIES

- `src/api/supabaseHelpers.js` → `getCurrentUserId()` still returns `"preview-user"` (residual import-compat helper). Not in the auth path; will be removed/replaced when its consumers migrate.
- `src/api/admin.js`, `subscriptions.js`, etc. still return preview data — these are Step 4 adapter swaps (signatures unchanged).
- `src/pages/admin/AdminTeam.jsx` references `admin@mhigroupbd.com` as a UI disable-rule for blocking a specific member row (not an auth guard). Cosmetic; can be made data-driven later.
- `VITE_BACKEND_URL` is unset → API stays offline; live data adapter swap is Step 4.

## 12. KNOWN RISKS

1. **Migration not yet applied.** Until `0001_auth_workspace_rbac.sql` runs in Supabase, a signed-in user has no `profiles` row → `authError: user_not_registered` → `UserNotRegisteredError` screen. This is expected and safe (no access granted without a profile).
2. **No live backend.** `httpApi` rejects in offline mode; the Bearer-token flow is wired but cannot be exercised until the Heart of BizMate API exists (Step 3+).
3. **Email-confirm setting.** If Supabase requires email confirmation, new users see "check your email" and have no session until confirmed. The `handle_new_user` trigger fires on confirmed signup. Confirm the Supabase project's email-confirm setting matches the desired UX.
4. **PLATFORM_ADMIN not yet granted.** Admin Panel is FOUNDER-only today. If a platform super-admin is needed, grant `role='PLATFORM_ADMIN'` server-side (never via client).
5. **Admin pages still use preview data** (admin.js stubs). A founder can browse the Admin Panel, but the data is fake until Step 4.

## 13. NOT PRODUCTION READY

**NOT PRODUCTION READY — REASON:**

1. The SQL migration (`supabase/migrations/0001_auth_workspace_rbac.sql`) has **not been applied** to the Supabase project, so real auth/profile/workspace/RLS is not active in a live environment.
2. RLS and RBAC have **not been verified against real authenticated users** (cannot be done from the frontend repo).
3. The Heart of BizMate backend (token validation, workspace/role resolution, authorization) **does not exist yet** (Step 3+); the API client is wired but has no live endpoint.

The frontend is correctly wired and build-clean, but production readiness requires applying the migration, running the verification scenarios in §9, and building the backend.

## 14. REQUIRED CLIENT ACTIONS

1. **Apply the migration:** run `supabase/migrations/0001_auth_workspace_rbac.sql` in the Supabase SQL Editor (or `supabase db push`).
2. **Confirm Supabase settings:** email-confirm ON/OFF as desired; add `https://mhibizmate.base44.app/reset-password` and `.../home` to the Supabase auth redirect URL allowlist.
3. **Verify env secrets** are set in the dashboard: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend); `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (backend only — never frontend).
4. **Run the §9 verification scenarios** against the migrated project.
5. **Confirm the founder/admin email** that should own the first workspace (the first signup becomes FOUNDER of its own workspace automatically).

## 15. YOUR OPINION

Step 2 is correctly implemented at the frontend and schema level: real Supabase Auth, server-derived roles, trigger-protected escalation, least-privilege RLS, and a server-authoritative invitation RPC. The architecture cleanly separates authentication identity (Supabase user) from application membership (workspace + role), and the browser is never trusted for authorization.

The single biggest gate to production is **applying and verifying the migration**. I recommend the client apply `0001_auth_workspace_rbac.sql` now and run the §9 scenarios before any further steps — because every later step (orders, AI, Meta, billing) depends on this auth/workspace/RLS foundation being correct and verified.

## 16. STEP 3 HANDOFF

Step 3 should build the **Heart of BizMate backend** that:
- validates the Supabase JWT,
- resolves user → workspace membership → role,
- enforces authorization before every business operation,
- exposes the endpoints defined in `docs/BACKEND_API_CONTRACT.md`,
- and is reachable via `VITE_BACKEND_URL` (set in dashboard Secrets when deployed).

Once the backend exists, Step 4 swaps the `src/api/*.js` stub bodies for live adapter calls (signatures unchanged, no UI changes), and the offline/preview stubs are retired.