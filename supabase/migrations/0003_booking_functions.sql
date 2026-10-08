-- Booking, quote and order-lookup functions for the shop-test build.
-- The browser calls these; prices are always read from the services table here,
-- never trusted from the browser.

-- 'booked' = confirmed without online payment (test build, pay at drop-off)
alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check check (status in
  ('pending_payment','booked','paid','received','inspected','in_restoration','ready_for_pickup','picked_up','cancelled'));

-- private shop settings: the address is only ever returned to someone who just booked
create table private.settings (
  key text primary key,
  value text not null
);
insert into private.settings (key, value) values
  ('shop_address', '3349 Hull Avenue, Bronx, NY'),
  ('shop_hours', 'Evenings after 5pm. Text to confirm before you come.'),
  ('shop_phone', '347-238-9320');

create or replace function public.create_booking(
  p_email text,
  p_service_ids text[],
  p_handoff text,
  p_pickup_address text default null,
  p_pickup_phone text default null,
  p_pickup_evening text default null,
  p_shoe_model text default null,
  p_shoe_size text default null,
  p_shoe_color text default null,
  p_notes text default null,
  p_photo_consent boolean default true,
  p_terms_version text default 'test-2026-10'
) returns json
language plpgsql security definer
set search_path = public, private
as $$
declare
  v_email text := lower(trim(p_email));
  v_order public.orders%rowtype;
  v_total integer := 0;
  v_count integer;
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;
  if p_service_ids is null or cardinality(p_service_ids) = 0 or cardinality(p_service_ids) > 10 then
    raise exception 'Pick at least one service.' using errcode = '22023';
  end if;
  select count(*) into v_count from public.services
    where id = any(p_service_ids) and active and kind in ('fixed','bundle');
  if v_count <> cardinality(array(select distinct unnest(p_service_ids))) then
    raise exception 'One of those services is not available.' using errcode = '22023';
  end if;
  if p_handoff not in ('drop_off','pickup') then
    raise exception 'Choose drop-off or pickup.' using errcode = '22023';
  end if;
  if p_handoff = 'pickup' and (coalesce(trim(p_pickup_address),'') = '' or coalesce(trim(p_pickup_phone),'') = '') then
    raise exception 'Pickup needs an address and a mobile number.' using errcode = '22023';
  end if;

  select coalesce(sum(price_cents),0) into v_total from public.services where id = any(p_service_ids);

  insert into public.orders (
    user_id, email, status, handoff, pickup_address, pickup_phone, pickup_evening, pickup_status,
    shoe_model, shoe_size, shoe_color, customer_notes, total_cents, terms_version, terms_agreed_at, photo_consent, is_test
  ) values (
    auth.uid(), v_email, 'booked', p_handoff,
    left(nullif(trim(p_pickup_address),''), 300), left(nullif(trim(p_pickup_phone),''), 40), left(nullif(trim(p_pickup_evening),''), 40),
    case when p_handoff = 'pickup' then 'requested' end,
    left(nullif(trim(p_shoe_model),''), 120), left(nullif(trim(p_shoe_size),''), 20), left(nullif(trim(p_shoe_color),''), 80),
    left(nullif(trim(p_notes),''), 2000), v_total, left(p_terms_version, 40), now(), coalesce(p_photo_consent, true), true
  ) returning * into v_order;

  insert into public.order_items (order_id, service_id, name, price_cents, pairs)
    select v_order.id, s.id, s.name, coalesce(s.price_cents,0), s.pairs
    from public.services s where s.id = any(p_service_ids);

  insert into public.order_events (order_id, status, note)
    values (v_order.id, 'booked', case when p_handoff = 'pickup' then 'Pickup requested' else 'Booked for drop-off' end);

  return json_build_object(
    'number', v_order.number,
    'total_cents', v_total,
    'handoff', p_handoff,
    'shop_address', case when p_handoff = 'drop_off' then (select value from private.settings where key = 'shop_address') end,
    'shop_hours', (select value from private.settings where key = 'shop_hours'),
    'shop_phone', (select value from private.settings where key = 'shop_phone')
  );
end;
$$;

-- Track an order with its number + the email used to book (no login needed)
create or replace function public.get_order_status(p_number integer, p_email text)
returns json
language plpgsql stable security definer
set search_path = public, private
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders
    where number = p_number and email = lower(trim(p_email));
  if not found then
    return null;
  end if;
  return json_build_object(
    'number', v_order.number,
    'status', v_order.status,
    'handoff', v_order.handoff,
    'pickup_status', v_order.pickup_status,
    'pickup_time', v_order.pickup_time,
    'shoe_model', v_order.shoe_model,
    'total_cents', v_order.total_cents,
    'created_at', v_order.created_at,
    'shop_address', case when v_order.handoff = 'drop_off' and v_order.status <> 'cancelled'
                      then (select value from private.settings where key = 'shop_address') end,
    'shop_hours', (select value from private.settings where key = 'shop_hours'),
    'items', coalesce((select json_agg(json_build_object('name', name, 'price_cents', price_cents) order by name)
                       from public.order_items where order_id = v_order.id), '[]'::json),
    'events', coalesce((select json_agg(json_build_object('status', status, 'note', note, 'at', created_at) order by created_at)
                        from public.order_events where order_id = v_order.id), '[]'::json)
  );
end;
$$;

create or replace function public.create_quote_request(
  p_email text,
  p_kind text,
  p_description text,
  p_shoe_model text default null,
  p_shoe_size text default null,
  p_inspiration_url text default null
) returns json
language plpgsql security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_q public.quote_requests%rowtype;
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;
  if coalesce(trim(p_description),'') = '' then
    raise exception 'Describe what you want done.' using errcode = '22023';
  end if;
  insert into public.quote_requests (user_id, email, kind, description, shoe_model, shoe_size, inspiration_url)
  values (auth.uid(), v_email, left(p_kind, 40), left(trim(p_description), 2000),
          left(nullif(trim(p_shoe_model),''), 120), left(nullif(trim(p_shoe_size),''), 20),
          left(nullif(trim(p_inspiration_url),''), 500))
  returning * into v_q;
  return json_build_object('number', v_q.number);
end;
$$;

-- public entry points, callable without signing in (they validate everything themselves)
revoke all on function public.create_booking(text, text[], text, text, text, text, text, text, text, text, boolean, text) from public;
revoke all on function public.get_order_status(integer, text) from public;
revoke all on function public.create_quote_request(text, text, text, text, text, text) from public;
grant execute on function public.create_booking(text, text[], text, text, text, text, text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.get_order_status(integer, text) to anon, authenticated;
grant execute on function public.create_quote_request(text, text, text, text, text, text) to anon, authenticated;
