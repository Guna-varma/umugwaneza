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
- `/reports` - Daily unified report with CSV export
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
