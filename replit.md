# UMUGWANEZA LTD - B2B Web Platform

## Overview
Wholesale Trading + Fleet & Machinery Rental web platform using React + Vite + TypeScript frontend with Supabase backend. Shares the same Supabase project as HAPYJO (Android app), uses `public` schema with `fleet_vehicles` table (renamed to avoid HAPYJO conflicts).

## Tech Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Supabase (PostgreSQL) - `public` schema
- Auth: Dummy authentication (localStorage-based, key: `umugwaneza_auth`)
- Routing: wouter
- Data fetching: @tanstack/react-query + @supabase/supabase-js
- i18n: react-i18next (EN/RW), localStorage key: `umugwaneza_lang`

## Architecture
- Express API proxy pattern: all 14+ pages use `/api/` endpoints
- Server handles business logic and calculations
- Two Supabase client instances: one for main data, one for `public.vehicles` (HAPYJO vehicle sync)

## Key Files
- `client/src/lib/supabase.ts` - Supabase client configuration
- `client/src/lib/auth.tsx` - Dummy auth context (System Admin + Owner roles)
- `client/src/lib/i18n.ts` - i18n configuration (react-i18next)
- `client/src/locales/en.json` - English translations
- `client/src/locales/rw.json` - Kinyarwanda translations
- `client/src/components/app-sidebar.tsx` - Navigation sidebar (i18n-enabled)
- `client/src/components/language-switcher.tsx` - EN/RW language toggle
- `client/src/pages/landing.tsx` - Animated landing page (unauthenticated)
- `shared/schema.ts` - TypeScript types and Zod validation schemas
- `server/routes.ts` - API routes + seed data initialization
- `supabase-setup.sql` - Database schema creation script

## Roles
1. **System Admin** (admin@umugwaneza.rw / 123456) - Platform-level, creates businesses/owners
2. **Owner** (owner@umugwaneza.rw / 123456) - Business-level, full access to grocery + rental + reports

## Business Logic
- All owner data filtered by `business_id = 'biz_001'`
- Grocery: Purchases increase stock, Sales decrease stock
- Profit = Total Sales - Total Purchases
- Rental overlap blocking: prevents double-booking vehicles
- Vehicle sync from public.vehicles (HAPYJO master fleet)
- fleet_vehicles table (not vehicles - HAPYJO uses public.vehicles)

## Routing
- `/` - Landing page (unauthenticated) with animated hero, feature cards
- `/login` - Login page with dummy credentials
- `/dashboard` - Owner dashboard (authenticated)
- `/items`, `/suppliers`, `/customers`, `/purchases`, `/sales`, `/payments` - Grocery modules
- `/vehicles`, `/external-owners`, `/rentals/outgoing`, `/rentals/incoming` - Fleet modules
- `/reports` - 15-type report system with CSV export
- `/notifications` - Real-time business activity notifications
- `/admin/businesses`, `/admin/owners` - Admin modules

## Environment Variables
- VITE_SUPABASE_URL - Supabase project URL
- VITE_SUPABASE_ANON_KEY - Supabase anonymous key

## Theme
- Background: #f8fafc, Cards: #ffffff, Primary: #2563eb
- Text: #1e293b (primary), #64748b (secondary)
- Border: #e2e8f0, Total row bg: #f1f5f9
- Classic professional enterprise UI style

## Phase 2 Features (Completed)
- Animated landing page with hero section, blob backgrounds, fade-up animations
- Internationalization (EN/RW) using react-i18next on all 14+ pages
- Language switcher in header (toggles between English and Kinyarwanda)
- Realistic Rwanda-context dummy data (Kinyarwanda item names, Rwandan suppliers/customers/locations)
- Subtle UI animations: page transitions (animate-page-fade), table row stagger (animate-row-slide), button hover scale effects
- CSS animations defined in index.css: landing-fade-up, landing-blob-1/2/3, page-fade-in, row-slide-in

## Phase 3 Features (Completed)
- **15-Type Report System**: Daily, Monthly, Custom Date Range, Purchase, Sales, Profit, Outstanding Payables, Outstanding Receivables, Stock Summary, Supplier Ledger, Customer Ledger, Rental Outgoing, Rental Incoming, Vehicle Utilization, Rental Profit
- **Dynamic Report Filters**: Report type selector, date pickers (daily/monthly/custom range), optional supplier/customer filters, required supplier/customer for ledger reports
- **CSV Export**: All report types exportable with proper file naming (e.g., UMUGWANEZA_LTD_Daily_Report_2026-02-24.csv)
- **Payments Tabbed UI**: Grocery Payments tab + Rental Payments tab with full CRUD for both
- **Rental Payments**: Record payments against pending rental contracts, list with vehicle/direction info
- **Notifications Page**: Real-time business activity feed (purchases, sales, payments, rentals, vehicle alerts, overdue items)
- **Notification Bell**: Header bell icon with badge count, links to /notifications, auto-refreshes every 30s
- **14+ New API Endpoints**: All report types, rental payments listing, pending contracts, notifications
- **Server-side report helpers**: buildUnifiedRows() and computeSummary() for shared report logic
- **Full i18n Coverage**: All new UI strings translated in both EN and RW (en.json, rw.json)

## Key Components (Phase 3)
- `client/src/pages/reports.tsx` - 15-type report page with dynamic columns, filters, CSV export
- `client/src/pages/payments.tsx` - Tabbed payments (Grocery + Rental) with dialogs
- `client/src/pages/notifications.tsx` - Notification feed with icons and timestamps
- `client/src/components/notification-bell.tsx` - Header bell icon with unread badge count
