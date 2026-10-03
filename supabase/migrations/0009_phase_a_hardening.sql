-- MHI BizMate — Migration 0009: Phase A Hardening (AI + Meta Live Readiness)
--
-- This migration is IDEMPOTENT and NON-DESTRUCTIVE. It hardens the Meta
-- Connector and customer-identity safety without changing existing business
-- data or order logic.
--
-- Changes:
--   1. meta_webhook_events: add 'processing' status for atomic event claiming
--      (concurrent duplicate delivery safety).
--   2. meta_pages: enforce ONE active page per workspace (replace the
--      non-unique partial index with a UNIQUE partial index).
--   3. meta_pages: enforce that a single Facebook Page cannot be active for
--      multiple workspaces at the same time (UNIQUE partial index on page_id).
--   4. customers: prevent duplicate customers by facebook_id within a
--      workspace (UNIQUE partial index where facebook_id is non-empty).
--
-- No tables, functions, or triggers are duplicated. No data is deleted.

-- ============================================================================
-- 1. meta_webhook_events — add 'processing' status for atomic claim
-- ============================================================================
-- The original inline check (0008) allows ('processed','failed','ignored').
-- We add 'processing' so the processor can atomically claim an event before
-- working on it, preventing concurrent duplicate AI execution / replies.
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.meta_webhook_events'::regclass
      and contype = 'c'
  loop
    execute format('alter table public.meta_webhook_events drop constraint if exists %I', c.conname);
  end loop;
end $$;

alter table public.meta_webhook_events
  add constraint meta_webhook_events_status_check
  check (status in ('processing','processed','failed','ignored'));

-- ============================================================================
-- 2. meta_pages — ONE active page per workspace (UNIQUE partial index)
-- ============================================================================
-- Migration 0008 created a non-unique partial index meta_pages_active_idx.
-- A non-unique index does NOT enforce the 1-active-page-per-workspace rule.
-- Replace it with a UNIQUE partial index so the database guarantees it.
drop index if exists public.meta_pages_active_idx;
create unique index if not exists meta_pages_active_unique_idx
  on public.meta_pages(workspace_id)
  where is_active = true;

-- ============================================================================
-- 3. meta_pages — a Page cannot be active for multiple workspaces
-- ============================================================================
-- Prevents the same Facebook Page from being the active page for two
-- different workspaces simultaneously. Historical (inactive) rows are
-- preserved, so a page can be reconnected to a different workspace after
-- disconnect.
create unique index if not exists meta_pages_active_page_unique_idx
  on public.meta_pages(page_id)
  where is_active = true;

-- ============================================================================
-- 4. customers — prevent duplicate customers by facebook_id per workspace
-- ============================================================================
-- The Messenger AI may propose CREATE_CUSTOMER for a new Facebook user.
-- This partial unique index is the database-level safety net that prevents
-- duplicate customer records when the same webhook event is delivered more
-- than once or when two concurrent events arrive for the same Facebook user.
-- Only applies when facebook_id is a non-empty string.
create unique index if not exists customers_facebook_id_unique_idx
  on public.customers(workspace_id, facebook_id)
  where facebook_id <> '';