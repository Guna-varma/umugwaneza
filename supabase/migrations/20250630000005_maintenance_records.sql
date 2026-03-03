-- Vehicle maintenance tracking: records and history.
-- Vehicles already have current_status IN ('AVAILABLE', 'RENTED_OUT', 'RENTED_IN', 'MAINTENANCE', 'OFFLINE').

CREATE TABLE IF NOT EXISTS umugwaneza.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES umugwaneza.businesses(id),
  vehicle_id UUID NOT NULL REFERENCES umugwaneza.vehicles(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  description TEXT,
  cost NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
  next_service_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_umugwaneza_maintenance_records_vehicle ON umugwaneza.maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_umugwaneza_maintenance_records_business ON umugwaneza.maintenance_records(business_id);

COMMENT ON TABLE umugwaneza.maintenance_records IS 'Vehicle maintenance history; vehicle.current_status = MAINTENANCE when under maintenance.';

ALTER TABLE umugwaneza.maintenance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "umugwaneza_select_maintenance_records" ON umugwaneza.maintenance_records FOR SELECT TO authenticated
  USING (umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR umugwaneza.current_user_business_id() = business_id);
CREATE POLICY "umugwaneza_insert_maintenance_records" ON umugwaneza.maintenance_records FOR INSERT TO authenticated
  WITH CHECK (umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR umugwaneza.current_user_business_id() = business_id);
CREATE POLICY "umugwaneza_update_maintenance_records" ON umugwaneza.maintenance_records FOR UPDATE TO authenticated
  USING (umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR umugwaneza.current_user_business_id() = business_id)
  WITH CHECK (umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR umugwaneza.current_user_business_id() = business_id);
CREATE POLICY "umugwaneza_delete_maintenance_records" ON umugwaneza.maintenance_records FOR DELETE TO authenticated
  USING (umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR umugwaneza.current_user_business_id() = business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON umugwaneza.maintenance_records TO authenticated;
