-- Per-pair bookings: an order holds several pairs, and each pair gets its own services.
-- Deep cleans are counted across the whole order and priced with the bundles automatically,
-- so bundles are no longer booked as their own line item.

-- short labels for the booking buttons ("Un-yellow" instead of "Reverse oxidation")
alter table public.services add column short_name text;
update public.services set short_name = case id
  when 'deep_clean' then 'Deep clean'
  when 'icing' then 'Icing'
  when 'oxidation' then 'Un-yellow'
  when 'suede' then 'Suede'
  when 'sole_repair' then 'Sole repair'
  when 'paint' then 'Paint'
end;

-- display prices for now; Criss confirms later. The 3-pair bundle now actually saves money.
update public.services set price_cents = 10500, price_is_sample = true where id = 'bundle_3';
update public.services set price_is_sample = true where id = 'bundle_6';

create table public.order_pairs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  position integer not null check (position >= 1),
  shoe_model text,
  shoe_size text,
  shoe_color text,
  notes text,
  unique (order_id, position)
);

alter table public.order_pairs enable row level security;
create policy "pairs read" on public.order_pairs for select using (
  private.is_staff() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

alter table public.order_items add column pair_id uuid references public.order_pairs(id) on delete cascade;
create index order_items_pair_id_idx on public.order_items(pair_id);
-- paint and other quoted work: booked now, priced after Criss sees the pair
alter table public.order_items add column needs_quote boolean not null default false;

alter table public.orders add column discount_cents integer not null default 0 check (discount_cents >= 0);

-- Deep clean bundle savings for a number of deep cleans: biggest bundles first,
-- and a bundle only counts when it is cheaper than the same number of single cleans.
create or replace function public.deep_clean_discount(p_count integer)
returns integer
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_single integer;
  v_left integer := greatest(coalesce(p_count, 0), 0);
  v_discount integer := 0;
  b record;
begin
  select price_cents into v_single from public.services where id = 'deep_clean' and active;
  if v_single is null then
    return 0;
  end if;
  for b in
    select pairs, price_cents from public.services
    where kind = 'bundle' and active and price_cents is not null and pairs > 1
    order by pairs desc
  loop
    if b.price_cents < b.pairs * v_single then
      v_discount := v_discount + (v_left / b.pairs) * (b.pairs * v_single - b.price_cents);
      v_left := v_left % b.pairs;
    end if;
  end loop;
  return v_discount;
end;
$$;
revoke all on function public.deep_clean_discount(integer) from public;
grant execute on function public.deep_clean_discount(integer) to anon, authenticated;

-- The per-pair booking function. It sits beside the old one-pair version (different arguments)
-- until the new site is live; 0005 removes the old one.
-- p_pairs: [{"model": "...", "size": "...", "color": "...", "notes": "...", "services": ["deep_clean", "icing"]}, ...]
create or replace function public.create_booking(
  p_email text,
  p_pairs jsonb,
  p_handoff text,
  p_pickup_address text default null,
  p_pickup_phone text default null,
  p_pickup_evening text default null,
  p_photo_consent boolean default true,
  p_terms_version text default 'test-2026-10'
) returns json
language plpgsql security definer
set search_path = public, private
as $$
declare
  v_email text := lower(trim(p_email));
  v_order public.orders%rowtype;
  v_pair record;
  v_pair_id uuid;
  v_ids text[];
  v_count integer;
  v_pairs integer;
  v_subtotal integer;
  v_deep integer;
  v_discount integer;
  v_quote boolean;
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;
  if p_pairs is null or jsonb_typeof(p_pairs) <> 'array' or jsonb_array_length(p_pairs) = 0 then
    raise exception 'Add at least one pair.' using errcode = '22023';
  end if;
  v_pairs := jsonb_array_length(p_pairs);
  if v_pairs > 10 then
    raise exception 'More than 10 pairs is priced by quote. Send a quote request instead.' using errcode = '22023';
  end if;
  if p_handoff not in ('drop_off','pickup') then
    raise exception 'Choose drop-off or pickup.' using errcode = '22023';
  end if;
  if p_handoff = 'pickup' and (coalesce(trim(p_pickup_address),'') = '' or coalesce(trim(p_pickup_phone),'') = '') then
    raise exception 'Pickup needs an address and a mobile number.' using errcode = '22023';
  end if;

  -- totals are filled in after the pairs; any error below rolls the whole booking back
  insert into public.orders (
    user_id, email, status, handoff, pickup_address, pickup_phone, pickup_evening, pickup_status,
    shoe_model, shoe_size, shoe_color, terms_version, terms_agreed_at, photo_consent, is_test
  ) values (
    auth.uid(), v_email, 'booked', p_handoff,
    left(nullif(trim(p_pickup_address),''), 300), left(nullif(trim(p_pickup_phone),''), 40), left(nullif(trim(p_pickup_evening),''), 40),
    case when p_handoff = 'pickup' then 'requested' end,
    case when v_pairs = 1 then left(nullif(trim(p_pairs->0->>'model'),''), 120) else v_pairs || ' pairs' end,
    case when v_pairs = 1 then left(nullif(trim(p_pairs->0->>'size'),''), 20) end,
    case when v_pairs = 1 then left(nullif(trim(p_pairs->0->>'color'),''), 80) end,
    left(p_terms_version, 40), now(), coalesce(p_photo_consent, true), true
  ) returning * into v_order;

  for v_pair in select value, ordinality as pos from jsonb_array_elements(p_pairs) with ordinality loop
    if coalesce(trim(v_pair.value->>'model'),'') = '' then
      raise exception 'Add the brand and model for pair %.', v_pair.pos using errcode = '22023';
    end if;
    if jsonb_typeof(v_pair.value->'services') is distinct from 'array' then
      raise exception 'Pick at least one service for pair %.', v_pair.pos using errcode = '22023';
    end if;
    v_ids := array(select distinct jsonb_array_elements_text(v_pair.value->'services'));
    if cardinality(v_ids) = 0 or cardinality(v_ids) > 10 then
      raise exception 'Pick at least one service for pair %.', v_pair.pos using errcode = '22023';
    end if;
    select count(*) into v_count from public.services
      where id = any(v_ids) and active and kind in ('fixed','quote');
    if v_count <> cardinality(v_ids) then
      raise exception 'One of the services for pair % is not available.', v_pair.pos using errcode = '22023';
    end if;

    insert into public.order_pairs (order_id, position, shoe_model, shoe_size, shoe_color, notes)
    values (v_order.id, v_pair.pos,
            left(trim(v_pair.value->>'model'), 120),
            left(nullif(trim(v_pair.value->>'size'),''), 20),
            left(nullif(trim(v_pair.value->>'color'),''), 80),
            left(nullif(trim(v_pair.value->>'notes'),''), 1000))
    returning id into v_pair_id;

    -- quoted work goes in at $0 and is priced after review
    insert into public.order_items (order_id, pair_id, service_id, name, price_cents, pairs, needs_quote)
      select v_order.id, v_pair_id, s.id, s.name,
             case when s.kind = 'quote' then 0 else coalesce(s.price_cents, 0) end,
             1, s.kind = 'quote'
      from public.services s where s.id = any(v_ids)
      order by s.sort;
  end loop;

  select coalesce(sum(price_cents), 0),
         count(*) filter (where service_id = 'deep_clean'),
         bool_or(needs_quote)
    into v_subtotal, v_deep, v_quote
    from public.order_items where order_id = v_order.id;
  v_discount := public.deep_clean_discount(v_deep);

  update public.orders
    set total_cents = v_subtotal - v_discount, discount_cents = v_discount
    where id = v_order.id;

  insert into public.order_events (order_id, status, note)
    values (v_order.id, 'booked', case when p_handoff = 'pickup' then 'Pickup requested' else 'Booked for drop-off' end);

  return json_build_object(
    'number', v_order.number,
    'total_cents', v_subtotal - v_discount,
    'discount_cents', v_discount,
    'pairs', v_pairs,
    'needs_quote', coalesce(v_quote, false),
    'handoff', p_handoff,
    'shop_address', case when p_handoff = 'drop_off' then (select value from private.settings where key = 'shop_address') end,
    'shop_hours', (select value from private.settings where key = 'shop_hours'),
    'shop_phone', (select value from private.settings where key = 'shop_phone')
  );
end;
$$;

revoke all on function public.create_booking(text, jsonb, text, text, text, text, boolean, text) from public;
grant execute on function public.create_booking(text, jsonb, text, text, text, text, boolean, text) to anon, authenticated;

-- Tracking now returns the order pair by pair. Older one-pair orders have no pairs and keep using items.
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
    'discount_cents', v_order.discount_cents,
    'created_at', v_order.created_at,
    'shop_address', case when v_order.handoff = 'drop_off' and v_order.status <> 'cancelled'
                      then (select value from private.settings where key = 'shop_address') end,
    'shop_hours', (select value from private.settings where key = 'shop_hours'),
    'items', coalesce((select json_agg(json_build_object('name', name, 'price_cents', price_cents, 'needs_quote', needs_quote) order by name)
                       from public.order_items where order_id = v_order.id), '[]'::json),
    'pairs', coalesce((select json_agg(json_build_object(
                         'position', p.position,
                         'model', p.shoe_model,
                         'items', coalesce((select json_agg(json_build_object('name', i.name, 'price_cents', i.price_cents, 'needs_quote', i.needs_quote) order by i.name)
                                            from public.order_items i where i.pair_id = p.id), '[]'::json)
                       ) order by p.position)
                       from public.order_pairs p where p.order_id = v_order.id), '[]'::json),
    'events', coalesce((select json_agg(json_build_object('status', status, 'note', note, 'at', created_at) order by created_at)
                        from public.order_events where order_id = v_order.id), '[]'::json)
  );
end;
$$;
