# Soul Restoration

Booking and order-tracking site for Soul Restoration, a sneaker restoration shop in the Bronx.
This is the **shop-test build**: real screens and real data, but no online payments yet.

## What's here

| Page | What it does |
|---|---|
| `/` | Home ("Our work"): a showroom — the pair on display, the collection, At the bench (the journey in six steps), Criss's words, reviews |
| `/services` | Book by photos (the flow below), then the live menu with prices, bundles, how it works, FAQ |
| `/book` | The same book-by-photos flow on its own page; `/book?s=<service>` starts the first pair with that service ticked |
| `/track` | Order status by order number + email (no login) |
| `/quote` | Paint job quote request |
| `/terms` | Draft service terms (replace before taking real payments) |
| `/sign-in` | Customer sign-in: we email a link, no password |
| `/account` | The signed-in customer's orders (open and past, each with its full status), quotes to accept or decline, and profile |
| `/staff/sign-in` | Staff sign-in with a password, forgot password, and "set up your login" for new staff |
| `/staff` | The bench: open orders by stage, filter to your own or unassigned |
| `/staff/order?id=…` | One order: move stages, check-in and bench photos (choose what the customer sees), assign, pickup time, notes, full history |
| `/staff/search` | Every order, open or done, by number, email, phone, shoe or service |
| `/staff/pickups` | Today's pickups in time order, upcoming ones, and requests that still need a time; call, text, map, mark collected |
| `/staff/quotes` | Price paint and hefty-job quotes; see which ones customers accepted |
| `/staff/ticket?id=…` | Printable 4×6 ticket per pair to keep with the shoes |
| `/staff/menu` | Admins: names, prices, sample/confirmed, on or off the menu, order |
| `/staff/team` | Admins: add staff by email, worker or admin, remove, cancel waiting invites |
| `/staff/reports` | Admins: orders, pairs and booked value; pairs per week; popular services; time in each stage |
| `/staff/settings` | Admins: shop address, hours and phone; activity log of orders, menu, team and settings changes |

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

### Book by photos

`components/pairflow/PairFlow.jsx` takes one pair at a time, one question per screen: photos → what's wrong
(written the way customers say it, each with its service and price) → "is this your pair?" → size.
A confirmed pair without a size shows an amber "Size?" flag in the pair chips until it gets one. Then the whole
order with bundle savings, then email and drop-off or pickup. More than 10 pairs sends one quote request instead.

Photos are shrunk to 1600px JPEGs in the browser and uploaded to the private `photos` bucket under
`incoming/<random>.jpg` (`lib/photos.js`). Visitors may only add files there, never read or change them.
`create_booking` checks each photo exists and isn't used by another order, then saves it in `order_photos`
(`kind = 'customer'`, with its `pair_id`), staff-only until staff choose to show it. The model is optional;
"Not sure, let Criss look" is the `not_sure` service, booked at $0 like paint and priced after review.

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

An admin adds them on the Team page (`/staff/team`), which calls `set_staff_role(email, role)`.
If that email already has a login, the role changes straight away. If not, the email waits in `staff_invites` until they choose
"set up your login" at `/staff/sign-in` and confirm their email. `'customer'` removes staff access.
Admins can't change their own role, so there's always at least one admin.

Workers and admins share the staff pages. Only admins can change the menu, cancel an order, set a
quote's price (workers leave a suggestion), manage the team, and see reports, settings and the activity
log. The database enforces this with triggers (`0009_admin_tools.sql`), not just the pages. Menu, team
and settings changes are written to `activity_log` automatically.

The Supabase SQL editor isn't limited by these rules, so it still works for one-off fixes.

The sign-in emails link back to `/account` and `/staff/sign-in`, so both must be allowed under
Supabase → Authentication → URL Configuration → Redirect URLs (for example `https://<your domain>/**`).

### Photos

Staff take check-in and bench photos on the order page (phone camera or files). They're shrunk to
1600px JPEGs and stored in the private `photos` bucket under `orders/<order id>/`, with a row in
`order_photos`. New photos are visible to the customer (in their account) unless staff switch one to
"Staff only". The storage rules only let a customer open visible photos of their own orders.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Before launch

- [ ] Upgrade Supabase to Pro, then turn on **Prevent use of leaked passwords**
      (Authentication → Sign In / Providers → Email). It's a Pro-only setting.
- [ ] Add the real domain to Supabase → Authentication → URL Configuration: set the **Site URL** and add
      `https://<your domain>/**` to **Redirect URLs**, so sign-in links and password resets land on the site.
- [ ] Remove the old one-pair booking function that migration 0005 drops (it was never run on the live
      database). In the SQL editor:
      `drop function if exists public.create_booking(text, text[], text, text, text, text, text, text, text, text, boolean, text);`
- [ ] Confirm the sample prices on `/staff/menu`.
- [ ] Set `is_test = false` as the default for new orders and replace the draft `/terms` before taking payments.

## Not built yet

Stripe checkout and deposits, status emails, mail-in, repair map. See the build plan.
