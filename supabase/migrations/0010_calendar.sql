-- Staff calendar: due dates, getting finished pairs back (pick up at the shop or delivery for a fee),
-- and the settings behind them. Additions only.

-- ---------- due dates ----------
-- When the pairs should be ready. Filled in when the order is received (received + the default
-- turnaround from settings) and staff can change it on the order page.
alter table public.orders add column due_at timestamptz;
create index orders_due_at_idx on public.orders(due_at);

-- ---------- getting the pairs back ----------
alter table public.orders add column return_method text check (return_method in ('shop', 'delivery'));
alter table public.orders add column return_address text;
alter table public.orders add column return_phone text;
alter table public.orders add column return_evening text;
alter table public.orders add column return_status text check (return_status in ('requested', 'confirmed', 'delivered'));
alter table public.orders add column return_at timestamptz;
alter table public.orders add column return_time text;          -- friendly label the customer sees
alter table public.orders add column return_fee_cents integer check (return_fee_cents is null or return_fee_cents >= 0);
create index orders_return_at_idx on public.orders(return_at);

-- ---------- settings ----------
-- delivery_fee_cents: blank until the shop decides the price. default_turnaround_days: for due dates.
-- closed_days: days of the week the shop is closed, as numbers (0 = Sunday), comma separated.
insert into private.settings (key, value) values
  ('delivery_fee_cents', ''),
  ('default_turnaround_days', '7'),
  ('closed_days', '0')
on conflict (key) do nothing;

create or replace function public.set_calendar_settings(p_delivery_fee_cents integer, p_turnaround_days integer, p_closed_days integer[])
returns json
language plpgsql security definer
set search_path = public
as $$
declare
  v_fee text := coalesce(p_delivery_fee_cents::text, '');
  v_days text := coalesce(p_turnaround_days, 7)::text;
  v_closed text := coalesce(array_to_string(p_closed_days, ','), '');
begin
  if not private.is_admin() then raise exception 'Only an admin can change the settings.'; end if;
  if p_delivery_fee_cents is not null and (p_delivery_fee_cents < 0 or p_delivery_fee_cents > 100000) then
    raise exception 'The delivery fee doesn’t look right.';
  end if;
  if p_turnaround_days is not null and (p_turnaround_days < 1 or p_turnaround_days > 60) then
    raise exception 'Turnaround should be between 1 and 60 days.';
  end if;
  if exists (select 1 from unnest(coalesce(p_closed_days, '{}')) d where d < 0 or d > 6) then
    raise exception 'Closed days are 0 (Sunday) to 6 (Saturday).';
  end if;
  if (select value from private.settings where key = 'delivery_fee_cents') is distinct from v_fee then
    update private.settings set value = v_fee where key = 'delivery_fee_cents';
    insert into public.activity_log (kind, summary) values ('settings',
      case when v_fee = '' then 'Cleared the delivery fee' else 'Set the delivery fee to ' || private.dollars(p_delivery_fee_cents) end);
  end if;
  if (select value from private.settings where key = 'default_turnaround_days') is distinct from v_days then
    update private.settings set value = v_days where key = 'default_turnaround_days';
    insert into public.activity_log (kind, summary) values ('settings', 'Set the usual turnaround to ' || v_days || ' days');
  end if;
  if (select value from private.settings where key = 'closed_days') is distinct from v_closed then
    update private.settings set value = v_closed where key = 'closed_days';
    insert into public.activity_log (kind, summary) values ('settings', 'Changed the closed days');
  end if;
  return public.get_shop_settings();
end;
$$;
revoke all on function public.set_calendar_settings(integer, integer, integer[]) from public, anon;
grant execute on function public.set_calendar_settings(integer, integer, integer[]) to authenticated;

-- What staff and customers need to plan around: the fee (null until set), turnaround and closed days.
create or replace function public.get_calendar_settings()
returns json
language sql stable security definer
set search_path = public
as $$
  select json_build_object(
    'delivery_fee_cents', nullif((select value from private.settings where key = 'delivery_fee_cents'), '')::integer,
    'default_turnaround_days', coalesce(nullif((select value from private.settings where key = 'default_turnaround_days'), '')::integer, 7),
    'closed_days', coalesce((select array_agg(d::integer) from unnest(string_to_array(nullif((select value from private.settings where key = 'closed_days'), ''), ',')) d), '{}'));
$$;
revoke all on function public.get_calendar_settings() from public;
grant execute on function public.get_calendar_settings() to anon, authenticated;

-- ---------- due date when an order is received ----------
create or replace function private.set_due_date()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.due_at is null and new.status = 'received' and old.status is distinct from 'received' then
    new.due_at := date_trunc('day', now()) + make_interval(days =>
      coalesce(nullif((select value from private.settings where key = 'default_turnaround_days'), '')::integer, 7)) + interval '18 hours';
  end if;
  return new;
end;
$$;
revoke all on function private.set_due_date() from public, anon, authenticated;
create trigger orders_set_due_date before update on public.orders
  for each row execute function private.set_due_date();

-- ---------- the customer chooses how to get their pairs back ----------
-- From their account, any time before the pairs are handed back. Delivery takes the current fee.
create or replace function public.choose_return(p_order_id uuid, p_method text, p_address text, p_phone text, p_evening text)
returns json
language plpgsql security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_fee integer := nullif((select value from private.settings where key = 'delivery_fee_cents'), '')::integer;
begin
  select * into v_order from public.orders where id = p_order_id and user_id = auth.uid();
  if v_order.id is null then raise exception 'We couldn’t find that order on your account.'; end if;
  if v_order.status in ('picked_up', 'cancelled') or v_order.return_status = 'delivered' then
    raise exception 'This order is already finished.';
  end if;
  if p_method not in ('shop', 'delivery') then raise exception 'Pick “pick up” or “delivery”.'; end if;
  if p_method = 'delivery' and (coalesce(trim(p_address), '') = '' or coalesce(trim(p_phone), '') = '') then
    raise exception 'Delivery needs an address and a mobile number.';
  end if;
  update public.orders set
    return_method = p_method,
    return_address = case when p_method = 'delivery' then left(trim(p_address), 300) end,
    return_phone = case when p_method = 'delivery' then left(trim(p_phone), 40) end,
    return_evening = case when p_method = 'delivery' then left(p_evening, 10) end,
    return_status = case when p_method = 'delivery' then 'requested' end,
    return_at = null, return_time = null,
    return_fee_cents = case when p_method = 'delivery' then v_fee end
  where id = p_order_id;
  return json_build_object('method', p_method, 'fee_cents', case when p_method = 'delivery' then v_fee end);
end;
$$;
revoke all on function public.choose_return(uuid, text, text, text, text) from public, anon;
grant execute on function public.choose_return(uuid, text, text, text, text) to authenticated;
