-- Soul Restoration: core schema for the shop-test build
-- Customers see only their own orders and quotes; staff see everything.
-- Writes that involve money or status go through the server (service role), never the browser.

-- ---------- profiles & roles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer','staff')),
  created_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'staff');
$$;

-- create a profile row whenever someone signs up (email login link)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- services (the menu; staff edit prices here, never in code) ----------
create table public.services (
  id text primary key,
  name text not null,
  description text,
  kind text not null check (kind in ('fixed','quote','bundle')),
  price_cents integer check (price_cents is null or price_cents >= 0),
  price_is_sample boolean not null default true,
  turnaround text,
  pairs integer not null default 1 check (pairs >= 1),
  active boolean not null default true,
  sort integer not null default 0
);

-- ---------- orders ----------
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique default nextval('public.order_number_seq'),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  status text not null default 'pending_payment' check (status in
    ('pending_payment','paid','received','inspected','in_restoration','ready_for_pickup','picked_up','cancelled')),
  handoff text not null default 'drop_off' check (handoff in ('drop_off','pickup','mail_in')),
  pickup_address text,
  pickup_phone text,
  pickup_evening text,
  pickup_status text check (pickup_status is null or pickup_status in ('requested','confirmed','collected')),
  pickup_time text,
  shoe_model text,
  shoe_size text,
  shoe_color text,
  customer_notes text,
  internal_notes text,
  checkin_condition text,
  total_cents integer not null default 0 check (total_cents >= 0),
  deposit_cents integer not null default 0 check (deposit_cents >= 0),
  stripe_session_id text unique,
  terms_version text,
  terms_agreed_at timestamptz,
  photo_consent boolean not null default true,
  is_test boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_id_idx on public.orders(user_id);
create index orders_status_idx on public.orders(status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  service_id text references public.services(id) on delete set null,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  pairs integer not null default 1
);
create index order_items_order_id_idx on public.order_items(order_id);
create index order_items_service_id_idx on public.order_items(service_id);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_events_order_id_idx on public.order_events(order_id);
create index order_events_created_by_idx on public.order_events(created_by);

create table public.order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  path text not null,
  kind text not null check (kind in ('customer','intake','bench')),
  visible_to_customer boolean not null default true,
  created_at timestamptz not null default now()
);
create index order_photos_order_id_idx on public.order_photos(order_id);

-- ---------- paint quotes ----------
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique default nextval('public.order_number_seq'),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  kind text,
  description text not null,
  shoe_model text,
  shoe_size text,
  inspiration_url text,
  status text not null default 'new' check (status in ('new','priced','accepted','declined','expired','cant_take')),
  price_cents integer check (price_cents is null or price_cents >= 0),
  turnaround text,
  message text,
  expires_at timestamptz,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index quote_requests_user_id_idx on public.quote_requests(user_id);
create index quote_requests_order_id_idx on public.quote_requests(order_id);

create table public.quote_photos (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quote_requests(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
create index quote_photos_quote_id_idx on public.quote_photos(quote_id);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------- row-level security ----------
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.order_photos enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_photos enable row level security;

-- profiles: you see and edit your own (not your role); staff see all
create policy "own profile read" on public.profiles for select using (id = (select auth.uid()) or public.is_staff());
create policy "own profile update" on public.profiles for update using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = (select p.role from public.profiles p where p.id = (select auth.uid())));

-- services: anyone can read the active menu; staff manage it
create policy "menu read" on public.services for select using (active or public.is_staff());
create policy "menu staff insert" on public.services for insert with check (public.is_staff());
create policy "menu staff update" on public.services for update using (public.is_staff()) with check (public.is_staff());
create policy "menu staff delete" on public.services for delete using (public.is_staff());

-- orders and children: customers read their own; staff read and update all
create policy "orders read" on public.orders for select using (user_id = (select auth.uid()) or public.is_staff());
create policy "orders staff update" on public.orders for update using (public.is_staff()) with check (public.is_staff());

create policy "items read" on public.order_items for select using (
  public.is_staff() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "events read" on public.order_events for select using (
  public.is_staff() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "events staff insert" on public.order_events for insert with check (public.is_staff());
create policy "photos read" on public.order_photos for select using (
  public.is_staff() or (visible_to_customer and exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))));
create policy "photos staff insert" on public.order_photos for insert with check (public.is_staff());
create policy "photos staff update" on public.order_photos for update using (public.is_staff()) with check (public.is_staff());
create policy "photos staff delete" on public.order_photos for delete using (public.is_staff());

create policy "quotes read" on public.quote_requests for select using (user_id = (select auth.uid()) or public.is_staff());
create policy "quotes staff update" on public.quote_requests for update using (public.is_staff()) with check (public.is_staff());
create policy "quote photos read" on public.quote_photos for select using (
  public.is_staff() or exists (select 1 from public.quote_requests q where q.id = quote_id and q.user_id = (select auth.uid())));

-- ---------- storage: private photo bucket ----------
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;
create policy "staff manage photos" on storage.objects for all
  using (bucket_id = 'photos' and public.is_staff())
  with check (bucket_id = 'photos' and public.is_staff());

-- ---------- seed the launch menu (sample prices until Criss confirms) ----------
insert into public.services (id, name, description, kind, price_cents, price_is_sample, turnaround, pairs, sort) values
  ('deep_clean',  'Deep cleaning',          'Upper, midsole, insoles and laces, cleaned by hand.',                 'fixed',  4000, true, null, 1, 10),
  ('icing',       'Icing bottoms',          'Restores yellowed translucent soles to a clear, icy finish.',          'fixed',  5000, true, null, 1, 20),
  ('oxidation',   'Reverse oxidation',      'Brings yellowed midsoles back toward their original white.',          'fixed',  4500, true, null, 1, 30),
  ('sole_repair', 'Sole separation repair', 'Re-bonds soles that are starting to lift.',                           'fixed',  6000, true, null, 1, 40),
  ('suede',       'Suede treatment',        'Cleans and revives the nap on suede and nubuck.',                     'fixed',  4500, true, null, 1, 50),
  ('bundle_3',    'Deep clean bundle · 3 pairs', 'Deep cleaning for three pairs.',                                 'bundle', 12000, false, null, 3, 60),
  ('bundle_6',    'Deep clean bundle · 6 pairs', 'Deep cleaning for six pairs.',                                   'bundle', 20000, false, null, 6, 70),
  ('paint',       'Paint jobs',             'Recolors, touch-ups and custom designs. Priced per pair by quote.',  'quote',  5000, false, null, 1, 80);
