-- UMUGWANEZA: App tables in schema umugwaneza (web app uses supabase.schema('umugwaneza'))
-- Run after 20250225000001_notifications_table.sql (creates schema umugwaneza).
-- Table "vehicles" (not fleet_vehicles) for sync from public.vehicles (Hapyjo).

CREATE TABLE IF NOT EXISTS umugwaneza.businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'RWF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS umugwaneza.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES umugwaneza.businesses(id),
  item_name TEXT NOT NULL,
  measurement_type TEXT NOT NULL CHECK (measurement_type IN ('WEIGHT', 'VOLUME')),
  base_unit TEXT NOT NULL CHECK (base_unit IN ('KG', 'LITRE')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS umugwaneza.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES umugwaneza.businesses(id),
  supplier_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS umugwaneza.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES umugwaneza.businesses(id),
  customer_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS umugwaneza.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES umugwaneza.businesses(id),
  supplier_id UUID NOT NULL REFERENCES umugwaneza.suppliers(id),
  reference_no TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  item_id UUID NOT NULL REFERENCES umugwaneza.items(id),
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

CREATE TABLE IF NOT EXISTS umugwaneza.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES umugwaneza.businesses(id),
  customer_id UUID NOT NULL REFERENCES umugwaneza.customers(id),
  reference_no TEXT NOT NULL,
  sale_date DATE NOT NULL,
  item_id UUID NOT NULL REFERENCES umugwaneza.items(id),
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

CREATE TABLE IF NOT EXISTS umugwaneza.grocery_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES umugwaneza.businesses(id),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('PURCHASE', 'SALE')),
  reference_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  mode TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS umugwaneza.external_asset_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES umugwaneza.businesses(id),
  owner_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS umugwaneza.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES umugwaneza.businesses(id),
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

CREATE TABLE IF NOT EXISTS umugwaneza.rental_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES umugwaneza.businesses(id),
  vehicle_id UUID NOT NULL REFERENCES umugwaneza.vehicles(id),
  rental_direction TEXT NOT NULL CHECK (rental_direction IN ('OUTGOING', 'INCOMING')),
  customer_id UUID REFERENCES umugwaneza.customers(id),
  external_owner_id UUID REFERENCES umugwaneza.external_asset_owners(id),
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

CREATE TABLE IF NOT EXISTS umugwaneza.rental_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES umugwaneza.businesses(id),
  rental_contract_id UUID NOT NULL REFERENCES umugwaneza.rental_contracts(id),
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  mode TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_umugwaneza_items_business ON umugwaneza.items(business_id);
CREATE INDEX IF NOT EXISTS idx_umugwaneza_suppliers_business ON umugwaneza.suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_umugwaneza_customers_business ON umugwaneza.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_umugwaneza_purchases_business_date ON umugwaneza.purchases(business_id, purchase_date);
CREATE INDEX IF NOT EXISTS idx_umugwaneza_sales_business_date ON umugwaneza.sales(business_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_umugwaneza_vehicles_business ON umugwaneza.vehicles(business_id);
CREATE INDEX IF NOT EXISTS idx_umugwaneza_vehicles_hapyjo ON umugwaneza.vehicles(hapyjo_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_umugwaneza_rental_contracts_business ON umugwaneza.rental_contracts(business_id);
CREATE INDEX IF NOT EXISTS idx_umugwaneza_rental_contracts_vehicle ON umugwaneza.rental_contracts(vehicle_id);
