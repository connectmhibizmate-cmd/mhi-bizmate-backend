-- ============================================================================
-- MHI BizMate — STEP 3: Core Business Data Tables + RLS + Heart RPCs
-- ============================================================================
-- Creates the workspace-isolated business tables that the frontend pages
-- consume: business_profiles, products, customers, leads, conversations,
-- messages, orders, order_items, transactions, notifications, suppliers,
-- purchases, campaigns, automation_settings, business_audit_logs.
--
-- SECURITY MODEL (defense-in-depth):
--   * RLS is ENABLED on every table. The SELECT policy allows workspace
--     members to read their own workspace's rows. This is the SECOND boundary.
--   * Clients (anon key) have SELECT only — NO INSERT/UPDATE/DELETE grants.
--     All business writes go through the Heart of BizMate backend, which uses
--     the service-role key (bypasses RLS) and enforces authorization + business
--     rules before every mutation.
--   * The backend independently resolves workspace_id from workspace_members
--     (never trusts a client-supplied workspace_id).
--   * Cross-workspace access is impossible: every query is scoped by the
--     server-resolved workspace_id, and RLS enforces the same on direct reads.
--
-- FIELD NAMING:
--   Database columns use created_at/updated_at (Postgres convention).
--   The backend API maps these to created_date/updated_date in responses
--   to preserve the existing frontend contract.
-- ============================================================================

-- ---------- 0. Order number sequence ----------
create sequence if not exists public.order_number_seq start 10001;

create or replace function public.next_order_number()
returns text language sql as $$
  select 'ORD-' || lpad(nextval('public.order_number_seq')::text, 5, '0')
$$;
revoke all on function public.next_order_number() from public, anon, authenticated;

-- ---------- 1. BUSINESS_PROFILES (1:1 with workspace) ----------
create table if not exists public.business_profiles (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null unique references public.workspaces(id) on delete cascade,
  business_name  text not null default '',
  category       text not null default '',
  phone          text not null default '',
  address        text not null default '',
  assistant_name text not null default 'BizMate',
  logo_url       text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.business_profiles enable row level security;
drop policy if exists bp_member_read on public.business_profiles;
create policy bp_member_read on public.business_profiles
  for select using (public.is_workspace_member(workspace_id));
grant select on public.business_profiles to authenticated;

-- ---------- 2. PRODUCTS ----------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  description  text not null default '',
  sku          text not null default '',
  category     text not null default '',
  price        numeric not null default 0,
  cost         numeric not null default 0,
  stock        integer not null default 0,
  image_url    text not null default '',
  status       text not null default 'active' check (status in ('active','archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists products_workspace_idx on public.products(workspace_id);
create index if not exists products_workspace_status_idx on public.products(workspace_id, status);
alter table public.products enable row level security;
drop policy if exists products_member_read on public.products;
create policy products_member_read on public.products
  for select using (public.is_workspace_member(workspace_id));
grant select on public.products to authenticated;

-- ---------- 3. CUSTOMERS ----------
create table if not exists public.customers (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null default '',
  phone        text not null default '',
  email        text not null default '',
  address      text not null default '',
  photo_url    text not null default '',
  type         text not null default 'Individual' check (type in ('Individual','Retailer','Wholesaler','Distributor')),
  notes        text not null default '',
  status       text not null default 'active' check (status in ('active','blocked')),
  total_orders integer not null default 0,
  total_spent  numeric not null default 0,
  facebook_id  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists customers_workspace_idx on public.customers(workspace_id);
create index if not exists customers_phone_idx on public.customers(workspace_id, phone);
alter table public.customers enable row level security;
drop policy if exists customers_member_read on public.customers;
create policy customers_member_read on public.customers
  for select using (public.is_workspace_member(workspace_id));
grant select on public.customers to authenticated;

-- ---------- 4. LEADS ----------
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  name        text not null default '',
  phone       text not null default '',
  source      text not null default 'manual',
  status      text not null default 'new' check (status in ('new','contacted','qualified','converted','lost')),
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists leads_workspace_idx on public.leads(workspace_id);
alter table public.leads enable row level security;
drop policy if exists leads_member_read on public.leads;
create policy leads_member_read on public.leads
  for select using (public.is_workspace_member(workspace_id));
grant select on public.leads to authenticated;

-- ---------- 5. CONVERSATIONS (structure for future Meta integration) ----------
create table if not exists public.conversations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  customer_id   uuid references public.customers(id) on delete set null,
  facebook_id   text,
  name          text not null default '',
  last_message  text not null default '',
  unread_count  integer not null default 0,
  status        text not null default 'open' check (status in ('open','closed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists conversations_workspace_idx on public.conversations(workspace_id);
alter table public.conversations enable row level security;
drop policy if exists conv_member_read on public.conversations;
create policy conv_member_read on public.conversations
  for select using (public.is_workspace_member(workspace_id));
grant select on public.conversations to authenticated;

-- ---------- 6. MESSAGES ----------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type     text not null check (sender_type in ('customer','business','ai','admin')),
  content         text not null default '',
  facebook_id     text,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);
alter table public.messages enable row level security;
drop policy if exists msg_member_read on public.messages;
create policy msg_member_read on public.messages
  for select using (public.is_workspace_member(workspace_id));
grant select on public.messages to authenticated;

-- ---------- 7. ORDERS ----------
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  order_number    text not null,
  customer_id     uuid references public.customers(id) on delete set null,
  customer_name   text not null default '',
  customer_phone  text not null default '',
  customer_address text not null default '',
  status          text not null default 'Pending'
                    check (status in ('Pending','Confirmed','Processing','On the Way','Delivered','Cancelled')),
  payment_status  text not null default 'Unpaid'
                    check (payment_status in ('Unpaid','Partial','Paid')),
  subtotal        numeric not null default 0,
  discount        numeric not null default 0,
  delivery_charge numeric not null default 0,
  total           numeric not null default 0,
  cost_total      numeric not null default 0,
  notes           text not null default '',
  order_date      date not null default current_date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (workspace_id, order_number)
);
create index if not exists orders_workspace_idx on public.orders(workspace_id);
create index if not exists orders_status_idx on public.orders(workspace_id, status);
alter table public.orders enable row level security;
drop policy if exists orders_member_read on public.orders;
create policy orders_member_read on public.orders
  for select using (public.is_workspace_member(workspace_id));
grant select on public.orders to authenticated;

-- ---------- 8. ORDER_ITEMS ----------
create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  product_name text not null default '',
  quantity     integer not null default 1 check (quantity > 0),
  unit_price   numeric not null default 0,
  unit_cost    numeric not null default 0,
  total        numeric not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_id);
alter table public.order_items enable row level security;
drop policy if exists oi_member_read on public.order_items;
create policy oi_member_read on public.order_items
  for select using (public.is_workspace_member(workspace_id));
grant select on public.order_items to authenticated;

-- ---------- 9. TRANSACTIONS (accounting) ----------
create table if not exists public.transactions (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  type            text not null check (type in ('Income','Expense')),
  category        text not null default '',
  amount          numeric not null default 0,
  description     text not null default '',
  date            date not null default current_date,
  related_order_id uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists transactions_workspace_idx on public.transactions(workspace_id);
alter table public.transactions enable row level security;
drop policy if exists txn_member_read on public.transactions;
create policy txn_member_read on public.transactions
  for select using (public.is_workspace_member(workspace_id));
grant select on public.transactions to authenticated;

-- ---------- 10. NOTIFICATIONS ----------
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  title        text not null default '',
  body         text not null default '',
  type         text not null default 'general',
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists notif_workspace_user_idx on public.notifications(workspace_id, user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists notif_member_read on public.notifications;
create policy notif_member_read on public.notifications
  for select using (public.is_workspace_member(workspace_id));
grant select on public.notifications to authenticated;

-- ---------- 11. SUPPLIERS (sourcing) ----------
create table if not exists public.suppliers (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null default '',
  phone        text not null default '',
  email        text not null default '',
  address      text not null default '',
  products     text not null default '',
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists suppliers_workspace_idx on public.suppliers(workspace_id);
alter table public.suppliers enable row level security;
drop policy if exists suppliers_member_read on public.suppliers;
create policy suppliers_member_read on public.suppliers
  for select using (public.is_workspace_member(workspace_id));
grant select on public.suppliers to authenticated;

-- ---------- 12. PURCHASES (sourcing) ----------
create table if not exists public.purchases (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  supplier_id  uuid references public.suppliers(id) on delete set null,
  product_id   uuid references public.products(id) on delete set null,
  product_name text not null default '',
  quantity     integer not null default 1,
  unit_cost    numeric not null default 0,
  total_cost   numeric not null default 0,
  date         date not null default current_date,
  status       text not null default 'pending' check (status in ('pending','received','cancelled')),
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists purchases_workspace_idx on public.purchases(workspace_id);
alter table public.purchases enable row level security;
drop policy if exists purchases_member_read on public.purchases;
create policy purchases_member_read on public.purchases
  for select using (public.is_workspace_member(workspace_id));
grant select on public.purchases to authenticated;

-- ---------- 13. CAMPAIGNS (marketing) ----------
create table if not exists public.campaigns (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null default '',
  platform     text not null default 'Facebook',
  status       text not null default 'draft' check (status in ('draft','active','paused','completed')),
  budget       numeric not null default 0,
  spent        numeric not null default 0,
  start_date   date,
  end_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists campaigns_workspace_idx on public.campaigns(workspace_id);
alter table public.campaigns enable row level security;
drop policy if exists campaigns_member_read on public.campaigns;
create policy campaigns_member_read on public.campaigns
  for select using (public.is_workspace_member(workspace_id));
grant select on public.campaigns to authenticated;

-- ---------- 14. AUTOMATION_SETTINGS ----------
create table if not exists public.automation_settings (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  ai_employee_id text not null,
  enabled       boolean not null default false,
  settings      jsonb not null default '{}'::jsonb,
  usage_count   integer not null default 0,
  usage_limit   integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, ai_employee_id)
);
create index if not exists automation_workspace_idx on public.automation_settings(workspace_id);
alter table public.automation_settings enable row level security;
drop policy if exists auto_member_read on public.automation_settings;
create policy auto_member_read on public.automation_settings
  for select using (public.is_workspace_member(workspace_id));
grant select on public.automation_settings to authenticated;

-- ---------- 15. BUSINESS_AUDIT_LOGS ----------
create table if not exists public.business_audit_logs (
  id          uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id    uuid references auth.users(id),
  action      text not null,
  entity_type text not null default '',
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists biz_audit_workspace_idx on public.business_audit_logs(workspace_id, created_at desc);
alter table public.business_audit_logs enable row level security;
drop policy if exists biz_audit_member_read on public.business_audit_logs;
create policy biz_audit_member_read on public.business_audit_logs
  for select using (public.is_workspace_member(workspace_id));
grant select on public.business_audit_logs to authenticated;

-- ---------- 16. updated_at triggers for business tables ----------
-- Reuse set_updated_at() from migration 0001.
do $$
declare t text;
begin
  foreach t in array array[
    'business_profiles','products','customers','leads','conversations',
    'orders','transactions','suppliers','purchases','campaigns','automation_settings'
  ] loop
    execute format('drop trigger if exists %I_set_updated_t on public.%I', t, t);
    execute format('create trigger %I_set_updated_t before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end; $$;

-- ============================================================================
-- 17. HEART OF BIZMATE — Atomic order creation RPC (stock-safe, price-safe)
-- ============================================================================
-- Called by the backend with the service-role key. NEVER trusts client/AI-
-- supplied price or cost — all monetary values are read authoritatively from
-- public.products under a SELECT FOR UPDATE lock. Validates every item,
-- rejects empty item arrays and negative discount/delivery charge, then
-- creates order + items, decrements stock, updates customer totals, and
-- creates an income transaction if paid — all in one transaction.
-- Returns the created order row as JSON.
create or replace function public.heart_create_order(
  p_workspace_id    uuid,
  p_actor_id        uuid,
  p_customer_id     uuid,
  p_items           jsonb,
  p_discount        numeric default 0,
  p_delivery_charge numeric default 0,
  p_payment_status  text default 'Unpaid',
  p_status          text default 'Pending',
  p_notes           text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id    uuid;
  v_order_no    text;
  v_subtotal    numeric := 0;
  v_cost_total  numeric := 0;
  v_total       numeric := 0;
  v_item        jsonb;
  v_prod        record;
  v_cust        record;
  v_items_count int := 0;
  v_qty         int;
begin
  -- ---- Input validation ----
  if p_discount is null or p_discount < 0 then
    raise exception 'Discount cannot be negative.';
  end if;
  if p_delivery_charge is null or p_delivery_charge < 0 then
    raise exception 'Delivery charge cannot be negative.';
  end if;
  -- Reject empty or null item arrays
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item.';
  end if;

  -- Resolve customer (must belong to the same workspace)
  select * into v_cust from public.customers
    where id = p_customer_id and workspace_id = p_workspace_id;
  if not found then
    raise exception 'Customer not found in this workspace.';
  end if;

  -- Generate order number
  v_order_no := public.next_order_number();

  -- ---- Pass 1: lock products, validate, compute totals from DB values ----
  for v_item in select * from jsonb_array_elements(p_items) loop
    -- Validate quantity (must be a positive integer)
    v_qty := nullif(v_item->>'quantity', '')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Each order item must have a quantity that is a positive integer.';
    end if;

    -- Lock the product row; it must belong to the same workspace
    select * into v_prod from public.products
      where id = (v_item->>'product_id')::uuid
        and workspace_id = p_workspace_id
      for update;
    if not found then
      raise exception 'Product % not found in this workspace.', v_item->>'product_id';
    end if;
    if v_prod.stock < v_qty then
      raise exception 'Insufficient stock for "%". Available: %, requested: %.',
        v_prod.name, v_prod.stock, v_qty;
    end if;

    -- Accumulate totals using AUTHORITATIVE database price and cost
    v_subtotal    := v_subtotal   + v_prod.price * v_qty;
    v_cost_total  := v_cost_total + v_prod.cost  * v_qty;
    v_items_count := v_items_count + 1;
  end loop;

  v_total := greatest(0, v_subtotal - p_discount + p_delivery_charge);

  -- Create the order
  insert into public.orders (
    workspace_id, order_number, customer_id, customer_name, customer_phone,
    customer_address, status, payment_status, subtotal, discount, delivery_charge,
    total, cost_total, notes
  )
  values (
    p_workspace_id, v_order_no, p_customer_id, v_cust.name, v_cust.phone,
    v_cust.address, p_status, p_payment_status, v_subtotal, p_discount, p_delivery_charge,
    v_total, v_cost_total, p_notes
  )
  returning id into v_order_id;

  -- ---- Pass 2: decrement stock + create order_items with DB values ----
  -- Locks from pass 1 are still held within this transaction.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;

    select * into v_prod from public.products
      where id = (v_item->>'product_id')::uuid
        and workspace_id = p_workspace_id
      for update;

    -- Decrement stock
    update public.products set stock = stock - v_qty where id = v_prod.id;

    -- Create order item using DB product name, price, and cost
    insert into public.order_items (
      workspace_id, order_id, product_id, product_name, quantity, unit_price, unit_cost, total
    )
    values (
      p_workspace_id, v_order_id, v_prod.id, v_prod.name,
      v_qty, v_prod.price, v_prod.cost, v_prod.price * v_qty
    );
  end loop;

  -- Update customer totals
  update public.customers
     set total_orders = total_orders + 1,
         total_spent  = total_spent + v_total
   where id = p_customer_id;

  -- Create income transaction if paid
  if p_payment_status = 'Paid' then
    insert into public.transactions (
      workspace_id, type, category, amount, description, date, related_order_id
    )
    values (
      p_workspace_id, 'Income', 'Order', v_total,
      v_order_no || ' — ' || coalesce(v_cust.name, 'Customer'),
      current_date, v_order_id
    );
  end if;

  -- Audit log
  insert into public.business_audit_logs (
    workspace_id, actor_id, action, entity_type, entity_id, metadata
  )
  values (
    p_workspace_id, p_actor_id, 'order.created', 'order', v_order_id,
    jsonb_build_object('order_number', v_order_no, 'total', v_total, 'items', v_items_count)
  );

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_no,
    'total', v_total,
    'items_count', v_items_count
  );
end; $$;

revoke all on function public.heart_create_order(uuid, uuid, uuid, jsonb, numeric, numeric, text, text, text) from public, anon, authenticated;

-- ============================================================================
-- 18. HEART — Atomic order status transition (stock + customer + txn sync)
-- ============================================================================
-- Handles cancel/restore atomically: returns stock, adjusts customer totals,
-- removes/recreates income transaction. All other transitions just update
-- the status field.
create or replace function public.heart_update_order_status(
  p_workspace_id uuid,
  p_actor_id     uuid,
  p_order_id     uuid,
  p_new_status   text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order  record;
  v_item   record;
  v_prod   record;
  v_cust   record;
begin
  select * into v_order from public.orders
    where id = p_order_id and workspace_id = p_workspace_id
    for update;
  if not found then
    raise exception 'Order not found in this workspace.';
  end if;

  if v_order.status = p_new_status then
    return jsonb_build_object('id', v_order.id, 'status', p_new_status);
  end if;

  -- Cancel: return stock, reverse customer totals, remove income txn
  if p_new_status = 'Cancelled' and v_order.status <> 'Cancelled' then
    for v_item in select * from public.order_items where order_id = p_order_id loop
      select * into v_prod from public.products where id = v_item.product_id for update;
      if found then
        update public.products set stock = stock + v_item.quantity where id = v_prod.id;
      end if;
    end loop;
    if v_order.customer_id is not null then
      update public.customers
         set total_orders = greatest(0, total_orders - 1),
             total_spent  = greatest(0, total_spent - v_order.total)
       where id = v_order.customer_id;
    end if;
    delete from public.transactions where related_order_id = p_order_id and type = 'Income';
  end if;

  -- Restore from cancelled: re-deduct stock, re-add customer totals, recreate income
  if v_order.status = 'Cancelled' and p_new_status <> 'Cancelled' then
    for v_item in select * from public.order_items where order_id = p_order_id loop
      select * into v_prod from public.products where id = v_item.product_id for update;
      if found then
        if v_prod.stock < v_item.quantity then
          raise exception 'Insufficient stock to restore order for "%". Available: %, needed: %.',
            v_prod.name, v_prod.stock, v_item.quantity;
        end if;
        update public.products set stock = stock - v_item.quantity where id = v_prod.id;
      end if;
    end loop;
    if v_order.customer_id is not null then
      update public.customers
         set total_orders = total_orders + 1,
             total_spent  = total_spent + v_order.total
       where id = v_order.customer_id;
    end if;
    if v_order.payment_status = 'Paid' then
      insert into public.transactions (workspace_id, type, category, amount, description, date, related_order_id)
      values (p_workspace_id, 'Income', 'Order', v_order.total,
              v_order.order_number || ' — ' || coalesce(v_order.customer_name, 'Customer'),
              current_date, p_order_id);
    end if;
  end if;

  -- Apply the status change
  update public.orders set status = p_new_status where id = p_order_id;

  -- Audit log
  insert into public.business_audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_workspace_id, p_actor_id, 'order.status_changed', 'order', p_order_id,
          jsonb_build_object('from', v_order.status, 'to', p_new_status));

  return jsonb_build_object('id', p_order_id, 'status', p_new_status);
end; $$;

revoke all on function public.heart_update_order_status(uuid, uuid, uuid, text) from public, anon, authenticated;