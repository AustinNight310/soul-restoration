# Soul Restoration

Booking and order-tracking site for Soul Restoration, a sneaker restoration shop in the Bronx.
This is the **shop-test build**: real screens and real data, but no online payments yet.

## What's here

| Page | What it does |
|---|---|
| `/` | Home ("Our work"): before/after slider, recent work, reviews, About |
| `/services` | Live service menu with prices, bundles, paint quotes, how it works, FAQ |
| `/book` | 3-step booking: each pair and its services → drop-off or pickup → review, terms, book. Over 10 pairs sends a quote request instead |
| `/track` | Order status by order number + email (no login) |
| `/quote` | Paint job quote request |
| `/terms` | Draft service terms (replace before taking real payments) |
| `/staff` | Staff dashboard: order board, move stages, confirm pickups, notes, price quotes |

## How it's put together

- **Next.js** (App Router, plain JavaScript) hosted on **Vercel**.
- **Supabase** for the database and staff logins. Project: `soul-restoration` (US East).
- The browser only ever uses the public *publishable* key. Row-level security decides what each visitor can see:
  - anyone can read the active menu;
  - bookings, quotes and tracking go through database functions (`create_booking`, `create_quote_request`, `get_order_status`) that validate input and calculate prices themselves;
  - only accounts with `role = 'staff'` can see or change orders.
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

### Give someone staff access

They create a login at `/staff`, confirm their email, then run in the Supabase SQL editor:

```sql
update public.profiles set role = 'staff' where email = 'their@email.com';
```

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Not built yet

Stripe checkout and deposits, status emails, photo uploads, mail-in, repair map. See the build plan.
