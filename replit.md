# UMUGWANEZA LTD - B2B Web Platform

## Overview
Wholesale Trading + Fleet & Machinery Rental web platform using React + Vite + TypeScript frontend with Supabase backend. Shares the same Supabase project as HAPYJO (Android app), but uses a separate `umugwaneza` schema.

## Tech Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Supabase (PostgreSQL) - `umugwaneza` schema
- Auth: Dummy authentication (localStorage-based)
- Routing: wouter
- Data fetching: @tanstack/react-query + @supabase/supabase-js

## Architecture
- Direct Supabase client calls from frontend (no Express API layer for data)
- Express server only for initialization/seed endpoint
- Two Supabase client instances: one for `umugwaneza` schema, one for `public` schema (vehicle sync)

## Key Files
- `client/src/lib/supabase.ts` - Supabase client configuration
- `client/src/lib/auth.tsx` - Dummy auth context (System Admin + Owner roles)
- `client/src/components/app-sidebar.tsx` - Navigation sidebar
- `shared/schema.ts` - TypeScript types and Zod validation schemas
- `server/routes.ts` - Seed data initialization endpoint
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

## Environment Variables
- VITE_SUPABASE_URL - Supabase project URL
- VITE_SUPABASE_ANON_KEY - Supabase anonymous key

## Theme
- Background: #f8fafc, Cards: #ffffff, Primary: #2563eb
- Text: #1e293b (primary), #64748b (secondary)
- Border: #e2e8f0, Total row bg: #f1f5f9
- Classic professional enterprise UI style
