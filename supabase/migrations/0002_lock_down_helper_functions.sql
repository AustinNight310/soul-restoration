-- The sign-up trigger function should never be callable through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Move the staff check out of the exposed API schema. Policies reference it by id, so they keep working.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
alter function public.is_staff() set schema private;
grant execute on function private.is_staff() to anon, authenticated;
