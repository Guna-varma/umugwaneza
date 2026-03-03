-- Soft delete: is_active on suppliers, customers, external_asset_owners.
-- List screens show only active; "delete" sets is_active = false to preserve FK integrity.

ALTER TABLE umugwaneza.suppliers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE umugwaneza.customers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE umugwaneza.external_asset_owners
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Indexes for active-only list queries
CREATE INDEX IF NOT EXISTS idx_umugwaneza_suppliers_business_active
  ON umugwaneza.suppliers(business_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_umugwaneza_customers_business_active
  ON umugwaneza.customers(business_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_umugwaneza_external_asset_owners_business_active
  ON umugwaneza.external_asset_owners(business_id) WHERE is_active = TRUE;
