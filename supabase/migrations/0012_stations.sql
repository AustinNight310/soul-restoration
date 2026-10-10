-- Stations: every pair is tracked through the shop by scanning QR codes.
-- A QR poster hangs at each station; every pair's ticket has its own QR. A worker scans the station,
-- then the pair, ticks the station's checklist and marks it done. The database records who, where and
-- when (server time), checks the checklist and photos, and moves the order's stage forward on its own,
-- so the customer's tracking page shows where the pairs really are.
-- Additions only, plus a wider photo kind check and a pair row for any old one-pair order that lacks one.

-- ---------- stations ----------
-- checklist: [{"label": "...", "required": true}]
-- services_check: the pair's booked services are added to the checklist (all required)
-- photo_kind: a photo of this kind, taken at this station, is needed before "done"
-- needs_done: the pair must be done at this station first (QC before the ready shelf)
-- asks_spot: ask where the pair was put (shelf spot), shown when someone looks for it
create table public.stations (
  id text primary key check (id ~ '^[a-z0-9_]{2,30}$'),
  name text not null,
  stage text not null check (stage in ('received','inspected','in_restoration','ready_for_pickup','picked_up')),
  sort integer not null default 0,
  hint text,
  checklist jsonb not null default '[]' check (jsonb_typeof(checklist) = 'array'),
  services_check boolean not null default false,
  photo_kind text check (photo_kind in ('intake','finished')),
  needs_done text references public.stations(id) on delete set null,
  asks_spot boolean not null default false,
  active boolean not null default true
);
create index stations_needs_done_idx on public.stations(needs_done);

alter table public.stations enable row level security;
create policy "stations staff read" on public.stations for select using (private.is_staff());
create policy "stations admin update" on public.stations for update using (private.is_admin()) with check (private.is_admin());

insert into public.stations (id, name, stage, sort, hint, checklist, services_check, photo_kind, needs_done, asks_spot) values
  ('checkin', 'Check-in', 'received', 10, 'Where pairs come in: drop-offs and pickups.',
   '[{"label":"Pair matches the ticket (model, size, color)","required":true},
     {"label":"Check-in photos: both sides, toe, heel and soles","required":true},
     {"label":"Existing damage written in the notes","required":true},
     {"label":"Laces and insoles bagged with the ticket","required":false}]', false, 'intake', null, false),
  ('inspect', 'Inspection', 'inspected', 20, 'Criss decides what the pair needs.',
   '[{"label":"Materials checked (leather, suede, mesh, knit)","required":true},
     {"label":"Booked services fit the pair","required":true},
     {"label":"Anything extra flagged for a quote","required":false}]', false, null, null, false),
  ('prep', 'Prep', 'in_restoration', 30, 'Laces and insoles out, dry brush, tape.',
   '[{"label":"Laces and insoles out","required":true},
     {"label":"Dry brushed","required":true},
     {"label":"Taped or masked where needed","required":false}]', false, null, null, false),
  ('bench', 'Restoration bench', 'in_restoration', 40, 'The booked work, service by service.',
   '[{"label":"Upper, midsole and outsole all done","required":true}]', true, null, null, false),
  ('drying', 'Drying rack', 'in_restoration', 50, 'Air dry, away from direct heat.',
   '[{"label":"On the rack, away from direct heat","required":true}]', false, null, null, true),
  ('qc', 'Quality check', 'in_restoration', 60, 'A second look before the customer sees it.',
   '[{"label":"Every booked service done (compare with the ticket)","required":true},
     {"label":"Finished photos taken","required":true},
     {"label":"Laces and insoles back in","required":true},
     {"label":"Fully dry, no residue or glue marks","required":true}]', false, 'finished', null, false),
  ('ready', 'Ready shelf', 'ready_for_pickup', 70, 'Bagged and waiting for the customer.',
   '[{"label":"Bagged with the ticket","required":true}]', false, null, 'qc', true),
  ('handoff', 'Handoff', 'picked_up', 80, 'The counter, or out the door for delivery.',
   '[{"label":"Order number and name confirmed","required":true},
     {"label":"Customer saw the pair, or it left for delivery","required":true}]', false, null, 'ready', false);

-- ---------- where each pair is ----------
alter table public.order_pairs add column station_id text references public.stations(id) on delete set null;
alter table public.order_pairs add column station_state text check (station_state in ('working','done','held','sent_back'));
alter table public.order_pairs add column station_at timestamptz;
alter table public.order_pairs add column station_by uuid references auth.users(id) on delete set null;
alter table public.order_pairs add column next_station_id text references public.stations(id) on delete set null;
alter table public.order_pairs add column hold_note text;
alter table public.order_pairs add column spot text;
create index order_pairs_station_id_idx on public.order_pairs(station_id);
create index order_pairs_station_by_idx on public.order_pairs(station_by);
create index order_pairs_next_station_id_idx on public.order_pairs(next_station_id);

-- Old one-pair orders (booked before pairs existed) get a pair row, so their ticket has a QR too.
insert into public.order_pairs (order_id, position, shoe_model, shoe_size, shoe_color)
select o.id, 1, o.shoe_model, o.shoe_size, o.shoe_color from public.orders o
where not exists (select 1 from public.order_pairs p where p.order_id = o.id);
update public.order_items i set pair_id = p.id
from public.order_pairs p
where i.pair_id is null and p.order_id = i.order_id and p.position = 1
  and (select count(*) from public.order_pairs x where x.order_id = i.order_id) = 1;

-- Finished (after) photos, taken at quality check.
alter table public.order_photos drop constraint order_photos_kind_check;
alter table public.order_photos add constraint order_photos_kind_check check (kind in ('customer','intake','bench','finished'));

-- ---------- every move, as it happened ----------
-- action: arrive | done | hold | release | send_back
-- source: 'scan' when the worker scanned the station's QR on this device, 'manual' when they picked it from a list
-- skipped: stations jumped over on arrival (shown on the pair's history)
create table public.pair_moves (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.order_pairs(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  station_id text references public.stations(id) on delete set null,
  action text not null check (action in ('arrive','done','hold','release','send_back')),
  checks jsonb,
  note text,
  source text not null default 'manual' check (source in ('scan','manual')),
  skipped text[],
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index pair_moves_pair_id_idx on public.pair_moves(pair_id, created_at);
create index pair_moves_order_id_idx on public.pair_moves(order_id);
create index pair_moves_station_id_idx on public.pair_moves(station_id);
create index pair_moves_created_by_idx on public.pair_moves(created_by);
create index pair_moves_created_at_idx on public.pair_moves(created_at);

alter table public.pair_moves enable row level security;
-- Staff read every move. Nobody writes rows directly: pair_action() is the only way in.
create policy "moves staff read" on public.pair_moves for select using (private.is_staff());

-- ---------- one move ----------
create or replace function public.pair_action(
  p_pair_id uuid,
  p_station text,
  p_action text,
  p_checks jsonb default '[]',
  p_note text default null,
  p_source text default 'manual',
  p_target text default null,
  p_spot text default null
) returns json
language plpgsql security definer
set search_path = public, private
as $$
declare
  v_pair public.order_pairs;
  v_order public.orders;
  v_st public.stations;
  v_cur public.stations;
  v_need public.stations;
  v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
  v_spot text := nullif(left(trim(coalesce(p_spot, '')), 40), '');
  v_checks jsonb := coalesce(p_checks, '[]');
  v_required text[];
  v_missing text[];
  v_skipped text[];
  v_arrived timestamptz;
  v_order_stage text;
  v_stages text[] := array['booked','received','inspected','in_restoration','ready_for_pickup','picked_up'];
  v_new_status text;
  v_label text;
begin
  if not private.is_staff() then raise exception 'Only staff can move pairs.'; end if;
  if p_action not in ('arrive','done','hold','release','send_back') then raise exception 'Unknown action.'; end if;
  if jsonb_typeof(v_checks) <> 'array' then raise exception 'Checks should be a list.'; end if;

  select * into v_pair from public.order_pairs where id = p_pair_id for update;
  if v_pair.id is null then raise exception 'We couldn’t find that pair. Check the ticket.'; end if;
  select * into v_order from public.orders where id = v_pair.order_id;
  if v_order.status = 'cancelled' then raise exception 'Order #% was cancelled.', v_order.number; end if;
  select * into v_st from public.stations where id = p_station and active;
  if v_st.id is null then raise exception 'That station isn’t set up. Scan the station QR again.'; end if;
  select * into v_cur from public.stations where id = v_pair.station_id;
  v_label := 'Pair ' || v_pair.position || ' · ' || v_st.name;

  if p_action = 'arrive' then
    if v_pair.station_state = 'held' then
      raise exception 'This pair is on hold: %. Clear the hold first.', coalesce(v_pair.hold_note, 'see the notes');
    end if;
    if v_pair.station_id = v_st.id and v_pair.station_state = 'working' then
      raise exception 'This pair is already being worked at %.', v_st.name;
    end if;
    if v_st.needs_done is not null and not (v_pair.station_id = v_st.needs_done and v_pair.station_state = 'done') then
      select * into v_need from public.stations where id = v_st.needs_done;
      if not private.is_admin() or v_note is null then
        raise exception '% comes after % is done. % is the next step.', v_st.name, v_need.name, v_need.name;
      end if;
    end if;
    -- stations jumped over, unless the pair was sent back here on purpose
    -- and the station it left without finishing
    if v_pair.next_station_id is distinct from v_st.id then
      select array_agg(name order by sort) into v_skipped from public.stations
      where active and sort < v_st.sort and sort > coalesce(v_cur.sort, -1);
    end if;
    if v_cur.id is not null and v_cur.id <> v_st.id and v_pair.station_state = 'working' then
      v_skipped := array_prepend(v_cur.name || ' (not finished)', coalesce(v_skipped, '{}'));
    end if;
    update public.order_pairs set station_id = v_st.id, station_state = 'working', station_at = now(),
      station_by = auth.uid(), next_station_id = null, hold_note = null
    where id = v_pair.id;

  elsif p_action = 'done' then
    if v_pair.station_id is distinct from v_st.id or v_pair.station_state <> 'working' then
      raise exception 'Start the pair at % first.', v_st.name;
    end if;
    select array_agg(x->>'label') into v_required from jsonb_array_elements(v_st.checklist) x where (x->>'required')::boolean;
    if v_st.services_check then
      v_required := coalesce(v_required, '{}') || coalesce((select array_agg(distinct i.name) from public.order_items i where i.pair_id = v_pair.id), '{}');
    end if;
    select array_agg(r) into v_missing from unnest(coalesce(v_required, '{}')) r
    where not v_checks ? r;
    if v_missing is not null then
      raise exception 'Still to check: %', array_to_string(v_missing, ', ');
    end if;
    if v_st.photo_kind is not null then
      select max(created_at) into v_arrived from public.pair_moves
      where pair_id = v_pair.id and station_id = v_st.id and action = 'arrive';
      if not exists (select 1 from public.order_photos ph where ph.pair_id = v_pair.id and ph.kind = v_st.photo_kind
                     and ph.created_at >= coalesce(v_arrived, v_pair.station_at)) then
        raise exception 'Take the % photos for this pair first.', case v_st.photo_kind when 'intake' then 'check-in' else 'finished' end;
      end if;
    end if;
    if v_st.asks_spot and v_spot is null then raise exception 'Say where you put the pair (shelf or rack spot).'; end if;
    update public.order_pairs set station_state = 'done', station_at = now(), station_by = auth.uid(),
      spot = coalesce(v_spot, spot)
    where id = v_pair.id;

  elsif p_action = 'hold' then
    if v_note is null then raise exception 'Say what’s wrong so the next person knows.'; end if;
    update public.order_pairs set station_id = v_st.id, station_state = 'held', station_at = now(),
      station_by = auth.uid(), hold_note = v_note
    where id = v_pair.id;

  elsif p_action = 'release' then
    if v_pair.station_state <> 'held' then raise exception 'This pair isn’t on hold.'; end if;
    if v_note is null then raise exception 'Say how it was sorted out.'; end if;
    update public.order_pairs set station_state = 'working', station_at = now(), station_by = auth.uid(), hold_note = null
    where id = v_pair.id;

  elsif p_action = 'send_back' then
    if v_note is null then raise exception 'Say what needs redoing.'; end if;
    if not exists (select 1 from public.stations where id = p_target and active and sort < v_st.sort) then
      raise exception 'Pick an earlier station to send it back to.';
    end if;
    update public.order_pairs set station_id = v_st.id, station_state = 'sent_back', station_at = now(),
      station_by = auth.uid(), next_station_id = p_target
    where id = v_pair.id;
  end if;

  insert into public.pair_moves (pair_id, order_id, station_id, action, checks, note, source, skipped)
  values (v_pair.id, v_order.id, v_st.id, p_action,
          case when p_action = 'done' then v_checks end,
          case when p_action = 'send_back' then concat_ws(' · ', 'Back to ' || (select name from public.stations where id = p_target), v_note)
               when p_action = 'done' and v_spot is not null then concat_ws(' · ', 'Spot ' || v_spot, v_note)
               else v_note end,
          case when p_source = 'scan' then 'scan' else 'manual' end,
          v_skipped);

  -- The order's stage follows its slowest pair, and only ever moves forward on its own.
  -- A pair counts for a station's stage once it's done there. Until then it counts for the station
  -- before (and any scanned pair is at least received: it's in the shop).
  select v_stages[min(array_position(v_stages,
           case when p.station_id is null then 'booked'
                when p.station_state = 'done' then s.stage
                else coalesce((select s2.stage from public.stations s2 where s2.sort < s.sort and s2.active order by s2.sort desc limit 1), 'received') end))]
    into v_order_stage
  from public.order_pairs p left join public.stations s on s.id = p.station_id
  where p.order_id = v_order.id;
  v_new_status := v_order.status;
  if array_position(v_stages, v_order_stage) > coalesce(array_position(v_stages, v_order.status), 0) then
    v_new_status := v_order_stage;
    update public.orders set status = v_new_status,
      pickup_status = case when v_order.handoff = 'pickup' then 'collected' else pickup_status end,
      return_status = case when v_new_status = 'picked_up' and return_method = 'delivery' then 'delivered' else return_status end
    where id = v_order.id;
    insert into public.order_events (order_id, status, note, created_by)
    values (v_order.id, v_new_status, case v_new_status
      when 'received' then 'Checked in at the shop'
      when 'inspected' then 'Inspected'
      when 'in_restoration' then 'Work started'
      when 'ready_for_pickup' then 'Passed quality check'
      else 'Handed back' end, auth.uid());
  end if;

  return json_build_object('pair_id', v_pair.id, 'station', v_st.id, 'action', p_action,
                           'order_status', v_new_status, 'skipped', v_skipped);
end;
$$;
revoke all on function public.pair_action(uuid, text, text, jsonb, text, text, text, text) from public, anon;
grant execute on function public.pair_action(uuid, text, text, jsonb, text, text, text, text) to authenticated;

-- Station checklists are edited by admins on the Stations page. Changes go in the activity log.
create or replace function private.log_station_change()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.activity_log (kind, summary) values ('settings', 'Changed the ' || new.name || ' station');
  return new;
end;
$$;
revoke all on function private.log_station_change() from public, anon, authenticated;
create trigger stations_log after update on public.stations
  for each row execute function private.log_station_change();
