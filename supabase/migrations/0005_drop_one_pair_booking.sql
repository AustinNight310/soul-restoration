-- The booking page now sends pairs; remove the old one-pair booking function.
drop function if exists public.create_booking(text, text[], text, text, text, text, text, text, text, text, boolean, text);
