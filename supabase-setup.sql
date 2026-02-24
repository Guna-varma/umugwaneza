-- UMUGWANEZA LTD - Database Setup Script
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- Creates all required tables in the public schema

-- Businesses
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'RWF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  item_name TEXT NOT NULL,
  measurement_type TEXT NOT NULL CHECK (measurement_type IN ('WEIGHT', 'VOLUME')),
  base_unit TEXT NOT NULL CHECK (base_unit IN ('KG', 'LITRE')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  supplier_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  customer_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  reference_no TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  item_id UUID NOT NULL REFERENCES items(id),
  total_quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_purchase_cost NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  remaining_amount NUMERIC DEFAULT 0,
  financial_status TEXT DEFAULT 'PENDING' CHECK (financial_status IN ('PENDING', 'PARTIAL', 'FULLY_SETTLED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  reference_no TEXT NOT NULL,
  sale_date DATE NOT NULL,
  item_id UUID NOT NULL REFERENCES items(id),
  total_quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_sale_amount NUMERIC NOT NULL,
  amount_received NUMERIC DEFAULT 0,
  remaining_amount NUMERIC DEFAULT 0,
  financial_status TEXT DEFAULT 'PENDING' CHECK (financial_status IN ('PENDING', 'PARTIAL', 'FULLY_RECEIVED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grocery Payments
CREATE TABLE IF NOT EXISTS grocery_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('PURCHASE', 'SALE')),
  reference_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  mode TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- External Asset Owners
CREATE TABLE IF NOT EXISTS external_asset_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  owner_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fleet Vehicles (named fleet_vehicles to avoid conflict with HAPYJO vehicles table)
CREATE TABLE IF NOT EXISTS fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  hapyjo_vehicle_id TEXT,
  vehicle_name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('TRUCK', 'MACHINE')),
  rental_type TEXT DEFAULT 'DAY' CHECK (rental_type IN ('DAY', 'HOUR')),
  ownership_type TEXT DEFAULT 'OWN' CHECK (ownership_type IN ('OWN', 'EXTERNAL')),
  base_rate NUMERIC DEFAULT 0,
  current_status TEXT DEFAULT 'AVAILABLE' CHECK (current_status IN ('AVAILABLE', 'RENTED_OUT', 'RENTED_IN', 'MAINTENANCE', 'OFFLINE')),
  current_location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rental Contracts
CREATE TABLE IF NOT EXISTS rental_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id),
  rental_direction TEXT NOT NULL CHECK (rental_direction IN ('OUTGOING', 'INCOMING')),
  customer_id UUID REFERENCES customers(id),
  external_owner_id UUID REFERENCES external_asset_owners(id),
  rental_start_datetime TIMESTAMPTZ NOT NULL,
  rental_end_datetime TIMESTAMPTZ NOT NULL,
  rate NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  remaining_amount NUMERIC DEFAULT 0,
  financial_status TEXT DEFAULT 'PENDING' CHECK (financial_status IN ('PENDING', 'PARTIAL', 'FULLY_SETTLED')),
  operational_status TEXT DEFAULT 'ACTIVE' CHECK (operational_status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rental Payments
CREATE TABLE IF NOT EXISTS rental_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  rental_contract_id UUID NOT NULL REFERENCES rental_contracts(id),
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  mode TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_business ON items(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_business ON suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_purchases_business ON purchases(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_business ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_business ON fleet_vehicles(business_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_business ON rental_contracts(business_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_vehicle ON rental_contracts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_hapyjo ON fleet_vehicles(hapyjo_vehicle_id);

-- Grant access
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
