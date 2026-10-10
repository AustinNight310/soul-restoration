-- Staff tools: who's working each order, real pickup times, and photos customers can see.
-- Additions only: nothing existing is dropped or changed.

-- Who is working on an order (shown on the board, filterable as "Mine" / "Unassigned").
alter table public.orders add column assigned_to uuid references auth.users(id) on delete set null;
create index orders_assigned_to_idx on public.orders(assigned_to);

-- The confirmed pickup as a real time, so Today's pickups can sort and group them.
-- pickup_time stays as the friendly text the customer sees ("Tue, Oct 14, 6:30 PM").
alter table public.orders add column pickup_at timestamptz;
create index orders_pickup_at_idx on public.orders(pickup_at);

-- Who took each photo.
alter table public.order_photos add column created_by uuid references auth.users(id) on delete set null default auth.uid();
create index order_photos_created_by_idx on public.order_photos(created_by);

-- Customers can open the photos of their own orders that staff marked as visible.
-- Staff already manage every file in the bucket ("staff manage photos").
create policy "customers read own visible photos" on storage.objects for select using (
  bucket_id = 'photos' and exists (
    select 1 from public.order_photos p
    join public.orders o on o.id = p.order_id
    where p.path = storage.objects.name
      and p.visible_to_customer
      and o.user_id = (select auth.uid())
  )
);
