# Soul Restoration

Booking and order-tracking site for Soul Restoration, a sneaker restoration shop in the Bronx.
This is the **shop-test build**: real screens and real data, but no online payments yet.

## What's here

| Page | What it does |
|---|---|
| `/` | Home ("Our work"): a showroom — the pair on display, the collection, At the bench (the journey in six steps), Criss's words, reviews |
| `/services` | Live service menu with prices, bundles, paint quotes, how it works, FAQ |
| `/book` | 3-step booking: each pair and its services → drop-off or pickup → review, terms, book. Over 10 pairs sends a quote request instead |
| `/track` | Order status by order number + email (no login) |
| `/quote` | Paint job quote request |
| `/terms` | Draft service terms (replace before taking real payments) |
| `/sign-in` | Customer sign-in: we email a link, no password |
| `/account` | The signed-in customer's orders (open and past, each with its full status), quotes to accept or decline, and profile |
| `/staff/sign-in` | Staff sign-in with a password, forgot password, and "set up your login" for new staff |
| `/staff` | Staff dashboard: order board, move stages, confirm pickups, notes, price quotes |

## How it's put together

- **Next.js** (App Router, plain JavaScript) hosted on **Vercel**.
- **Supabase** for the database and staff logins. Project: `soul-restoration` (US East).
- The browser only ever uses the public *publishable* key. Row-level security decides what each visitor can see:
  - anyone can read the active menu;
  - bookings, quotes and tracking go through database functions (`create_booking`, `create_quote_request`, `get_order_status`) that validate input and calculate prices themselves;
  - only staff accounts (`role` is `worker` or `admin`) can see or change orders.
- The shop address lives in `private.settings` and is only returned to someone who just booked a drop-off, or who tracks their order with the right number + email.

## Database

Migrations are in `supabase/migrations/`, applied in order. Menu prices live in the `services` table; change them there, not in code.
`price_is_sample = true` marks prices Criss hasn't confirmed yet. `short_name` is the label on the booking buttons.

### How an order is priced

An order has up to 10 pairs (`order_pairs`), and each pair has its own services (`order_items.pair_id`).
`create_booking` adds up every pair's services, then counts the deep cleans across the whole order and
takes off the bundle savings (`deep_clean_discount`): biggest bundles first, using the bundle rows in `services`.
Paint and other quoted services are booked at $0 with `needs_quote = true` and priced after review.
The booking page shows the same math from `lib/pricing.js`, but the database's total is the one that counts.

### Photos and reviews on the home page

Edit `lib/work.js`. Put before/after photos in `public/work/` and set `before` / `after` on a pair;
pairs without photos show a drawing. Add real customer reviews (with their OK) to `REVIEWS`;
the reviews section stays hidden while that list is empty.

### At the bench animations

`lib/bench.js` lists the six steps. Each shows a drawn placeholder scene until it has a Lottie file:
export the animation as Lottie JSON (Creattie or similar), save it in `public/bench/`, and set
`lottie: '/bench/01-handoff.json'` on that step. It plays when the step comes up and stops on its
last frame for visitors who turn off motion.

### Day and night

The switch in the header sets `data-theme="night"` on `<html>` and remembers it on the device.
All colors come from the tokens at the top of `app/globals.css`; add new colors there, not inline.

### Accounts and roles

Every login has a `role` in `profiles`: `customer` (the default), `worker` or `admin`.
Workers and admins use the staff pages; admins also manage the team. `lib/auth.js` tells every page
who is signed in and as what, but the database rules are what actually allow or block anything.
People can edit their own name and phone, never their role.

Customers sign in at `/sign-in` with an emailed link. Staff sign in at `/staff/sign-in` with a password.

Booking and quote requests still work without an account. Signed in, they're saved under the account's
email automatically. When a customer opens their account, `claim_my_orders()` attaches any earlier guest
orders and quotes booked with the same (confirmed) email. A priced quote can be accepted or declined from
the account (`respond_to_quote()`); accepted quotes show up on the staff Quotes tab.

### Give someone staff access

An admin runs `set_staff_role(email, role)` (the Team page will call it). If that email already has a
login, the role changes straight away. If not, the email waits in `staff_invites` until they choose
"set up your login" at `/staff/sign-in` and confirm their email. `'customer'` removes staff access.
Admins can't change their own role, so there's always at least one admin.

Until the Team page exists, add someone from the Supabase SQL editor:

```sql
insert into public.staff_invites (email, role) values ('their@email.com', 'worker');  -- no login yet
update public.profiles set role = 'worker' where email = 'their@email.com';           -- already has one
```

The sign-in emails link back to `/account` and `/staff/sign-in`, so both must be allowed under
Supabase → Authentication → URL Configuration → Redirect URLs (for example `https://<your domain>/**`).

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Not built yet

Stripe checkout and deposits, status emails, photo uploads, mail-in, repair map. See the build plan.
