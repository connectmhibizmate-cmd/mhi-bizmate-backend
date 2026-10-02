-- ============================================================================
-- MHI BizMate — STEP 2: Auth, Workspace, RBAC & RLS migration
-- ============================================================================
-- Run this in the Supabase SQL Editor (or via `supabase db push`).
--
-- SECURITY MODEL
--   * The browser uses ONLY the anon key (VITE_SUPABASE_ANON_KEY).
--   * The service-role key (SUPABASE_SERVICE_ROLE_KEY) is NEVER exposed to the
--     frontend; it is reserved for the Heart of BizMate backend.
--   * Authorization is derived from the authoritative `workspace_members` table.
--     `profiles.role` / `profiles.workspace_id` are NON-authoritative UI caches
--     (see ROLE AUTHORITY MODEL below) and cannot be changed by the client.
--   * A BEFORE UPDATE trigger blocks clients from escalating their own
--     role / status / workspace_id / email.
--   * A BEFORE UPDATE trigger blocks clients from changing workspace ownership
--     (founder_user_id) or Meta page connection (facebook_page_id).
--   * RLS enforces workspace isolation: a user may access a row only when they
--     have an active membership in that workspace. Founder-only management
--     operations are guarded by SECURITY DEFINER helper functions to avoid
--     self-recursive RLS evaluation on `workspace_members`.
--
-- ONBOARDING MODEL (1 Account -> 1 Workspace)
--   * handle_new_user() decides onboarding SERVER-SIDE by checking for a
--     pending, unexpired invitation matching the new user's email:
--       - Invitation signup: create the profile ONLY (no personal workspace,
--         no Founder membership). The user completes onboarding by calling
--         accept_invitation(token), which creates the membership in the
--         invited workspace with the role taken ONLY from the invitation.
--       - Normal signup: create exactly one workspace, one profile, one
--         Founder membership.
--   * accept_invitation() rejects a caller who already has ANY active
--     membership, so an account can never belong to more than one workspace.
--   * Clients cannot insert/update/delete workspace_members directly (RLS is
--     read-only for clients); all membership writes go through the
--     accept_invitation() RPC or the service-role backend (Step 3).
--
-- ROLES: FOUNDER, CO_FOUNDER (max 2 ACTIVE per workspace), MODERATOR.
--   PLATFORM_ADMIN is reserved for platform-level administration and is NEVER
--   used as a substitute for workspace membership authorization.
--
-- ROLE AUTHORITY MODEL
--   * `workspace_members.role` is the SINGLE AUTHORITATIVE role for all
--     workspace authorization decisions (RLS, helper functions, RPCs).
--   * `profiles.role` is a denormalized cache for quick UI checks only. It is
--     set at signup (FOUNDER) and may only be changed by the service role
--     (auth.uid() IS NULL). It MUST NOT be trusted for authorization; every
--     policy and RPC resolves role via `workspace_members`.
--   * `profiles.workspace_id` is a UI cache pointing to the user's active
--     workspace. It is protected from client changes. The Heart of BizMate
--     backend (Step 3) keeps it synchronized with membership changes.
--
-- EXISTING-USERS MIGRATION (IMPORTANT)
--   This migration creates schema, triggers, and RLS only. It does NOT backfill
--   profiles/workspaces/memberships for auth.users that already exist in the
--   project at the time the migration is applied: handle_new_user() fires only
--   on NEW auth.users inserts, so pre-existing users are left untouched (no
--   duplicate creation, no auto-assignment to a workspace). Backfilling
--   existing users is an explicit manual/backend task because their intended
--   workspace cannot be determined safely from available data. New users
--   continue to use the server-side onboarding logic below.
--
-- CO-FOUNDER LIMIT CONCURRENCY STRATEGY
--   A plain SELECT COUNT(*) trigger can race under concurrent transactions.
--   To enforce "max 2 ACTIVE Co-Founders per workspace" safely, the
--   `enforce_cofounder_limit` trigger takes a per-workspace row-level lock
--   (`SELECT ... FOR UPDATE` on the parent `workspaces` row) before counting.
--   This serializes concurrent Co-Founder insert/update operations within the
--   same workspace, so two near-simultaneous requests cannot both pass the
--   count check. The same workspace-row lock is taken inside
--   `accept_invitation`, so invitation acceptance and direct member
--   management are mutually serialized per workspace.
-- ============================================================================

-- ---------- 1. PROFILES (application identity; 1:1 with auth.users) ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text unique not null,
  full_name    text not null default '',
  role         text not null default 'FOUNDER'
                 check (role in ('FOUNDER','CO_FOUNDER','MODERATOR','PLATFORM_ADMIN')),
  status       text not null default 'active'
                 check (status in ('active','blocked','pending')),
  workspace_id uuid,
  phone        text not null default '',
  photo_url    text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- 2. WORKSPACES (1 Account -> 1 Workspace -> 1 FB Page) ----------
create table if not exists public.workspaces (
  id               uuid primary key default gen_random_uuid(),
  name             text not null default 'My Workspace',
  founder_user_id   uuid not null references auth.users(id) on delete cascade,
  facebook_page_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------- 3. WORKSPACE_MEMBERS (authoritative membership + role) ----------
create table if not exists public.workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('FOUNDER','CO_FOUNDER','MODERATOR')),
  status       text not null default 'active' check (status in ('active','invited','disabled')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- ---------- 4. WORKSPACE_INVITATIONS ----------
-- The `token` column is sensitive: it is never exposed to normal members.
-- RLS restricts the whole table to the workspace Founder (see section 10e).
create table if not exists public.workspace_invitations (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  email            text not null,
  role             text not null check (role in ('CO_FOUNDER','MODERATOR')),
  token            text not null unique default gen_random_uuid(),
  status           text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  expires_at       timestamptz not null default (now() + interval '7 days'),
  invited_by       uuid not null references auth.users(id),
  accepted_at      timestamptz,
  accepted_user_id uuid references auth.users(id),
  created_at       timestamptz not null default now()
);

-- ---------- 5. updated_at maintenance ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_t before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_t before update on public.workspaces
  for each row execute function public.set_updated_at();

drop trigger if exists wm_set_updated_at on public.workspace_members;
create trigger wm_set_updated_t before update on public.workspace_members
  for each row execute function public.set_updated_at();

-- ---------- 6. Server-side onboarding (invitation-aware) ----------
-- Decides onboarding by checking for a pending invitation matching the new
-- user's email. Invitation signup -> profile only (no workspace); the user
-- joins the invited workspace via accept_invitation(). Normal signup -> exactly
-- one workspace + one profile + one Founder membership.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ws_id  uuid;
  has_inv boolean;
begin
  -- Idempotency guard: if a profile already exists for this user (e.g. from a
  -- prior partial run or manual backfill), do NOT create a duplicate workspace,
  -- profile, or membership. This keeps the trigger safe to re-run and never
  -- overwrites existing authorization data.
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  select exists(
    select 1 from public.workspace_invitations
     where lower(trim(email)) = lower(trim(new.email))
       and status = 'pending'
       and expires_at > now()
  ) into has_inv;

  if has_inv then
    -- Invited member: profile only. No personal workspace, no Founder role.
    -- profiles.role/status are non-authoritative placeholders corrected by
    -- accept_invitation() once the user joins the invited workspace.
    insert into public.profiles (id, email, role, status)
      values (new.id, new.email, 'MODERATOR', 'pending');
    return new;
  end if;

  -- Normal signup: 1 workspace, 1 profile (FOUNDER), 1 Founder membership.
  insert into public.workspaces (founder_user_id, name)
    values (new.id, 'My Workspace') returning id into ws_id;
  insert into public.profiles (id, email, role, status, workspace_id)
    values (new.id, new.email, 'FOUNDER', 'active', ws_id);
  insert into public.workspace_members (workspace_id, user_id, role, status)
    values (ws_id, new.id, 'FOUNDER', 'active');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 7. Prevent client role/status/workspace escalation ----------
-- A user editing their own profile CANNOT change role, status, or workspace_id.
-- Only the service role (auth.uid() IS NULL) may change these privileged columns.
create or replace function public.protect_profile_privileged_cols()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Service role / postgres bypasses protection (server-side admin operations).
  if auth.uid() is null then
    return new;
  end if;
  -- A user editing their own profile cannot change privileged columns.
  -- email is tied to auth.users.email and must not drift via the client.
  if auth.uid() = old.id then
    new.email        := old.email;
    new.role         := old.role;
    new.status       := old.status;
    new.workspace_id := old.workspace_id;
  end if;
  return new;
end; $$;

drop trigger if exists profiles_no_escalation on public.profiles;
create trigger profiles_no_escalation before update on public.profiles
  for each row execute function public.protect_profile_privileged_cols();

-- ---------- 7b. Protect workspace ownership & integration fields ----------
-- Clients may update only the workspace name. founder_user_id (ownership) and
-- facebook_page_id (Meta page connection) are immutable from the client; only
-- the service role (auth.uid() IS NULL) may change them (ownership transfer
-- and Meta connection are backend operations).
create or replace function public.protect_workspace_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  new.founder_user_id   := old.founder_user_id;
  new.facebook_page_id  := old.facebook_page_id;
  return new;
end; $$;

drop trigger if exists workspaces_protect_fields on public.workspaces;
create trigger workspaces_protect_fields before update on public.workspaces
  for each row execute function public.protect_workspace_fields();

-- ---------- 8. Founder membership protection ----------
-- Normal members cannot: change Founder role, remove Founder, disable Founder,
-- create another Founder, or transfer ownership. The service role bypasses
-- these checks (server-side ownership transfer is permitted).
create or replace function public.protect_founder_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Service role / postgres bypasses (server-side ownership transfers).
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'FOUNDER' then
      raise exception 'The workspace Founder cannot be removed.';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    -- Cannot demote, change role of, or disable a FOUNDER membership.
    if old.role = 'FOUNDER' and (new.role <> 'FOUNDER' or new.status <> 'active') then
      raise exception 'The Founder role cannot be changed or disabled by members.';
    end if;
    -- Cannot create a second FOUNDER via update.
    if new.role = 'FOUNDER' and old.role <> 'FOUNDER' then
      raise exception 'A workspace can have only one Founder.';
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'FOUNDER' then
      raise exception 'A workspace can have only one Founder.';
    end if;
    return new;
  end if;
end; $$;

drop trigger if exists protect_founder_membership on public.workspace_members;
create trigger protect_founder_membership
  before insert or update or delete on public.workspace_members
  for each row execute function public.protect_founder_membership();

-- ---------- 9. Max 2 ACTIVE Co-Founders per workspace (concurrency-safe) ----------
-- See CO-FOUNDER LIMIT CONCURRENCY STRATEGY at the top of this file.
create or replace function public.enforce_cofounder_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare cnt int;
begin
  -- Lock the parent workspace row to serialize concurrent Co-Founder changes.
  perform 1 from public.workspaces where id = new.workspace_id for update;
  if not found then
    raise exception 'Target workspace does not exist.';
  end if;

  if new.role = 'CO_FOUNDER' and new.status = 'active' then
    select count(*) into cnt from public.workspace_members
      where workspace_id = new.workspace_id
        and role = 'CO_FOUNDER'
        and status = 'active'
        and id is distinct from new.id;  -- exclude the row being changed
    if coalesce(cnt, 0) >= 2 then
      raise exception 'A workspace can have at most 2 active Co-Founders.';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists enforce_cofounder_limit on public.workspace_members;
create trigger enforce_cofounder_limit
  before insert or update on public.workspace_members
  for each row execute function public.enforce_cofounder_limit();

-- ============================================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles              enable row level security;
alter table public.workspaces             enable row level security;
alter table public.workspace_members     enable row level security;
alter table public.workspace_invitations enable row level security;

-- Clean up a helper from a prior draft (no longer used).
drop function if exists public.my_workspace_ids();

-- ---------- 10a. SECURITY DEFINER authorization helpers ----------
-- These bypass RLS on workspace_members to avoid self-recursive policy
-- evaluation. They only ever answer questions about the CURRENT caller
-- (auth.uid()), so exposing them is not an information leak.
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.workspace_members
     where workspace_id = p_workspace_id
       and user_id = auth.uid()
       and status = 'active'
  );
$$;

create or replace function public.is_workspace_founder(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.workspace_members
     where workspace_id = p_workspace_id
       and user_id = auth.uid()
       and role = 'FOUNDER'
       and status = 'active'
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_founder(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to anon, authenticated;
grant execute on function public.is_workspace_founder(uuid) to anon, authenticated;

-- ---------- 10b. PROFILES policies ----------
-- A user reads/updates only their own row. No client insert/delete.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- 10c. WORKSPACES policies ----------
-- Active members can read their workspace. Only the Founder can update, and
-- cannot transfer ownership (founder_user_id must remain the caller).
drop policy if exists ws_member_read on public.workspaces;
drop policy if exists ws_founder_manage on public.workspaces;
create policy ws_member_read on public.workspaces
  for select using (public.is_workspace_member(id));

create policy ws_founder_update on public.workspaces
  for update using (public.is_workspace_founder(id))
  with check (public.is_workspace_founder(id) and founder_user_id = auth.uid());

-- ---------- 10d. WORKSPACE_MEMBERS policies ----------
-- Members can READ membership of their own workspace. Clients may NOT
-- insert/update/delete membership directly: all membership writes go through
-- the accept_invitation() RPC (invitation onboarding) or the service-role
-- backend (Step 3). The protect_founder_membership and enforce_cofounder_limit
-- triggers still guard every write regardless of the caller.
drop policy if exists wm_member_read on public.workspace_members;
drop policy if exists wm_founder_manage on public.workspace_members;
drop policy if exists wm_founder_insert on public.workspace_members;
drop policy if exists wm_founder_update on public.workspace_members;
drop policy if exists wm_founder_delete on public.workspace_members;
create policy wm_member_read on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

-- ---------- 10e. WORKSPACE_INVITATIONS policies ----------
-- Invitation data (including the token) is NOT broadly readable. Only the
-- Founder can read or manage invitations. Acceptance happens exclusively
-- through the accept_invitation() RPC. Normal members have NO access.
drop policy if exists inv_member_read on public.workspace_invitations;
drop policy if exists inv_founder_manage on public.workspace_invitations;
create policy inv_founder_all on public.workspace_invitations
  for all using (public.is_workspace_founder(workspace_id))
  with check (public.is_workspace_founder(workspace_id));

-- ============================================================================
-- 11. INVITATION ACCEPTANCE (server-authoritative RPC)
-- ============================================================================
-- Clients may NOT insert into workspace_members for invitations. Acceptance is
-- validated here: caller authenticated, email verified (email_confirmed_at),
-- email matches the invitation case-insensitively, status pending, not expired,
-- workspace exists, role allowed, no duplicate membership, Co-Founder limit
-- enforced atomically, then membership created and invitation sealed.
create or replace function public.accept_invitation(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inv               record;
  caller_id         uuid;
  caller_email      text;
  caller_confirmed  timestamptz;
  existing_cnt      int;
  cofounder_cnt     int;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'You must be signed in to accept an invitation.';
  end if;

  -- Resolve the caller's email STRICTLY from auth.users (the authoritative
  -- source), NOT from the JWT claim. Require the account to exist, have an
  -- email, and have that email verified (email_confirmed_at IS NOT NULL).
  -- This prevents invitation acceptance via an unverified or spoofed email.
  select email, email_confirmed_at
    into caller_email, caller_confirmed
    from auth.users
   where id = caller_id;

  if not found then
    raise exception 'Authenticated user not found.';
  end if;

  if caller_email is null then
    raise exception 'Your account has no email address.';
  end if;

  if caller_confirmed is null then
    raise exception 'You must verify your email before accepting an invitation.';
  end if;

  -- Locate the invitation and lock its row.
  select * into inv from public.workspace_invitations
    where token = p_token for update;
  if not found then
    raise exception 'Invalid invitation.';
  end if;

  if inv.status <> 'pending' then
    raise exception 'This invitation is no longer valid.';
  end if;

  if inv.expires_at < now() then
    update public.workspace_invitations set status = 'expired' where id = inv.id;
    raise exception 'This invitation has expired.';
  end if;

  -- The invitation must be for the caller's own email (normalized compare).
  if lower(trim(coalesce(inv.email, ''))) <> lower(trim(caller_email)) then
    raise exception 'This invitation was sent to a different email address.';
  end if;

  -- Lock the parent workspace row to serialize Co-Founder checks.
  perform 1 from public.workspaces where id = inv.workspace_id for update;
  if not found then
    raise exception 'The workspace for this invitation no longer exists.';
  end if;

  -- Role must be an allowed invitation role (FOUNDER is never assignable here).
  if inv.role not in ('CO_FOUNDER','MODERATOR') then
    raise exception 'Invalid invitation role.';
  end if;

  -- Enforce ONE ACCOUNT -> ONE WORKSPACE: a caller who already has ANY active
  -- membership (in this or any other workspace) cannot accept another invite.
  select count(*) into existing_cnt from public.workspace_members
    where user_id = caller_id and status = 'active';
  if existing_cnt > 0 then
    raise exception 'You already belong to a workspace.';
  end if;

  -- Enforce the Co-Founder limit atomically (same lock as the trigger).
  if inv.role = 'CO_FOUNDER' then
    select count(*) into cofounder_cnt from public.workspace_members
      where workspace_id = inv.workspace_id
        and role = 'CO_FOUNDER'
        and status = 'active';
    if cofounder_cnt >= 2 then
      raise exception 'This workspace already has the maximum number of Co-Founders.';
    end if;
  end if;

  -- Create the membership.
  insert into public.workspace_members (workspace_id, user_id, role, status)
    values (inv.workspace_id, caller_id, inv.role, 'active');

  -- Seal the invitation so it can never be reused.
  update public.workspace_invitations
     set status = 'accepted', accepted_at = now(), accepted_user_id = caller_id
   where id = inv.id;

  -- Sync the non-authoritative profile cache (role/workspace_id/status) so the
  -- UI reflects the joined workspace. Authoritative role remains in
  -- workspace_members.
  update public.profiles
     set workspace_id = inv.workspace_id,
         role = inv.role,
         status = 'active'
   where id = caller_id;

  return true;
end; $$;

revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- ============================================================================
-- 12. TABLE GRANTS
-- ============================================================================
-- RLS is the authoritative access control. Anonymous clients have NO access
-- to workspace/member/invitation data. Authenticated clients get the minimum
-- privileges needed for the app:
--   * profiles: read/update own row (privileged columns revert via trigger).
--   * workspaces: read own row; update name only (ownership/meta revert via trigger).
--   * workspace_members: READ only (writes via accept_invitation() RPC / backend).
--   * workspace_invitations: READ only (Founder-only via RLS; writes via backend).
grant select, update on public.profiles to authenticated;
grant select, update on public.workspaces to authenticated;
grant select on public.workspace_members to authenticated;
grant select on public.workspace_invitations to authenticated;