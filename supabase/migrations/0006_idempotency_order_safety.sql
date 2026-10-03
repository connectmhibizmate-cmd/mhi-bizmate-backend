-- ============================================================================
-- MHI BizMate — STEP 3b: Idempotency + Order Safety Hardening
-- ============================================================================
-- ADDITIVE migration. Does NOT alter existing auth/workspace/RBAC data or any
-- table created by 0001–0005. Safe to run once on a live database.
--
-- CHANGES:
--   1. Creates public.idempotency_keys (workspace-isolated, RLS, no client
--      write grants) for backend-side duplicate-request protection.
--   2. Recreates heart_create_order() with:
--      a. Duplicate product_id merging (sums quantities deterministically).
--      b. Archived product rejection (status must be 'active').
--   3. Recreates heart_update_order_status() with:
--      Valid status-transition enforcement (forward-progress + cancel/restore).
--
-- BUSINESS DECISION (requires Client confirmation):
--   The status transition map below is a forward-progress model:
--     Pending    → Confirmed, Processing, On the Way, Delivered, Cancelled
--     Confirmed  → Processing, On the Way, Delivered, Cancelled
--     Processing → On the Way, Delivered, Cancelled
--     On the Way → Delivered, Cancelled
--     Delivered  → Cancelled (return/refund)
--     Cancelled  → Pending, Confirmed, Processing, On the Way, Delivered (restore)
--   If the Client requires different rules (e.g. Delivered → Pending for
--   returns), the transition map must be updated.
-- ============================================================================

-- ---------- 1. IDEMPOTENCY_KEYS ----------
create table if not exists public.idempotency_keys (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  key            text not null,
  action         text not null,
  actor_id       uuid references auth.users(id),
  response_code  integer not null default 200,
  response_body  jsonb,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default (now() + interval '24 hours'),
  unique (workspace_id, key)
);

create index if not exists idempotency_workspace_idx on public.idempotency_keys(workspace_id, created_at desc);

alter table public.idempotency_keys enable row level security;
drop policy if exists idem_member_read on public.idempotency_keys;
create policy idem_member_read on public.idempotency_keys
  for select using (public.is_workspace_member(workspace_id));
-- No client INSERT/UPDATE/DELETE grants — only the service-role backend writes.
grant select on public.idempotency_keys to authenticated;

-- ============================================================================
-- 2. HEART — Atomic order creation (hardened: merge duplicates, reject archived)
-- ============================================================================
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
  v_merged      record;
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
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item.';
  end if;

  -- Resolve customer (must belong to the same workspace)
  select * into v_cust from public.customers
    where id = p_customer_id and workspace_id = p_workspace_id;
  if not found then
    raise exception 'Customer not found in this workspace.';
  end if;

  -- ---- Merge duplicate product_ids (sum quantities deterministically) ----
  -- This prevents inconsistent stock when the same product_id appears twice
  -- in the items array: instead of two line items each decrementing stock
  -- independently (which could bypass the stock check), we merge them into
  -- one line item with the summed quantity.
  create temp table _merged_items on commit drop as
    select (item->>'product_id')::uuid as product_id,
           sum((item->>'quantity')::int) as quantity
      from jsonb_array_elements(p_items) as item
     group by (item->>'product_id')::uuid;

  -- Generate order number
  v_order_no := public.next_order_number();

  -- ---- Pass 1: lock products, validate, compute totals from DB values ----
  for v_merged in select * from _merged_items loop
    v_qty := v_merged.quantity;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Each order item must have a quantity that is a positive integer.';
    end if;

    -- Lock the product row; it must belong to the same workspace
    select * into v_prod from public.products
      where id = v_merged.product_id
        and workspace_id = p_workspace_id
      for update;
    if not found then
      raise exception 'Product % not found in this workspace.', v_merged.product_id;
    end if;

    -- Reject archived/inactive products
    if v_prod.status <> 'active' then
      raise exception 'Product "%" is archived and cannot be ordered.', v_prod.name;
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
  for v_merged in select * from _merged_items loop
    v_qty := v_merged.quantity;

    select * into v_prod from public.products
      where id = v_merged.product_id
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
-- 3. HEART — Atomic order status transition (hardened: valid transitions only)
-- ============================================================================
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
begin
  select * into v_order from public.orders
    where id = p_order_id and workspace_id = p_workspace_id
    for update;
  if not found then
    raise exception 'Order not found in this workspace.';
  end if;

  -- No-op if the status is already the target
  if v_order.status = p_new_status then
    return jsonb_build_object('id', v_order.id, 'status', p_new_status);
  end if;

  -- ---- Validate status transition (forward-progress + cancel/restore) ----
  if not (
    (v_order.status = 'Pending' and p_new_status in ('Confirmed','Processing','On the Way','Delivered','Cancelled'))
    or (v_order.status = 'Confirmed' and p_new_status in ('Processing','On the Way','Delivered','Cancelled'))
    or (v_order.status = 'Processing' and p_new_status in ('On the Way','Delivered','Cancelled'))
    or (v_order.status = 'On the Way' and p_new_status in ('Delivered','Cancelled'))
    or (v_order.status = 'Delivered' and p_new_status = 'Cancelled')
    or (v_order.status = 'Cancelled' and p_new_status in ('Pending','Confirmed','Processing','On the Way','Delivered'))
  ) then
    raise exception 'Invalid status transition from % to %.', v_order.status, p_new_status;
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