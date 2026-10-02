-- ============================================================================
-- MHI BizMate — STEP 2c: Human-readable Display ID (#10001, #10002, …)
-- ============================================================================
-- Adds a server-assigned, sequential, human-friendly identifier to
-- public.profiles, independent of the immutable Supabase auth UUID.
--
-- MODEL
--   * profiles.id           — UUID (auth.users.id); the REAL auth/RLS key.
--   * profiles.display_id  — integer sequence starting at 10001; DISPLAY ONLY.
--
-- SECURITY
--   * display_id is assigned exclusively by the database (DEFAULT nextval).
--     Clients cannot set or change it: the column-level privileges from
--     migration 0002 grant UPDATE on (full_name, phone, photo_url, updated_at)
--     only, so display_id is not client-writable.
--   * The BEFORE UPDATE trigger protect_profile_privileged_cols (0001) does
--     not touch display_id; even so, the column grant prevents client writes.
--
-- BACKFILL
--   Existing profiles are numbered 10001, 10002, … ordered by created_at so
--   the earliest user gets #10001. The sequence is then advanced past the
--   highest assigned value so the next signup does not collide.
-- ============================================================================

-- ---------- 1. Column ----------
alter table public.profiles
  add column if not exists display_id integer;

-- ---------- 2. Sequence (start at 10001) ----------
create sequence if not exists public.profile_display_id_seq start 10001;

-- ---------- 3. Backfill existing rows ----------
-- Assign 10001..N ordered by created_at (oldest first). Idempotent: only rows
-- with a NULL display_id are updated, so re-running is safe.
with ranked as (
  select id, row_number() over (order by created_at, id) as rn
  from public.profiles
  where display_id is null
)
update public.profiles p
  set display_id = 10000 + ranked.rn
  from ranked
  where p.id = ranked.id;

-- ---------- 4. Advance sequence past the highest assigned value ----------
-- Ensures the next nextval() does not collide with a backfilled value.
select setval(
  'public.profile_display_id_seq',
  coalesce((select max(display_id) from public.profiles), 10000)
);

-- ---------- 5. Default + NOT NULL + unique ----------
alter table public.profiles
  alter column display_id set default nextval('public.profile_display_id_seq');

-- NOT NULL only after every existing row has a value.
do $$
begin
  if exists (select 1 from public.profiles where display_id is null) then
    raise exception 'Cannot set NOT NULL: some profiles still have NULL display_id.';
  end if;
  alter table public.profiles alter column display_id set not null;
end; $$;

-- Unique constraint (drop first for idempotency).
alter table public.profiles drop constraint if exists profiles_display_id_unique;
alter table public.profiles add constraint profiles_display_id_unique unique (display_id);

-- ---------- 6. Column grant (read-only for clients) ----------
-- Migration 0002 revoked broad UPDATE and granted only identity columns.
-- display_id must NOT be client-writable. Re-grant the same set explicitly
-- to guarantee display_id is excluded even if this migration runs out of order.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, photo_url, updated_at) on public.profiles to authenticated;
-- SELECT on profiles is already granted to authenticated (0001 §12); display_id
-- is included automatically.

-- ---------- 7. list_platform_users() — include display_id ----------
-- Drop and recreate the admin directory RPC so it returns display_id. The
-- authorization logic (global admin only) is unchanged.
create or replace function public.list_platform_users()
returns table(
  id uuid,
  display_id integer,
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
    select p.id, p.display_id, p.email, p.full_name, p.platform_role, p.created_at
      from public.profiles p
     order by (p.platform_role = 'SUPER_ADMIN') desc,
              (p.platform_role is not null) desc,
              p.platform_role,
              p.created_at desc;
end; $$;

revoke all on function public.list_platform_users() from public, anon;
grant execute on function public.list_platform_users() to authenticated;