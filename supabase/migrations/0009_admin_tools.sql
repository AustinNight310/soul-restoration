-- Admin tools: admin-only menu, cancelling and quote pricing; worker price suggestions;
-- an activity log; shop settings and the team list for the admin pages.
-- Additions only. The admin-only rules are triggers, so every existing policy stays as it is.
-- They apply to signed-in users (the website); the Supabase SQL editor has no signed-in user and isn't limited.

-- ---------- admin-only changes ----------
create or replace function private.require_admin_for_menu()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not private.is_admin() then
    raise exception 'Only an admin can change the menu.';
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.require_admin_for_menu() from public, anon, authenticated;
create trigger services_admin_only before insert or update or delete on public.services
  for each row execute function private.require_admin_for_menu();

create or replace function private.require_admin_to_cancel()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled'
     and auth.uid() is not null and not private.is_admin() then
    raise exception 'Only an admin can cancel an order.';
  end if;
  return new;
end;
$$;
revoke all on function private.require_admin_to_cancel() from public, anon, authenticated;
create trigger orders_admin_cancel before update on public.orders
  for each row execute function private.require_admin_to_cancel();

-- Workers can read quotes and leave a suggested price; only admins set what the customer sees.
alter table public.quote_requests add column staff_suggestion text;
alter table public.quote_requests add column staff_suggested_by uuid references auth.users(id) on delete set null;
create index quote_requests_staff_suggested_by_idx on public.quote_requests(staff_suggested_by);

create or replace function private.require_admin_to_price()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or private.is_admin() then return new; end if;
  -- the customer answering their own priced quote (respond_to_quote)
  if new.user_id = auth.uid() and old.status = 'priced' and new.status in ('accepted', 'declined') then return new; end if;
  if new.status is distinct from old.status or new.price_cents is distinct from old.price_cents
     or new.turnaround is distinct from old.turnaround or new.message is distinct from old.message
     or new.expires_at is distinct from old.expires_at then
    raise exception 'Only an admin can price a quote. Leave a suggestion instead.';
  end if;
  return new;
end;
$$;
revoke all on function private.require_admin_to_price() from public, anon, authenticated;
create trigger quote_requests_admin_price before update on public.quote_requests
  for each row execute function private.require_admin_to_price();

-- ---------- activity log: menu, team and settings changes (order changes are in order_events) ----------
create table public.activity_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid references auth.users(id) on delete set null default auth.uid(),
  kind text not null check (kind in ('menu', 'team', 'settings')),
  summary text not null
);
create index activity_log_at_idx on public.activity_log(at desc);
create index activity_log_actor_idx on public.activity_log(actor);
alter table public.activity_log enable row level security;
create policy "activity admin read" on public.activity_log for select using (private.is_admin());

create or replace function private.dollars(p_cents integer)
returns text language sql immutable set search_path = public as $$
  select case when p_cents is null then '—' when p_cents % 100 = 0 then '$' || (p_cents / 100)::text
              else '$' || to_char(p_cents / 100.0, 'FM999990.00') end;
$$;

create or replace function private.log_menu_change()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log (kind, summary) values ('menu', 'Added ' || new.name || ' at ' || private.dollars(new.price_cents));
  elsif tg_op = 'DELETE' then
    insert into public.activity_log (kind, summary) values ('menu', 'Removed ' || old.name);
  else
    if new.price_cents is distinct from old.price_cents then
      insert into public.activity_log (kind, summary) values ('menu',
        'Changed price of ' || new.name || ' ' || private.dollars(old.price_cents) || ' → ' || private.dollars(new.price_cents));
    end if;
    if new.price_is_sample is distinct from old.price_is_sample then
      insert into public.activity_log (kind, summary) values ('menu',
        case when new.price_is_sample then 'Marked ' || new.name || ' as a sample price' else 'Confirmed the price of ' || new.name end);
    end if;
    if new.active is distinct from old.active then
      insert into public.activity_log (kind, summary) values ('menu',
        case when new.active then 'Put ' || new.name || ' back on the menu' else 'Took ' || new.name || ' off the menu' end);
    end if;
    if new.name is distinct from old.name then
      insert into public.activity_log (kind, summary) values ('menu', 'Renamed ' || old.name || ' to ' || new.name);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.log_menu_change() from public, anon, authenticated;
create trigger services_log after insert or update or delete on public.services
  for each row execute function private.log_menu_change();

create or replace function private.log_team_change()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_table_name = 'profiles' then
    if new.role is distinct from old.role then
      insert into public.activity_log (kind, summary) values ('team',
        case when new.role = 'customer' then 'Removed ' || coalesce(new.email, 'someone') || ' from the team'
             else 'Made ' || coalesce(new.email, 'someone') || ' ' || case when new.role = 'admin' then 'an admin' else 'a worker' end end);
    end if;
  elsif tg_op = 'INSERT' then
    insert into public.activity_log (kind, summary) values ('team', 'Added ' || new.email || ' as ' || case when new.role = 'admin' then 'an admin' else 'a worker' end || ' (waiting to sign up)');
  end if;
  return new;
end;
$$;
revoke all on function private.log_team_change() from public, anon, authenticated;
create trigger profiles_log_role after update of role on public.profiles
  for each row execute function private.log_team_change();
create trigger staff_invites_log after insert on public.staff_invites
  for each row execute function private.log_team_change();

-- ---------- admin pages: team list and shop settings ----------
create or replace function public.team_members()
returns table (id uuid, email text, full_name text, role text, last_sign_in_at timestamptz)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not private.is_admin() then raise exception 'Only an admin can see the team.'; end if;
  return query
    select p.id, p.email, p.full_name, p.role, u.last_sign_in_at
    from public.profiles p join auth.users u on u.id = p.id
    where p.role in ('worker', 'admin')
    order by p.role, coalesce(p.full_name, p.email);
end;
$$;
revoke all on function public.team_members() from public, anon;
grant execute on function public.team_members() to authenticated;

create or replace function public.get_shop_settings()
returns json
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not private.is_admin() then raise exception 'Only an admin can see the shop settings.'; end if;
  return (select json_object_agg(key, value) from private.settings);
end;
$$;
revoke all on function public.get_shop_settings() from public, anon;
grant execute on function public.get_shop_settings() to authenticated;

create or replace function public.set_shop_settings(p_address text, p_hours text, p_phone text)
returns json
language plpgsql security definer
set search_path = public
as $$
declare
  v_key text;
  v_new text;
  v_old text;
begin
  if not private.is_admin() then raise exception 'Only an admin can change the shop settings.'; end if;
  foreach v_key in array array['shop_address', 'shop_hours', 'shop_phone'] loop
    v_new := trim(case v_key when 'shop_address' then p_address when 'shop_hours' then p_hours else p_phone end);
    if v_new is null or v_new = '' then raise exception 'Fill in the address, hours and phone.'; end if;
    select value into v_old from private.settings where key = v_key;
    if v_old is distinct from v_new then
      insert into private.settings (key, value) values (v_key, left(v_new, 300))
      on conflict (key) do update set value = excluded.value;
      insert into public.activity_log (kind, summary) values ('settings',
        'Changed the shop ' || replace(v_key, 'shop_', '') || ' to “' || left(v_new, 300) || '”');
    end if;
  end loop;
  return public.get_shop_settings();
end;
$$;
revoke all on function public.set_shop_settings(text, text, text) from public, anon;
grant execute on function public.set_shop_settings(text, text, text) to authenticated;
