-- Customer accounts: link earlier guest orders to the account, and let customers answer a priced quote.

-- Orders and quotes booked without an account carry only an email. Once someone signs in with that
-- email (which proves they own it), attach those orders and quotes to their account.
create or replace function public.claim_my_orders()
returns json
language plpgsql security definer
set search_path = public
as $$
declare
  v_email text;
  v_orders integer := 0;
  v_quotes integer := 0;
begin
  select lower(email) into v_email from auth.users
  where id = auth.uid() and email_confirmed_at is not null;
  if v_email is null then
    return json_build_object('orders', 0, 'quotes', 0);
  end if;
  update public.orders set user_id = auth.uid() where user_id is null and lower(email) = v_email;
  get diagnostics v_orders = row_count;
  update public.quote_requests set user_id = auth.uid() where user_id is null and lower(email) = v_email;
  get diagnostics v_quotes = row_count;
  return json_build_object('orders', v_orders, 'quotes', v_quotes);
end;
$$;
revoke all on function public.claim_my_orders() from public, anon;
grant execute on function public.claim_my_orders() to authenticated;

-- Accept or decline your own priced quote while it's still good. Staff see the answer on their Quotes tab.
create or replace function public.respond_to_quote(p_id uuid, p_accept boolean)
returns json
language plpgsql security definer
set search_path = public
as $$
declare
  v_quote public.quote_requests;
begin
  select * into v_quote from public.quote_requests where id = p_id and user_id = auth.uid();
  if v_quote.id is null then
    raise exception 'We couldn’t find that quote on your account.';
  end if;
  if v_quote.status <> 'priced' then
    raise exception 'This quote isn’t waiting for an answer.';
  end if;
  if v_quote.expires_at is not null and v_quote.expires_at < now() then
    raise exception 'This quote has expired. Send a new request and we’ll price it again.';
  end if;
  update public.quote_requests set status = case when p_accept then 'accepted' else 'declined' end where id = p_id;
  return json_build_object('status', case when p_accept then 'accepted' else 'declined' end);
end;
$$;
revoke all on function public.respond_to_quote(uuid, boolean) from public, anon;
grant execute on function public.respond_to_quote(uuid, boolean) to authenticated;
