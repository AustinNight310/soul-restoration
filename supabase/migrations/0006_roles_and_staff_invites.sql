-- Three kinds of account: customers, workers and admins.
-- Workers and admins both use the staff pages; admins also run the team (and, later, the menu and settings).
-- Admins add staff by email. Someone who already has an account gets the role straight away;
-- anyone else gets it once they sign up and confirm that email.

-- ---------- roles ----------
alter table public.profiles drop constraint profiles_role_check;
update public.profiles set role = 'admin' where role = 'staff';
alter table public.profiles add constraint profiles_role_check check (role in ('customer','worker','admin'));

-- Every existing policy calls private.is_staff(), so workers and admins keep exactly what staff had.
create or replace function private.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('worker','admin'));
$$;

create or replace function private.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- The old "own profile update" policy looked up your role in its own table, which Postgres rejects as
-- infinite recursion, so nobody could save their name or phone. Instead: you may update your own row,
-- and only the name and phone columns. Roles change only through set_staff_role() below.
drop policy "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- ---------- staff invites: emails an admin has added that have no account yet ----------
create table public.staff_invites (
  email text primary key check (email = lower(email)),
  role text not null check (role in ('worker','admin')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index staff_invites_invited_by_idx on public.staff_invites(invited_by);
alter table public.staff_invites enable row level security;
-- Admins can see who is waiting; all changes go through set_staff_role().
create policy "invites admin read" on public.staff_invites for select using (private.is_admin());

-- When someone confirms an email that has an invite, give them that role and use up the invite.
-- Waiting for the confirmation means nobody gets staff access by signing up with an email they don't own.
-- It also writes the profile itself, because this trigger can run before the one that creates it.
create or replace function private.apply_staff_invite()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if new.email_confirmed_at is null or new.email is null then return new; end if;
  delete from public.staff_invites where email = lower(new.email) returning role into v_role;
  if v_role is not null then
    insert into public.profiles (id, email, role) values (new.id, new.email, v_role)
    on conflict (id) do update set role = excluded.role;
  end if;
  return new;
end;
$$;
revoke all on function private.apply_staff_invite() from public, anon, authenticated;

create trigger on_auth_user_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row execute function private.apply_staff_invite();

-- ---------- set_staff_role: the admin's one way to add, change or remove staff ----------
-- 'customer' removes staff access (or cancels a waiting invite).
-- Admins can't change their own role, so the team always keeps at least one admin.
create or replace function public.set_staff_role(p_email text, p_role text)
returns json
language plpgsql security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
  v_old text;
begin
  if not private.is_admin() then
    raise exception 'Only an admin can change the team.';
  end if;
  if p_role is null or p_role not in ('customer','worker','admin') then
    raise exception 'Pick worker, admin or customer.';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'That email doesn’t look right.';
  end if;

  select id, role into v_id, v_old from public.profiles where lower(email) = v_email limit 1;

  if v_id is null then
    if p_role = 'customer' then
      delete from public.staff_invites where email = v_email;
      return json_build_object('status', 'removed');
    end if;
    insert into public.staff_invites (email, role, invited_by) values (v_email, p_role, auth.uid())
    on conflict (email) do update set role = excluded.role, invited_by = excluded.invited_by, created_at = now();
    return json_build_object('status', 'invited');
  end if;

  if v_id = auth.uid() then
    raise exception 'You can’t change your own role. Ask another admin.';
  end if;
  update public.profiles set role = p_role where id = v_id;
  delete from public.staff_invites where email = v_email;
  return json_build_object('status', 'updated', 'previous', v_old);
end;
$$;
revoke all on function public.set_staff_role(text, text) from public, anon;
grant execute on function public.set_staff_role(text, text) to authenticated;
