-- =============================================================================
-- UMUGWANEZA — Wipe "Rental Vehicles and Machinery" data for ONE business
-- =============================================================================
-- Matches sidebar: Vehicles, Vehicle Maintenance, Fleet Customers (safe subset),
-- External Owners, Giving Rental / Taking Rent, Working days & hours.
--
-- DOES NOT DELETE: grocery items, suppliers, GROCERY customers, purchases, sales,
-- grocery_payments, businesses, auth users.
--
-- SET p_business_id below, then run the whole script in Supabase SQL Editor (or psql).
--
-- TABLES EMPTIED (for that business_id), in dependency order:
--   rental_usage, rental_payments, rental_contracts, maintenance_records,
--   vehicles, external_asset_owners
-- PLUS customers that were ONLY linked via outgoing rentals (no sales rows).
-- PLUS notifications for rental_contract / rental_payment.
--
-- Requires migration 20250630000007 (rental_usage). If that table is missing,
-- comment out the rental_usage DELETE inside the block below.
-- =============================================================================

DO $$
DECLARE
  p_business_id TEXT := 'biz_001'; -- <<< CHANGE to your umugwaneza.businesses.id
BEGIN
  IF p_business_id IS NULL OR length(trim(p_business_id)) = 0 THEN
    RAISE EXCEPTION 'Set p_business_id to your business id';
  END IF;

  CREATE TEMP TABLE _rental_cleanup_customer_ids (id UUID PRIMARY KEY) ON COMMIT DROP;

  INSERT INTO _rental_cleanup_customer_ids (id)
  SELECT DISTINCT rc.customer_id
  FROM umugwaneza.rental_contracts rc
  WHERE rc.business_id = p_business_id
    AND rc.customer_id IS NOT NULL;

  BEGIN
    DELETE FROM umugwaneza.rental_usage ru
    WHERE ru.business_id = p_business_id;
  EXCEPTION
    WHEN SQLSTATE '42P01' THEN
      RAISE NOTICE 'Skipped rental_usage (table missing — apply migration 20250630000007 first)';
  END;

  DELETE FROM umugwaneza.rental_payments rp
  WHERE rp.business_id = p_business_id;

  DELETE FROM umugwaneza.rental_contracts rc
  WHERE rc.business_id = p_business_id;

  DELETE FROM umugwaneza.maintenance_records mr
  WHERE mr.business_id = p_business_id;

  DELETE FROM umugwaneza.vehicles v
  WHERE v.business_id = p_business_id;

  DELETE FROM umugwaneza.external_asset_owners eao
  WHERE eao.business_id = p_business_id;

  DELETE FROM umugwaneza.customers c
  USING _rental_cleanup_customer_ids t
  WHERE c.id = t.id
    AND c.business_id = p_business_id
    AND NOT EXISTS (
      SELECT 1 FROM umugwaneza.sales s WHERE s.customer_id = c.id
    );

  DELETE FROM umugwaneza.notifications n
  WHERE n.business_id = p_business_id
    AND (
      n.entity_type IN ('rental_contract', 'rental_payment')
      OR n.type IN ('rental', 'rental_payment')
    );

  RAISE NOTICE 'Fleet / rental data cleared for business_id=%', p_business_id;
END $$;

-- =============================================================================
-- Optional: wrap in a transaction while testing
-- =============================================================================
-- BEGIN;
--   -- paste the DO $$ ... $$ block above here
-- ROLLBACK;
-- -- or COMMIT;

-- =============================================================================
-- ALL businesses — NOT PROVIDED (too easy to mis-run). Clone the DO block per id.
-- =============================================================================
