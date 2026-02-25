# Umugwaneza – What Is Completed (Database, Backend & Frontend)

This document describes what is **completed** in the Umugwaneza B2B/fleet web app: Supabase database, migrations, auth, API, and client features.

---

## 1. Supabase database

### 1.1 Schema (public)

All tables live in the **public** schema (same Supabase project as Hapyjo where applicable).

| Table | Purpose |
|-------|--------|
| **businesses** | Company record (id, name, currency). |
| **items** | Products (WEIGHT/VOLUME, KG/LITRE). |
| **suppliers** | Suppliers per business. |
| **customers** | Customers per business. |
| **purchases** | Purchase transactions (supplier, item, amounts, financial_status). |
| **sales** | Sales transactions (customer, item, amounts, financial_status). |
| **grocery_payments** | Payments against purchases/sales (reference_type, reference_id). |
| **external_asset_owners** | External owners for fleet assets. |
| **fleet_vehicles** | Fleet (TRUCK/MACHINE, rental_type, ownership_type, hapyjo_vehicle_id). |
| **rental_contracts** | Outgoing/Incoming rentals (vehicle, customer or external_owner, dates, amounts). |
| **rental_payments** | Payments against rental contracts. |
| **notifications** | Event feed (type, title, description, entity_type, entity_id, status). |
| **profiles** | Links `auth.users` to app (user_id, email, role, business_id). |

- **fleet_vehicles** uses `hapyjo_vehicle_id` to align with Hapyjo’s `public.vehicles` (no table name clash).
- Indexes exist for common filters (e.g. `business_id`, dates, `hapyjo_vehicle_id`).

### 1.2 Migrations

- **20250225000000_umugwaneza_tables.sql** – Core tables (businesses → rental_payments) + indexes.
- **20250225000001_notifications_table.sql** – `notifications` table + index; ready for Realtime.
- **20250227000000_umugwaneza_profiles_rls.sql** – `profiles`, RLS on all app tables, helpers.
- **20250227000001_umugwaneza_seed.sql** – Seed for `biz_001` (suppliers, customers, items, owners, vehicles, purchases, sales, rental contracts/payments).

Single-file alternative: **supabase-setup.sql** creates the same tables (including notifications) and grants; run before RLS/seed if not using migrations.

### 1.3 Row Level Security (RLS)

- **profiles**: Users can read own profile; `service_role` has full access; authenticated can read for RLS.
- **Helpers**: `umugwaneza_my_business_id()`, `umugwaneza_my_role()` (SECURITY DEFINER).
- **App tables** (items, suppliers, customers, purchases, sales, grocery_payments, external_asset_owners, fleet_vehicles, rental_contracts, rental_payments, notifications): SELECT/INSERT/UPDATE/DELETE allowed for `authenticated` when `umugwaneza_my_role() = 'SYSTEM_ADMIN'` OR `umugwaneza_my_business_id() = business_id`.
- **businesses**: SYSTEM_ADMIN full; OWNER can SELECT/UPDATE only their `business_id`.

### 1.4 Seed and auth users

- **SQL seed** (migration or supabase-setup + seed): Inserts `biz_001`, suppliers, customers, items, external owners, fleet vehicles, sample purchases/sales and rental contracts/payments.
- **Auth users**: Created by **scripts/seed-umugwaneza-auth.js** (run once; uses `SUPABASE_SERVICE_ROLE_KEY`):
  - **Admin@umugwaneza.com** / umugwaneza@2026 → role `SYSTEM_ADMIN`, `business_id` null.
  - **owner@umugwaneza.com** / umugwaneza@2026 → role `OWNER`, `business_id` = `biz_001`.

---

## 2. Backend (Express + Supabase)

### 2.1 Stack

- **Express** (JSON/urlencoded), **Node** server.
- **Supabase**: Per-request client with **Bearer JWT** for `/api/*`; profile loaded from `profiles` (role, business_id, email).

### 2.2 Auth middleware

- For every request to `/api/*`:
  - Reads `Authorization: Bearer <token>`.
  - Creates Supabase client with that token.
  - Resolves user via `supabase.auth.getUser(token)` and profile from `profiles`.
  - Attaches `req.supabase` and `req.profile` (role, business_id, email).
  - Returns 401 if no/invalid token or no user; 403 if no profile.

### 2.3 API endpoints (all require auth)

| Area | Methods | Notes |
|------|--------|--------|
| **Init** | POST /api/init | Seeds biz_001, suppliers, customers, items, owners, vehicles, purchases, sales, rentals; syncs from Hapyjo `vehicles` if present. |
| **Businesses** | GET/POST /api/businesses | Admin: list and create. |
| **Items** | GET/POST /api/items | Filter `?active=true`. |
| **Suppliers** | GET/POST /api/suppliers | |
| **Customers** | GET/POST /api/customers | |
| **Purchases** | GET/POST /api/purchases | Filters: `?pending=true`, `?date=`. Auto reference (PUR-…). Writes to `notifications`. |
| **Sales** | GET/POST /api/sales | Filters: `?pending=true`, `?date=`. Auto reference (SAL-…). Writes to `notifications`. |
| **Grocery payments** | GET/POST /api/grocery-payments | Updates purchase/sale amounts and status; pushes notification. |
| **External owners** | GET/POST /api/external-owners | |
| **Vehicles** | GET/POST /api/vehicles, POST /api/vehicles/sync | Sync from Hapyjo `public.vehicles` → `fleet_vehicles`. |
| **Rental contracts** | GET/POST /api/rental-contracts, PATCH …/complete | Overlap check; vehicle status updated; notification on create. |
| **Rental payments** | GET/POST /api/rental-payments, GET /api/rental-contracts-pending | Contract amounts/status updated; notification on payment. |
| **Dashboard** | GET /api/dashboard/grocery, GET /api/dashboard/rental | Grocery: items count, today/month sales, payables/receivables. Rental: vehicle counts, month revenue. |
| **Reports** | GET /api/reports/* | See below. |
| **Notifications** | GET /api/notifications | Aggregated feed from `notifications` + recent purchases, sales, payments, rentals, vehicle alerts, overdue payables. |

### 2.4 Reports (15 types)

- **Daily** – `/api/reports/daily?date=`
- **Monthly** – `/api/reports/monthly?month=&year=`
- **Custom range** – `/api/reports/custom?from=&to=`
- **Purchases** – `/api/reports/purchases?from=&to=&supplier_id=`
- **Sales** – `/api/reports/sales?from=&to=&customer_id=` (with net profit in range)
- **Profit** – `/api/reports/profit?from=&to=`
- **Outstanding payables** – `/api/reports/outstanding-payables?supplier_id=`
- **Outstanding receivables** – `/api/reports/outstanding-receivables?customer_id=`
- **Stock summary** – `/api/reports/stock-summary`
- **Supplier ledger** – `/api/reports/supplier-ledger?supplier_id=&from=&to=`
- **Customer ledger** – `/api/reports/customer-ledger?customer_id=&from=&to=`
- **Rental outgoing** – `/api/reports/rental-outgoing?from=&to=`
- **Rental incoming** – `/api/reports/rental-incoming?from=&to=`
- **Vehicle utilization** – `/api/reports/vehicle-utilization?from=&to=`
- **Rental profit** – `/api/reports/rental-profit?from=&to=`

All report endpoints return structured data (rows + summaries); client Reports page supports date filters and CSV export.

### 2.5 Notifications

- **Table**: `notifications` (business_id, type, title, description, entity_type, entity_id, status).
- **Server**: Inserts on purchase, sale, grocery payment, rental contract, rental payment.
- **GET /api/notifications**: Merges `notifications` with recent entities (purchases, sales, payments, rentals, vehicle status, overdue payables), sorted by time, cap 50.

---

## 3. Frontend (React + Vite)

### 3.1 Stack

- **React 18**, **TypeScript**, **Vite**, **Wouter** (routing).
- **TanStack React Query** for API (queryKey as path, auth via `getAccessToken()` in headers).
- **Supabase client** (browser): `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` for auth only.
- **i18n**: react-i18next (e.g. `locales/en.json`).
- **UI**: Radix-based components (e.g. shadcn-style) in `client/src/components/ui/`.

### 3.2 Auth (client)

- **AuthProvider**: Session from `supabase.auth.getSession()` and `onAuthStateChange`; profile fetched from `profiles`; `AuthUser` has role, business_id, admin_name/owner_name.
- **Login**: Email/password via `supabase.auth.signInWithPassword`; quick-fill for Admin and Owner demo accounts.
- **Token**: Stored in memory; `getAccessToken()` used by `queryClient` to add `Authorization: Bearer` to API requests.
- **Routes**: Unauthenticated → Landing or Login; authenticated → role-based layout (Owner vs SYSTEM_ADMIN).

### 3.3 Role-based routing

- **OWNER**: Dashboard, Items, Suppliers, Customers, Purchases, Sales, Payments, Vehicles, External owners, Rentals (outgoing/incoming), Reports, Notifications.
- **SYSTEM_ADMIN**: Admin Businesses, Admin Owners (separate sidebar and routes).

### 3.4 Pages and features

- **Landing** – Public entry.
- **Login** – Email/password, quick-fill (Admin / Owner).
- **Dashboard** – Grocery and rental summary cards (from /api/dashboard/grocery and /api/dashboard/rental).
- **Items, Suppliers, Customers** – List + create (form validation with shared schema/Zod).
- **Purchases, Sales** – List (with filters), create with supplier/customer and item; amounts and status.
- **Payments** – Grocery payments (reference type/id, amount, date, mode) and rental payments; updates linked records.
- **Vehicles** – List fleet; create vehicle; “Sync from Hapyjo” calls POST /api/vehicles/sync.
- **External owners** – List + create.
- **Rentals** – Tabs for Outgoing/Incoming; list contracts; create contract (vehicle, direction, customer/owner, dates, rate); record payments; complete contract.
- **Reports** – Report type selector, date range (daily/monthly/custom), run and display; CSV export.
- **Notifications** – Feed from /api/notifications; polling (e.g. 5s); “Live” badge when data is fresh; type-specific icons/colors.
- **Admin Businesses** – List businesses; create.
- **Admin Owners** – Owner management for admin.

### 3.5 Shared schema and API usage

- **shared/schema.ts**: TypeScript types and Zod schemas for all entities and insert DTOs; used by client forms and validation.
- **client/src/lib/queryClient.ts**: `apiRequest(method, url, data)` and `getQueryFn` with auth headers; queryClient uses queryKey as URL path.

### 3.6 Init on first load

- After login, `initializeApp()` runs once and calls POST /api/init to ensure seed data exists (idempotent if already initialized). Init should be called with the same auth (Bearer) as other API calls if the server requires it for /api/init.

---

## 4. Technical summary

| Layer | Completed |
|-------|-----------|
| **Supabase** | Tables, indexes, RLS, profiles, helpers, seed SQL, notifications table. |
| **Auth** | Supabase Auth; profiles (SYSTEM_ADMIN / OWNER, business_id); server middleware (JWT + profile); client AuthProvider, login, token for API. |
| **API** | Init, CRUD for businesses/items/suppliers/customers/purchases/sales/grocery-payments/external-owners/vehicles/rental-contracts/rental-payments; vehicle sync; dashboard; 15 report types; aggregated notifications. |
| **Client** | Role-based routing, all entity pages, forms, Reports with filters and CSV, Notifications feed and bell, dashboard, i18n, shared types/Zod. |
| **Integrations** | Optional Hapyjo vehicle sync (public.vehicles → fleet_vehicles); same Supabase project possible. |

---

## 5. Environment and run

- **Client**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (server base URL).
- **Server**: `SUPABASE_URL` (or VITE_SUPABASE_URL), `SUPABASE_ANON_KEY` (or VITE_SUPABASE_ANON_KEY); optional `SUPABASE_SERVICE_ROLE_KEY` for seed script.
- **Apply DB**: Run migrations (e.g. `supabase db push`) or run `supabase-setup.sql` then RLS and seed migrations.
- **Seed auth**: `node scripts/seed-umugwaneza-auth.js`.
- **Run**: Server (e.g. `npm run dev` or `npm run start`), client (Vite); single port in production via static serve.

See **DEPLOY.md** for deployment and demo checklist (env, seed, reports, vehicle sync, notifications).
