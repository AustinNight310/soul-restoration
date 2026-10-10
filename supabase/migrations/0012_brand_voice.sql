-- Customer-facing text speaks as the shop, not one person.
update public.services
  set name = 'Not sure: we take a look',
      short_name = 'We take a look',
      description = 'We look at your photos and tell you what the pair needs before any work starts.'
  where id = 'not_sure';
