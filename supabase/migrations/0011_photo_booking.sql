-- Book by photos: customers snap each pair, say what's wrong, add the size and see the price right away.
-- Additions plus a new version of create_booking (same arguments); nothing is dropped.

-- ---------- customer photo uploads ----------
-- Anyone booking may add photos, but only as new files under incoming/ with a random name,
-- only images, and at most 10 MB each. They can't list, read, replace or delete anything;
-- staff see the photos once a booking points at them.
update storage.buckets
  set file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']
  where id = 'photos';

create policy "customers add booking photos" on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'photos'
    and name ~ '^incoming/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|heic|heif)$'
  );

-- which pair a photo shows
alter table public.order_photos add column if not exists pair_id uuid references public.order_pairs(id) on delete cascade;
create index if not exists order_photos_pair_id_idx on public.order_photos(pair_id);

-- ---------- "Not sure, let Criss look" ----------
-- Booked like paint: $0 now, priced after Criss sees the photos.
insert into public.services (id, name, short_name, description, kind, price_cents, price_is_sample, pairs, sort)
values ('not_sure', 'Not sure: Criss checks', 'Criss checks',
        'Criss looks at your photos and tells you what the pair needs before any work starts.',
        'quote', null, false, 1, 90)
on conflict (id) do nothing;

-- ---------- create_booking, now with photos and an optional model ----------
-- p_pairs: [{"model": "", "size": "10.5 M", "color": "", "notes": "", "services": ["deep_clean"],
--            "photos": ["incoming/<uuid>.jpg", ...]}, ...]
-- The model is optional now ("Pair 2" when blank). Photos must already be uploaded under incoming/
-- and not belong to another order; up to 6 per pair.
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
  v_photos text[];
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

    v_photos := case when jsonb_typeof(v_pair.value->'photos') = 'array'
                     then array(select distinct jsonb_array_elements_text(v_pair.value->'photos'))
                     else '{}' end;
    if cardinality(v_photos) > 6 then
      raise exception 'Up to 6 photos for pair %.', v_pair.pos using errcode = '22023';
    end if;
    if cardinality(v_photos) > 0 then
      select count(*) into v_count from storage.objects o
        where o.bucket_id = 'photos' and o.name = any(v_photos) and o.name like 'incoming/%'
          and not exists (select 1 from public.order_photos p where p.path = o.name);
      if v_count <> cardinality(v_photos) then
        raise exception 'A photo for pair % didn’t finish uploading. Remove it and add it again.', v_pair.pos using errcode = '22023';
      end if;
    end if;

    insert into public.order_pairs (order_id, position, shoe_model, shoe_size, shoe_color, notes)
    values (v_order.id, v_pair.pos,
            left(nullif(trim(v_pair.value->>'model'),''), 120),
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

    -- customer photos: staff-only until staff choose to show them
    insert into public.order_photos (order_id, pair_id, path, kind, visible_to_customer)
      select v_order.id, v_pair_id, x, 'customer', false from unnest(v_photos) as x;
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
