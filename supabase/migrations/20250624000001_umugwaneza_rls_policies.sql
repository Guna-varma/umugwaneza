-- UMUGWANEZA: RLS on all app tables in schema umugwaneza
-- Policy: user sees only rows where business_id = current_user_business_id(), or is SYSTEM_ADMIN where allowed.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'items', 'suppliers', 'customers', 'purchases', 'sales', 'grocery_payments',
    'external_asset_owners', 'vehicles', 'rental_contracts', 'rental_payments'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE umugwaneza.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "umugwaneza_select_%s" ON umugwaneza.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "umugwaneza_select_%s" ON umugwaneza.%I FOR SELECT TO authenticated USING (
        umugwaneza.current_user_role() = ''SYSTEM_ADMIN'' OR umugwaneza.current_user_business_id() = business_id
      )', t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS "umugwaneza_insert_%s" ON umugwaneza.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "umugwaneza_insert_%s" ON umugwaneza.%I FOR INSERT TO authenticated WITH CHECK (
        umugwaneza.current_user_role() = ''SYSTEM_ADMIN'' OR umugwaneza.current_user_business_id() = business_id
      )', t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS "umugwaneza_update_%s" ON umugwaneza.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "umugwaneza_update_%s" ON umugwaneza.%I FOR UPDATE TO authenticated USING (
        umugwaneza.current_user_role() = ''SYSTEM_ADMIN'' OR umugwaneza.current_user_business_id() = business_id
      ) WITH CHECK (
        umugwaneza.current_user_role() = ''SYSTEM_ADMIN'' OR umugwaneza.current_user_business_id() = business_id
      )', t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS "umugwaneza_delete_%s" ON umugwaneza.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "umugwaneza_delete_%s" ON umugwaneza.%I FOR DELETE TO authenticated USING (
        umugwaneza.current_user_role() = ''SYSTEM_ADMIN'' OR umugwaneza.current_user_business_id() = business_id
      )', t, t
    );
  END LOOP;
END $$;

-- businesses: no business_id column; SYSTEM_ADMIN full, OWNER can read/update own
ALTER TABLE umugwaneza.businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "umugwaneza_select_businesses" ON umugwaneza.businesses;
DROP POLICY IF EXISTS "umugwaneza_insert_businesses" ON umugwaneza.businesses;
DROP POLICY IF EXISTS "umugwaneza_update_businesses" ON umugwaneza.businesses;
DROP POLICY IF EXISTS "umugwaneza_delete_businesses" ON umugwaneza.businesses;

CREATE POLICY "umugwaneza_select_businesses" ON umugwaneza.businesses FOR SELECT TO authenticated
  USING (umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR (umugwaneza.current_user_role() = 'OWNER' AND id = umugwaneza.current_user_business_id()));

CREATE POLICY "umugwaneza_insert_businesses" ON umugwaneza.businesses FOR INSERT TO authenticated
  WITH CHECK (umugwaneza.current_user_role() = 'SYSTEM_ADMIN');

CREATE POLICY "umugwaneza_update_businesses" ON umugwaneza.businesses FOR UPDATE TO authenticated
  USING (umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR (umugwaneza.current_user_role() = 'OWNER' AND id = umugwaneza.current_user_business_id()))
  WITH CHECK (true);

CREATE POLICY "umugwaneza_delete_businesses" ON umugwaneza.businesses FOR DELETE TO authenticated
  USING (umugwaneza.current_user_role() = 'SYSTEM_ADMIN');

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA umugwaneza TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA umugwaneza TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA umugwaneza TO authenticated, service_role;
