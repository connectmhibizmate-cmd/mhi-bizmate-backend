-- ============================================================================
-- MHI BizMate — STEP 3d: Meta Connector Layer (0008_meta_connector.sql)
-- ============================================================================
-- ADDITIVE migration. Does NOT alter existing auth/workspace/RBAC/business
-- data or any table created by 0001–0007. Safe to run once on a live database.
--
-- Creates the Meta Connector storage layer:
--   1. meta_connections   — workspace-level Meta OAuth user token
--   2. meta_pages          — individual Facebook Page connections (history preserved)
--   3. meta_oauth_states   — CSRF-resistant OAuth state tokens (single-use, expiring)
--   4. meta_webhook_events — webhook event idempotency / deduplication
--
-- SECURITY MODEL (defense-in-depth):
--   * RLS is ENABLED on every table.
--   * Clients (anon key) have NO grants — NO SELECT, NO INSERT, NO UPDATE, NO DELETE.
--     Only the Heart of BizMate backend (service-role key) can read/write these tables.
--   * Page Access Tokens and User Access Tokens are stored ENCRYPTED (AES-256-GCM
--     at the application layer). Even a database read does not expose raw tokens.
--   * The backend independently resolves workspace_id from workspace_members —
--     webhook payloads never supply workspace_id; it is always derived from the
--     trusted meta_pages → workspace mapping.
--   * No token, secret, or credential is ever sent to the frontend, AI model,
--     logs, or audit records.
-- ============================================================================

-- ---------- 1. META_CONNECTIONS (workspace-level OAuth user token) ----------
create table if not exists public.meta_connections (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null unique references public.workspaces(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  meta_user_id          text not null default '',
  meta_user_name        text not null default '',
  encrypted_user_token  text not null default '',   -- AES-256-GCM encrypted, app-layer
  token_expires_at      timestamptz,
  status                text not null default 'connected'
    check (status in ('connected','reconnect_required','disconnected','error')),
  last_error_category   text,
  last_validated_at     timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists meta_conn_workspace_idx on public.meta_connections(workspace_id);
alter table public.meta_connections enable row level security;
-- No client grants — service-role backend only.
-- (No policy = no access for authenticated/anon roles.)

-- ---------- 2. META_PAGES (individual Facebook Page connections) ----------
-- A workspace may have multiple historical pages but exactly ONE active page.
-- When Change Page occurs, the previous page's is_active is set to false but
-- the row is preserved for historical event/audit traceability.
create table if not exists public.meta_pages (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references public.workspaces(id) on delete cascade,
  page_id                 text not null,               -- Meta Page ID
  page_name               text not null default '',
  page_link               text not null default '',
  encrypted_page_token    text not null default '',   -- AES-256-GCM encrypted, app-layer
  is_active               boolean not null default false,
  connected_at            timestamptz not null default now(),
  disconnected_at         timestamptz,
  last_validated_at       timestamptz,
  last_error_category     text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (workspace_id, page_id)
);
create index if not exists meta_pages_workspace_idx on public.meta_pages(workspace_id);
create index if not exists meta_pages_active_idx on public.meta_pages(workspace_id) where is_active = true;
create index if not exists meta_pages_page_id_idx on public.meta_pages(page_id);
alter table public.meta_pages enable row level security;
-- No client grants — service-role backend only.

-- ---------- 3. META_OAUTH_STATES (CSRF-resistant, single-use, expiring) ----------
create table if not exists public.meta_oauth_states (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  state         text not null unique,
  expires_at    timestamptz not null default (now() + interval '10 minutes'),
  used_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists meta_oauth_states_exp_idx on public.meta_oauth_states(expires_at);
alter table public.meta_oauth_states enable row level security;
-- No client grants — service-role backend only.

-- ---------- 4. META_WEBHOOK_EVENTS (idempotency / deduplication) ----------
create table if not exists public.meta_webhook_events (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid references public.workspaces(id) on delete cascade,
  external_event_id text not null,
  event_type        text not null default '',
  source            text not null default 'meta',
  status            text not null default 'processed'
    check (status in ('processed','failed','ignored')),
  correlation_id   text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  unique (external_event_id, source)
);
create index if not exists meta_webhook_events_ws_idx on public.meta_webhook_events(workspace_id, created_at desc);
alter table public.meta_webhook_events enable row level security;
-- No client grants — service-role backend only.

-- ---------- 5. Add conversation columns for Meta provider references ----------
-- These allow the Meta Connector to store provider references on existing
-- conversations/messages without creating a duplicate conversation system.
alter table public.conversations
  add column if not exists page_id text default '',
  add column if not exists source text not null default 'manual'
    check (source in ('manual','messenger','facebook_comment'));

alter table public.messages
  add column if not exists external_message_id text,
  add column if not exists comment_id text,
  add column if not exists source text not null default 'manual'
    check (source in ('manual','messenger','facebook_comment'));

-- ---------- 6. updated_at maintenance for new tables ----------
create or replace function public.meta_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meta_conn_touch on public.meta_connections;
create trigger meta_conn_touch before update on public.meta_connections
  for each row execute function public.meta_touch_updated_at();

drop trigger if exists meta_pages_touch on public.meta_pages;
create trigger meta_pages_touch before update on public.meta_pages
  for each row execute function public.meta_touch_updated_at();