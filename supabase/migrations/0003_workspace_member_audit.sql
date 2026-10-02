-- ============================================================================
-- MHI BizMate — STEP 3: System B — Workspace MEMBER role + audit logs + member
-- management RPCs. ADDITIVE; preserves the 1-Account-1-Workspace model and all
-- existing workspace role/RLS logic from migration 0001.
-- ============================================================================
-- CHANGES:
--   1. Adds the MEMBER workspace role (to workspace_members + workspace_invitations).
--   2. Recreates accept_invitation() to accept MEMBER invitations (additive).
--   3. Adds public.workspace_audit_logs (workspace-isolated, RLS) + an
--      append_workspace_log() helper (postgres-only).
--   4. Adds founder-only member-management RPCs (create_invitation,
--      update_member_role, set_member_status, remove_member) and member-readable
--      list RPCs (list_workspace_members, list_workspace_audit_logs).
--
-- ROLE PERMISSIONS (workspace roles — independent from global platform_role):
--   FOUNDER     — full member management (invite, change role, disable, remove).
--   CO_FOUNDER  — workspace member; cannot manage members (founder-only).
--   MODERATOR   — workspace member; cannot manage members.
--   MEMBER      — workspace member; cannot manage members.
--   All management RPCs verify the caller is the workspace FOUNDER server-side.
--   Audit logs are readable by all active workspace members.
--
-- 1-Account-1-Workspace is unchanged: membership writes still go only through
-- accept_invitation() (join) or these founder RPCs (manage); clients still
-- cannot insert/update/delete workspace_members directly.
-- ============================================================================

-- ---------- 1. Add MEMBER role ----------
alter table public.workspace_members drop constraint if exists workspace_members_role_check;
alter table public.workspace_members add constraint workspace_members_role_check
  check (role in ('FOUNDER','CO_FOUNDER','MODERATOR','MEMBER'));

alter table public.workspace_invitations drop constraint if exists workspace_invitations_role_check;
alter table public.workspace_invitations add constraint workspace_invitations_role_check
  check (role in ('CO_FOUNDER','MODERATOR','MEMBER'));

-- ---------- 2. Recreate accept_invitation() to accept MEMBER ----------
-- Identical to migration 0001 except the allowed invitation roles now include
-- MEMBER. All existing validation (verified email, one-account-one-workspace,
-- Co-Founder limit, invitation sealing, profile cache sync) is preserved.
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
  if lower(trim(coalesce(inv.email, ''))) <> lower(trim(caller_email)) then
    raise exception 'This invitation was sent to a different email address.';
  end if;

  perform 1 from public.workspaces where id = inv.workspace_id for update;
  if not found then
    raise exception 'The workspace for this invitation no longer exists.';
  end if;

  -- MEMBER is now an allowed invitation role.
  if inv.role not in ('CO_FOUNDER','MODERATOR','MEMBER') then
    raise exception 'Invalid invitation role.';
  end if;

  select count(*) into existing_cnt from public.workspace_members
    where user_id = caller_id and status = 'active';
  if existing_cnt > 0 then
    raise exception 'You already belong to a workspace.';
  end if;

  if inv.role = 'CO_FOUNDER' then
    select count(*) into cofounder_cnt from public.workspace_members
      where workspace_id = inv.workspace_id
        and role = 'CO_FOUNDER'
        and status = 'active';
    if cofounder_cnt >= 2 then
      raise exception 'This workspace already has the maximum number of Co-Founders.';
    end if;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, status)
    values (inv.workspace_id, caller_id, inv.role, 'active');

  update public.workspace_invitations
     set status = 'accepted', accepted_at = now(), accepted_user_id = caller_id
   where id = inv.id;

  update public.profiles
     set workspace_id = inv.workspace_id,
         role = inv.role,
         status = 'active'
   where id = caller_id;

  -- Audit the join.
  insert into public.workspace_audit_logs (workspace_id, actor_id, action, target_user_id, metadata)
    values (inv.workspace_id, caller_id, 'member.joined', caller_id,
            jsonb_build_object('role', inv.role));

  return true;
end; $$;

revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- ---------- 3. workspace_audit_logs ----------
create table if not exists public.workspace_audit_logs (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  actor_id        uuid references auth.users(id),
  action          text not null,
  target_user_id  uuid references auth.users(id),
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

alter table public.workspace_audit_logs enable row level security;
drop policy if exists wal_member_read on public.workspace_audit_logs;
create policy wal_member_read on public.workspace_audit_logs
  for select using (public.is_workspace_member(workspace_id));
-- No client insert/update/delete grant; writes happen only via SECURITY DEFINER
-- RPCs (running as postgres) which bypass RLS.
grant select on public.workspace_audit_logs to authenticated;

-- ---------- 4. append_workspace_log (postgres-only helper) ----------
create or replace function public.append_workspace_log(
  p_workspace_id uuid,
  p_action text,
  p_target_user_id uuid default null,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.workspace_audit_logs (workspace_id, actor_id, action, target_user_id, metadata)
    values (p_workspace_id, auth.uid(), p_action, p_target_user_id, coalesce(p_metadata, '{}'::jsonb));
end; $$;

revoke all on function public.append_workspace_log(uuid, text, uuid, jsonb) from public, anon, authenticated;

-- ---------- 5. list_workspace_members (workspace members) ----------
create or replace function public.list_workspace_members(p_workspace_id uuid)
returns table(
  id uuid, user_id uuid, email text, full_name text, role text, status text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Access denied.';
  end if;
  return query
    select wm.id, wm.user_id, u.email, p.full_name, wm.role, wm.status, wm.created_at
      from public.workspace_members wm
      join auth.users u on u.id = wm.user_id
      left join public.profiles p on p.id = wm.user_id
     where wm.workspace_id = p_workspace_id
     order by (wm.role = 'FOUNDER') desc, wm.created_at;
end; $$;

revoke all on function public.list_workspace_members(uuid) from public, anon;
grant execute on function public.list_workspace_members(uuid) to authenticated;

-- ---------- 6. list_workspace_audit_logs (workspace members) ----------
create or replace function public.list_workspace_audit_logs(p_workspace_id uuid, p_limit int default 100)
returns table(
  id uuid, action text, actor_email text, target_user_id uuid, metadata jsonb, created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Access denied.';
  end if;
  return query
    select l.id, l.action, au.email, l.target_user_id, l.metadata, l.created_at
      from public.workspace_audit_logs l
      left join auth.users au on au.id = l.actor_id
     where l.workspace_id = p_workspace_id
     order by l.created_at desc
     limit coalesce(p_limit, 100);
end; $$;

revoke all on function public.list_workspace_audit_logs(uuid, int) from public, anon;
grant execute on function public.list_workspace_audit_logs(uuid, int) to authenticated;

-- ---------- 7. create_invitation (FOUNDER only) ----------
create or replace function public.create_invitation(p_email text, p_role text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ws_id uuid;
  tok text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;
  select id into ws_id from public.workspaces where founder_user_id = auth.uid();
  if not found then
    raise exception 'Only the workspace Founder can invite members.';
  end if;
  if p_role not in ('CO_FOUNDER','MODERATOR','MEMBER') then
    raise exception 'Invalid role.';
  end if;
  if p_email is null or trim(p_email) = '' then
    raise exception 'An email is required.';
  end if;
  insert into public.workspace_invitations (workspace_id, email, role, invited_by)
    values (ws_id, lower(trim(p_email)), p_role, auth.uid())
    returning token into tok;
  perform public.append_workspace_log(ws_id, 'member.invited', null,
    jsonb_build_object('email', lower(trim(p_email)), 'role', p_role));
  return tok;
end; $$;

revoke all on function public.create_invitation(text, text) from public, anon;
grant execute on function public.create_invitation(text, text) to authenticated;

-- ---------- 8. update_member_role (FOUNDER only) ----------
create or replace function public.update_member_role(p_member_id uuid, p_role text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m record;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;
  select * into m from public.workspace_members where id = p_member_id;
  if not found then
    raise exception 'Member not found.';
  end if;
  perform 1 from public.workspaces where id = m.workspace_id and founder_user_id = auth.uid();
  if not found then
    raise exception 'Only the workspace Founder can change member roles.';
  end if;
  if m.role = 'FOUNDER' then
    raise exception 'The Founder role cannot be changed.';
  end if;
  if p_role not in ('CO_FOUNDER','MODERATOR','MEMBER') then
    raise exception 'Invalid role.';
  end if;
  update public.workspace_members set role = p_role where id = p_member_id;
  perform public.append_workspace_log(m.workspace_id, 'member.role_changed', m.user_id,
    jsonb_build_object('from', m.role, 'to', p_role));
  return true;
end; $$;

revoke all on function public.update_member_role(uuid, text) from public, anon;
grant execute on function public.update_member_role(uuid, text) to authenticated;

-- ---------- 9. set_member_status (FOUNDER only) ----------
create or replace function public.set_member_status(p_member_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m record;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;
  select * into m from public.workspace_members where id = p_member_id;
  if not found then
    raise exception 'Member not found.';
  end if;
  perform 1 from public.workspaces where id = m.workspace_id and founder_user_id = auth.uid();
  if not found then
    raise exception 'Only the workspace Founder can change member status.';
  end if;
  if m.role = 'FOUNDER' then
    raise exception 'The Founder status cannot be changed.';
  end if;
  if p_status not in ('active','disabled') then
    raise exception 'Invalid status.';
  end if;
  update public.workspace_members set status = p_status where id = p_member_id;
  perform public.append_workspace_log(m.workspace_id, 'member.status_changed', m.user_id,
    jsonb_build_object('to', p_status));
  return true;
end; $$;

revoke all on function public.set_member_status(uuid, text) from public, anon;
grant execute on function public.set_member_status(uuid, text) to authenticated;

-- ---------- 10. remove_member (FOUNDER only) ----------
create or replace function public.remove_member(p_member_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m record;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;
  select * into m from public.workspace_members where id = p_member_id;
  if not found then
    raise exception 'Member not found.';
  end if;
  perform 1 from public.workspaces where id = m.workspace_id and founder_user_id = auth.uid();
  if not found then
    raise exception 'Only the workspace Founder can remove members.';
  end if;
  if m.role = 'FOUNDER' then
    raise exception 'The Founder cannot be removed.';
  end if;
  perform public.append_workspace_log(m.workspace_id, 'member.removed', m.user_id,
    jsonb_build_object('role', m.role));
  delete from public.workspace_members where id = p_member_id;
  return true;
end; $$;

revoke all on function public.remove_member(uuid) from public, anon;
grant execute on function public.remove_member(uuid) to authenticated;