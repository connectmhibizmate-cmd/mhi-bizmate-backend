-- ============================================================================
-- MHI BizMate — STEP 3c: AI Gateway Foundation (ai_operations table)
-- ============================================================================
-- ADDITIVE migration. Does NOT alter existing auth/workspace/RBAC/business
-- data or any table created by 0001–0006. Safe to run once on a live database.
--
-- Creates the ai_operations table for AI usage/cost observability. This is
-- the SINGLE logging path for AI — every Gateway call (success or failure)
-- is recorded here for cost analysis, error tracking, and audit.
--
-- SECURITY:
--   * RLS enabled — workspace members can read their own workspace's AI ops.
--   * Clients (anon key) have SELECT only — NO INSERT/UPDATE/DELETE grants.
--     All writes go through the Heart of BizMate backend (service-role key).
--   * Never stores prompts, responses, or customer PII — only metadata.
--   * Never stores credentials, tokens, or secrets.
-- ============================================================================

create table if not exists public.ai_operations (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  employee        text,
  provider        text,
  model           text,
  task_type       text,
  action          text,
  correlation_id  text,
  input_tokens    integer not null default 0,
  output_tokens   integer not null default 0,
  estimated_cost  numeric not null default 0,
  success         boolean not null default false,
  error_category  text,
  fallback_used   boolean not null default false,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists ai_ops_workspace_idx on public.ai_operations(workspace_id, created_at desc);
create index if not exists ai_ops_employee_idx on public.ai_operations(workspace_id, employee, created_at desc);
create index if not exists ai_ops_correlation_idx on public.ai_operations(correlation_id);

alter table public.ai_operations enable row level security;
drop policy if exists ai_ops_member_read on public.ai_operations;
create policy ai_ops_member_read on public.ai_operations
  for select using (public.is_workspace_member(workspace_id));
-- No client INSERT/UPDATE/DELETE grants — only the service-role backend writes.
grant select on public.ai_operations to authenticated;