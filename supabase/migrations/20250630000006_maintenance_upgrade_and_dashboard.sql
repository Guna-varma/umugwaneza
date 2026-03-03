-- PART 2: Enhance maintenance_records; PART 1 & 3 & 6: Dashboard integration and report API.
-- Status: Scheduled | In_Progress | Completed. Keep end_date; add completion_date as copy, downtime_days.

-- Add new columns (nullable for existing rows)
ALTER TABLE umugwaneza.maintenance_records
  ADD COLUMN IF NOT EXISTS maintenance_type TEXT CHECK (maintenance_type IS NULL OR maintenance_type IN ('Preventive', 'Repair', 'Breakdown', 'Service')),
  ADD COLUMN IF NOT EXISTS expected_completion_date DATE,
  ADD COLUMN IF NOT EXISTS completion_date DATE,
  ADD COLUMN IF NOT EXISTS downtime_days INT,
  ADD COLUMN IF NOT EXISTS vendor_name TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Backfill: completion_date from end_date, status map IN_PROGRESS->In_Progress, COMPLETED->Completed
UPDATE umugwaneza.maintenance_records SET completion_date = end_date WHERE end_date IS NOT NULL AND completion_date IS NULL;
UPDATE umugwaneza.maintenance_records SET downtime_days = (completion_date - start_date)::INT WHERE completion_date IS NOT NULL AND start_date IS NOT NULL AND downtime_days IS NULL;

-- Drop old status constraint and add new (Scheduled, In_Progress, Completed)
ALTER TABLE umugwaneza.maintenance_records DROP CONSTRAINT IF EXISTS maintenance_records_status_check;
UPDATE umugwaneza.maintenance_records SET status = 'In_Progress' WHERE status = 'IN_PROGRESS';
UPDATE umugwaneza.maintenance_records SET status = 'Completed' WHERE status = 'COMPLETED';
ALTER TABLE umugwaneza.maintenance_records ADD CONSTRAINT maintenance_records_status_check CHECK (status IN ('Scheduled', 'In_Progress', 'Completed'));

-- Index for reporting
CREATE INDEX IF NOT EXISTS idx_umugwaneza_maintenance_records_start_date ON umugwaneza.maintenance_records(business_id, start_date);

-- Trigger: sync vehicle status with maintenance record status
CREATE OR REPLACE FUNCTION umugwaneza.sync_vehicle_status_on_maintenance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id)) THEN
    IF NEW.status IN ('Scheduled', 'In_Progress') THEN
      UPDATE umugwaneza.vehicles SET current_status = 'MAINTENANCE' WHERE id = NEW.vehicle_id;
    ELSIF NEW.status = 'Completed' THEN
      UPDATE umugwaneza.vehicles SET current_status = 'AVAILABLE' WHERE id = NEW.vehicle_id;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id AND OLD.vehicle_id IS NOT NULL THEN
    UPDATE umugwaneza.vehicles SET current_status = 'AVAILABLE' WHERE id = OLD.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_maintenance_sync_vehicle ON umugwaneza.maintenance_records;
CREATE TRIGGER tr_maintenance_sync_vehicle
  AFTER INSERT OR UPDATE OF status, vehicle_id ON umugwaneza.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.sync_vehicle_status_on_maintenance();

-- Function to set downtime_days and completion_date when status -> Completed
CREATE OR REPLACE FUNCTION umugwaneza.maintenance_set_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Completed' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status != 'Completed') THEN
    NEW.completion_date := COALESCE(NEW.completion_date, CURRENT_DATE);
    NEW.end_date := NEW.completion_date;
    IF NEW.start_date IS NOT NULL AND NEW.completion_date IS NOT NULL THEN
      NEW.downtime_days := (NEW.completion_date - NEW.start_date)::INT;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_maintenance_set_completion ON umugwaneza.maintenance_records;
CREATE TRIGGER tr_maintenance_set_completion
  BEFORE INSERT OR UPDATE OF status ON umugwaneza.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.maintenance_set_completion();

-- PART 1: Dashboard rental includes maintenance expense
CREATE OR REPLACE FUNCTION umugwaneza.dashboard_rental()
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  month_start DATE := date_trunc('month', CURRENT_DATE)::DATE;
  month_end DATE := month_start + INTERVAL '1 month' - INTERVAL '1 day';
  year_start DATE := date_trunc('year', CURRENT_DATE)::DATE;
  total_v INT; available_v INT; rented_out INT; rented_in INT; maintenance_v INT;
  today_income NUMERIC := 0;
  today_expense NUMERIC := 0;
  month_income NUMERIC := 0;
  month_rent_expense NUMERIC := 0;
  month_maintenance_expense NUMERIC := 0;
  month_expense_total NUMERIC := 0;
  maintenance_ytd NUMERIC := 0;
  maintenance_downtime_days INT := 0;
  maintenance_record_count INT := 0;
BEGIN
  IF bid IS NULL THEN
    RETURN jsonb_build_object('error', 'No business context');
  END IF;

  SELECT COUNT(*)::INT INTO total_v FROM umugwaneza.vehicles WHERE business_id = bid;
  SELECT COUNT(DISTINCT vehicle_id)::INT INTO rented_out
  FROM umugwaneza.rental_contracts
  WHERE business_id = bid AND rental_direction = 'OUTGOING' AND operational_status = 'ACTIVE';
  SELECT COUNT(DISTINCT vehicle_id)::INT INTO rented_in
  FROM umugwaneza.rental_contracts
  WHERE business_id = bid AND rental_direction = 'INCOMING' AND operational_status = 'ACTIVE';
  SELECT COUNT(*)::INT INTO maintenance_v FROM umugwaneza.vehicles WHERE business_id = bid AND current_status = 'MAINTENANCE';
  available_v := total_v - rented_out - rented_in - maintenance_v;
  IF available_v < 0 THEN available_v := 0; END IF;

  SELECT COALESCE(SUM(rp.amount), 0) INTO today_income
  FROM umugwaneza.rental_payments rp
  JOIN umugwaneza.rental_contracts rc ON rc.id = rp.rental_contract_id AND rc.business_id = rp.business_id
  WHERE rp.business_id = bid AND rp.payment_date = CURRENT_DATE
    AND rc.rental_direction = 'OUTGOING' AND rc.operational_status != 'CANCELLED';

  SELECT COALESCE(SUM(rp.amount), 0) INTO today_expense
  FROM umugwaneza.rental_payments rp
  JOIN umugwaneza.rental_contracts rc ON rc.id = rp.rental_contract_id AND rc.business_id = rp.business_id
  WHERE rp.business_id = bid AND rp.payment_date = CURRENT_DATE
    AND rc.rental_direction = 'INCOMING' AND rc.operational_status != 'CANCELLED';

  SELECT COALESCE(SUM(rp.amount), 0) INTO month_income
  FROM umugwaneza.rental_payments rp
  JOIN umugwaneza.rental_contracts rc ON rc.id = rp.rental_contract_id AND rc.business_id = rp.business_id
  WHERE rp.business_id = bid AND rp.payment_date >= month_start AND rp.payment_date <= month_end
    AND rc.rental_direction = 'OUTGOING' AND rc.operational_status != 'CANCELLED';

  SELECT COALESCE(SUM(rp.amount), 0) INTO month_rent_expense
  FROM umugwaneza.rental_payments rp
  JOIN umugwaneza.rental_contracts rc ON rc.id = rp.rental_contract_id AND rc.business_id = rp.business_id
  WHERE rp.business_id = bid AND rp.payment_date >= month_start AND rp.payment_date <= month_end
    AND rc.rental_direction = 'INCOMING' AND rc.operational_status != 'CANCELLED';

  SELECT COALESCE(SUM(cost), 0) INTO month_maintenance_expense
  FROM umugwaneza.maintenance_records
  WHERE business_id = bid AND start_date >= month_start AND start_date <= month_end;

  SELECT COALESCE(SUM(cost), 0) INTO maintenance_ytd
  FROM umugwaneza.maintenance_records
  WHERE business_id = bid AND start_date >= year_start;

  SELECT COALESCE(SUM(COALESCE(downtime_days, 0)), 0)::INT, COUNT(*)::INT
  INTO maintenance_downtime_days, maintenance_record_count
  FROM umugwaneza.maintenance_records
  WHERE business_id = bid AND start_date >= month_start AND start_date <= month_end;

  month_expense_total := COALESCE(month_rent_expense, 0) + COALESCE(month_maintenance_expense, 0);

  RETURN jsonb_build_object(
    'total', total_v,
    'available', available_v,
    'rentedOut', rented_out,
    'rentedIn', rented_in,
    'maintenance', maintenance_v,
    'todayRevenue', today_income,
    'todayExpense', today_expense,
    'monthRevenue', month_income,
    'monthExpense', month_expense_total,
    'monthRentExpense', month_rent_expense,
    'monthMaintenanceExpense', month_maintenance_expense,
    'monthProfit', COALESCE(month_income, 0) - month_expense_total,
    'maintenanceExpenseYTD', maintenance_ytd,
    'maintenanceDowntimeDaysMonth', maintenance_downtime_days,
    'maintenanceRecordCountMonth', maintenance_record_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Monthly breakdown: include maintenance in expense and profit
CREATE OR REPLACE FUNCTION umugwaneza.dashboard_rental_monthly(p_months INT DEFAULT 12)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  r RECORD;
  start_month DATE := (date_trunc('month', CURRENT_DATE)::DATE - (p_months - 1) * INTERVAL '1 month')::DATE;
BEGIN
  IF bid IS NULL THEN
    RETURN jsonb_build_object('error', 'No business context', 'rows', '[]'::JSONB);
  END IF;

  FOR r IN
    WITH month_series AS (
      SELECT (date_trunc('month', CURRENT_DATE)::DATE - (n || ' months')::INTERVAL)::DATE AS month_start
      FROM generate_series(0, GREATEST(p_months - 1, 0)) n
    ),
    rent AS (
      SELECT
        date_trunc('month', rp.payment_date)::DATE AS month_start,
        SUM(CASE WHEN rc.rental_direction = 'OUTGOING' AND rc.operational_status != 'CANCELLED' THEN rp.amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN rc.rental_direction = 'INCOMING' AND rc.operational_status != 'CANCELLED' THEN rp.amount ELSE 0 END) AS rent_expense
      FROM umugwaneza.rental_payments rp
      JOIN umugwaneza.rental_contracts rc ON rc.id = rp.rental_contract_id AND rc.business_id = rp.business_id
      WHERE rp.business_id = bid
        AND rp.payment_date >= start_month
        AND rp.payment_date < (date_trunc('month', CURRENT_DATE)::DATE + INTERVAL '1 month')::DATE
      GROUP BY date_trunc('month', rp.payment_date)
    ),
    maint AS (
      SELECT
        date_trunc('month', start_date)::DATE AS month_start,
        SUM(cost) AS maintenance_expense
      FROM umugwaneza.maintenance_records
      WHERE business_id = bid
        AND start_date >= start_month
        AND start_date < (date_trunc('month', CURRENT_DATE)::DATE + INTERVAL '1 month')::DATE
      GROUP BY date_trunc('month', start_date)
    )
    SELECT
      m.month_start AS month,
      COALESCE(rent.total_income, 0)::NUMERIC AS total_income,
      COALESCE(rent.rent_expense, 0)::NUMERIC AS total_rent_expense,
      COALESCE(maint.maintenance_expense, 0)::NUMERIC AS total_maintenance_expense,
      (COALESCE(rent.rent_expense, 0) + COALESCE(maint.maintenance_expense, 0))::NUMERIC AS total_expense,
      (COALESCE(rent.total_income, 0) - COALESCE(rent.rent_expense, 0) - COALESCE(maint.maintenance_expense, 0))::NUMERIC AS profit
    FROM month_series m
    LEFT JOIN rent ON rent.month_start = m.month_start
    LEFT JOIN maint ON maint.month_start = m.month_start
    ORDER BY m.month_start
  LOOP
    rows_out := rows_out || jsonb_build_object(
      'month', to_char(r.month, 'YYYY-MM'),
      'totalIncome', r.total_income,
      'totalRentExpense', r.total_rent_expense,
      'totalMaintenanceExpense', r.total_maintenance_expense,
      'totalExpense', r.total_expense,
      'profit', r.profit
    );
  END LOOP;

  RETURN jsonb_build_object('rows', rows_out);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- PART 6: Monthly maintenance report
CREATE OR REPLACE FUNCTION umugwaneza.report_maintenance_monthly(p_months INT DEFAULT 12)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  r RECORD;
  start_month DATE := (date_trunc('month', CURRENT_DATE)::DATE - (p_months - 1) * INTERVAL '1 month')::DATE;
BEGIN
  IF bid IS NULL THEN
    RETURN jsonb_build_object('error', 'No business context', 'rows', '[]'::JSONB);
  END IF;

  FOR r IN
    WITH month_series AS (
      SELECT (date_trunc('month', CURRENT_DATE)::DATE - (n || ' months')::INTERVAL)::DATE AS month_start
      FROM generate_series(0, GREATEST(p_months - 1, 0)) n
    ),
    agg AS (
      SELECT
        date_trunc('month', start_date)::DATE AS month_start,
        SUM(cost) AS total_maintenance_cost,
        SUM(COALESCE(downtime_days, 0))::INT AS total_downtime_days,
        COUNT(DISTINCT vehicle_id)::INT AS vehicle_count_under_maintenance
      FROM umugwaneza.maintenance_records
      WHERE business_id = bid
        AND start_date >= start_month
        AND start_date < (date_trunc('month', CURRENT_DATE)::DATE + INTERVAL '1 month')::DATE
      GROUP BY date_trunc('month', start_date)
    )
    SELECT
      m.month_start AS month,
      COALESCE(agg.total_maintenance_cost, 0)::NUMERIC AS total_maintenance_cost,
      COALESCE(agg.total_downtime_days, 0)::INT AS total_downtime_days,
      COALESCE(agg.vehicle_count_under_maintenance, 0)::INT AS vehicle_count_under_maintenance
    FROM month_series m
    LEFT JOIN agg ON agg.month_start = m.month_start
    ORDER BY m.month_start
  LOOP
    rows_out := rows_out || jsonb_build_object(
      'month', to_char(r.month, 'YYYY-MM'),
      'totalMaintenanceCost', r.total_maintenance_cost,
      'totalDowntimeDays', r.total_downtime_days,
      'vehicleCountUnderMaintenance', r.vehicle_count_under_maintenance
    );
  END LOOP;

  RETURN jsonb_build_object('rows', rows_out);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION umugwaneza.report_maintenance_monthly(INT) TO authenticated;

-- Top 5 most expensive maintenance records this month (for dashboard)
CREATE OR REPLACE FUNCTION umugwaneza.dashboard_maintenance_top5()
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  month_start DATE := date_trunc('month', CURRENT_DATE)::DATE;
  month_end DATE := month_start + INTERVAL '1 month' - INTERVAL '1 day';
  rows_out JSONB := '[]'::JSONB;
  r RECORD;
BEGIN
  IF bid IS NULL THEN
    RETURN jsonb_build_object('rows', '[]'::JSONB);
  END IF;

  FOR r IN
    SELECT mr.id, mr.vehicle_id, mr.start_date, mr.cost, mr.description, mr.maintenance_type, mr.vendor_name, mr.invoice_number, v.vehicle_name
    FROM umugwaneza.maintenance_records mr
    LEFT JOIN umugwaneza.vehicles v ON v.id = mr.vehicle_id
    WHERE mr.business_id = bid
      AND mr.start_date >= month_start AND mr.start_date <= month_end
    ORDER BY mr.cost DESC NULLS LAST
    LIMIT 5
  LOOP
    rows_out := rows_out || jsonb_build_object(
      'id', r.id,
      'vehicleId', r.vehicle_id,
      'vehicleName', r.vehicle_name,
      'startDate', r.start_date,
      'cost', r.cost,
      'description', r.description,
      'maintenanceType', r.maintenance_type,
      'vendorName', r.vendor_name,
      'invoiceNumber', r.invoice_number
    );
  END LOOP;

  RETURN jsonb_build_object('rows', rows_out);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION umugwaneza.dashboard_maintenance_top5() TO authenticated;

-- PART 5: Optional registration_number to help prevent duplicate vehicles (unique per business when set)
ALTER TABLE umugwaneza.vehicles ADD COLUMN IF NOT EXISTS registration_number TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_umugwaneza_vehicles_business_registration
  ON umugwaneza.vehicles(business_id, registration_number) WHERE registration_number IS NOT NULL AND registration_number != '';
