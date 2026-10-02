-- ============================================================================
-- MHI BizMate — STEP 2b: Platform Admin RBAC (System A — Global Admin Panel)
-- ============================================================================
-- Adds a SEPARATE global role system (platform_role) on public.profiles, fully
-- independent of the workspace role system (FOUNDER/CO_FOUNDER/MODERATOR).
--
-- GLOBAL ROLES (profiles.platform_role):
--   SUPER_ADMIN — application owner; full Global Admin Panel control; the ONLY
--                 role that can grant/revoke ADMIN and MANAGER. Seeded once via
--                 init_super_admin() (service-role only, one-time guarded).
--   ADMIN       — Global Admin Panel access; user management + payment
--                 verification review. Cannot assign global roles.
--   MANAGER     — Global Admin Panel access; permitted user/subscription
--                 management. Cannot assign global roles.
--   NULL        — Normal User. No Global Admin Panel access.
--
-- SEPARATION FROM WORKSPACE ROLES:
--   platform_role and the workspace role (workspace_members.role / profiles.role)
--   are completely independent. A workspace FOUNDER is NOT a global admin by
--   default. Global admin status does NOT grant any workspace role. The Admin
--   Panel is gated on platform_role ONLY (never on workspace role).
--
-- SECURITY:
--   * Clients CANNOT write platform_role: column-level privileges revoke UPDATE
--     on platform_role from authenticated; only the SECURITY DEFINER RPCs
--     (running as postgres) can set it.
--   * init_super_admin() is service-role only (auth.uid() IS NULL) and one-time
--     (aborts if any SUPER_ADMIN already exists) — prevents the race where a
--     non-owner self-initializes before the real owner.
--   * set_platform_role() requires the caller to be SUPER_ADMIN; can only
--     assign ADMIN/MANAGER (or null to revoke); can NEVER create a SUPER_ADMIN
--     or modify an existing SUPER_ADMIN (owner protection).
--   * list_platform_users() requires the caller to be a global admin.
--
-- This migration is ADDITIVE: it does not alter the workspace onboarding model
-- (1 Account -> 1 Workspace) or any existing workspace role/RLS logic.
-- ============================================================================

-- ---------- 1. platform_role column ----------
alter table public.profiles
  add column if not exists platform_role text
    check (platform_role in ('SUPER_ADMIN','ADMIN','MANAGER'));

-- ---------- 2. Column-level privileges: clients cannot write platform_role ----------
-- Revoke the broad UPDATE grant from migration 0001 and re-grant only the
-- self-service identity columns. Privileged columns (role, status, workspace_id,
-- email, platform_role) are no longer client-writable. SECURITY DEFINER RPCs
-- bypass column privileges and remain able to update them.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, photo_url, updated_at) on public.profiles to authenticated;

-- ---------- 3. init_super_admin (one-time, service-role only) ----------
-- Run ONCE from the Supabase SQL editor (or `supabase db push`) with the
-- verified owner email, AFTER the owner has signed up. Cannot be run from the
-- browser. Aborts if a Super Admin already exists.
create or replace function public.init_super_admin(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid;
begin
  -- Only the service role / postgres (SQL editor, backend) may run this.
  -- Browser sessions (auth.uid() not null) are rejected.
  if auth.uid() is not null then
    raise exception 'init_super_admin may only be run server-side.';
  end if;

  -- One-time guard: abort if a Super Admin already exists.
  if exists (select 1 from public.profiles where platform_role = 'SUPER_ADMIN') then
    raise exception 'Super Admin is already initialized.';
  end if;

  if p_email is null or trim(p_email) = '' then
    raise exception 'An owner email is required.';
  end if;

  select id into uid from auth.users where lower(trim(email)) = lower(trim(p_email));
  if not found then
    raise exception 'No auth user found for that email. Have the owner signed up first.';
  end if;

  -- Set platform_role (create a minimal profile row if the user pre-dates the
  -- handle_new_user trigger, else update the existing one).
  insert into public.profiles (id, email, platform_role, role, status)
    values (uid, p_email, 'SUPER_ADMIN', 'FOUNDER', 'active')
    on conflict (id) do update set platform_role = 'SUPER_ADMIN';

  return true;
end; $$;

revoke all on function public.init_super_admin(text) from public, anon, authenticated;

-- ---------- 4. set_platform_role (SUPER_ADMIN only) ----------
-- Grants/revokes ADMIN or MANAGER. Can never create SUPER_ADMIN or touch an
-- existing SUPER_ADMIN (owner protection).
create or replace function public.set_platform_role(p_target_user_id uuid, p_role text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role text;
  target_role text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select platform_role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'SUPER_ADMIN' then
    raise exception 'Only the Super Admin can assign global roles.';
  end if;

  -- p_role must be ADMIN, MANAGER, or NULL (revoke). SUPER_ADMIN is never
  -- assignable here (only init_super_admin can create the owner).
  if p_role is not null and p_role not in ('ADMIN','MANAGER') then
    raise exception 'Invalid role. Use ADMIN or MANAGER (or null to revoke).';
  end if;

  select platform_role into target_role from public.profiles where id = p_target_user_id;
  if not found then
    raise exception 'Target user not found.';
  end if;

  -- Protect the owner: a Super Admin cannot be modified through this RPC.
  if target_role = 'SUPER_ADMIN' then
    raise exception 'The Super Admin owner cannot be modified here.';
  end if;

  update public.profiles set platform_role = p_role where id = p_target_user_id;
  return true;
end; $$;

revoke all on function public.set_platform_role(uuid, text) from public, anon;
grant execute on function public.set_platform_role(uuid, text) to authenticated;

-- ---------- 5. list_platform_users (global admins only) ----------
-- Returns the user directory with platform_role for the Admin Team page.
create or replace function public.list_platform_users()
returns table(
  id uuid,
  email text,
  full_name text,
  platform_role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;
  select platform_role into caller_role from public.profiles where id = auth.uid();
  if caller_role not in ('SUPER_ADMIN','ADMIN','MANAGER') then
    raise exception 'Access denied.';
  end if;

  return query
    select p.id, p.email, p.full_name, p.platform_role, p.created_at
      from public.profiles p
     order by (p.platform_role = 'SUPER_ADMIN') desc,
              (p.platform_role is not null) desc,
              p.platform_role,
              p.created_at desc;
end; $$;

revoke all on function public.list_platform_users() from public, anon;
grant execute on function public.list_platform_users() to authenticated;