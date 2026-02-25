# Umugwaneza – Deploy & Demo Checklist

Umugwaneza is the B2B/fleet web app that shares the **same Supabase project** as Hapyjo (mobile). It uses the **umugwaneza** schema for all app data; **public** schema remains for Hapyjo Android. No Express server — React frontend talks to Supabase only (Auth + umugwaneza tables and RPCs).

## 1. Environment

- Copy `.env.example` to `.env` (or set in your host).
- Set:
  - `VITE_SUPABASE_URL` – Supabase project URL.
  - `VITE_SUPABASE_ANON_KEY` – Supabase anon (public) key.
- For running the seed script once:
  - `SUPABASE_URL` – same as VITE_SUPABASE_URL.
  - `SUPABASE_SERVICE_ROLE_KEY` – Service role key (never expose in the client).

## 2. Database (Supabase)

Apply migrations in the **same Supabase project** used by Hapyjo.

From the project root (where `supabase/config.toml` lives):

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Or run the SQL in `supabase/migrations/` in order in the Supabase SQL Editor.

**Expose schema umugwaneza:** In Supabase Dashboard → Project Settings → API → “Exposed schemas”, add **umugwaneza** so that `supabase.schema('umugwaneza').from(...)` works from the client.

## 3. Seed data

After migrations and schema exposure:

1. Run the seed script once (creates business `biz_001`, auth users, and app users in `umugwaneza.users`):

```bash
node scripts/seed-umugwaneza-auth.js
```

2. Seed full dummy data into **umugwaneza** (items, suppliers, customers, vehicles, purchases, sales, payments, rentals for `biz_001`):

```bash
npm run seed:data
```

Or run auth + data in one go: `npm run seed`.

**Test credentials** (created by the seed script; do not hardcode in UI):

- **Owner:** `owner@umugwaneza.com` / `umugwaneza@2026` (business_id: biz_001, role: OWNER)
- **Admin:** `Admin@umugwaneza.com` / `umugwaneza@2026` (role: SYSTEM_ADMIN)

Document these in a single place (e.g. README or `.env.example` comment) after build; keep them out of production UI copy.

## 4. Run app

- **Dev:** `npm run dev` (Vite only).
- **Preview build:** `npm run build` then `npm run preview`.
- **Static deploy:** Build outputs to `dist/`; host the contents on any static host (Vercel, Netlify, etc.). No server process.

## 5. Reports & features

- **Reports:** All 15 report types (Daily, Monthly, Custom Range, Purchases, Sales, Profit, Outstanding Payables/Receivables, Stock Summary, Supplier/Customer Ledger, Rental Outgoing/Incoming, Vehicle Utilization, Rental Profit) are available from the Reports page. Click **Generate** to run the selected report (RPCs in schema umugwaneza). CSV export uses filename pattern `UMUGWANEZA_LTD_ReportType_YYYY-MM-DD.csv` (or date range for custom).
- **Rental payments:** Record and list via Rentals and Payments; triggers update contract totals.
- **Notifications:** Recent activity is provided by RPC `umugwaneza.get_recent_activity` (purchases, sales, payments, rentals); client polls periodically.

## 6. Vehicle sync (Hapyjo / Android)

- **Source of truth:** The Android app (Hapyjo) writes vehicles to **public.vehicles** (columns: id, type, vehicle_number_or_id, site_id, etc.).
- **Web app:** Uses **umugwaneza.vehicles** (one row per vehicle per business, with optional `hapyjo_vehicle_id` linking to `public.vehicles.id`).
- **Sync from Hapyjo:** In the web app, go to **Vehicles → Sync from Hapyjo**. This calls RPC `umugwaneza.sync_vehicles_from_hapyjo(p_default_business_id)`, which reads all rows from `public.vehicles` and upserts into `umugwaneza.vehicles` for the current business. Vehicles created in the Android app appear in the web app after running this sync.
- **Dummy data:** `npm run seed:data` seeds **umugwaneza.vehicles** directly (no Android required). To test sync, add a few rows to `public.vehicles` (e.g. via Supabase SQL Editor or from the Android app), then click **Sync from Hapyjo** in the web app.

## 7. Demo tips

- Use **today / yesterday / last month** date ranges in Reports and click **Generate** to see data.
- Log in with `owner@umugwaneza.com` / `umugwaneza@2026` to use biz_001 data.
- All validations (rental overlap, stock on sale, payment overflow, business_id) are enforced by RLS and DB triggers.
