-- Per-day rental usage (trucks: full/half/off days; machines: hours + optional day fraction for reporting).
-- Billable totals: when at least one usage row exists for a contract, total_amount = sum(line charges); otherwise calendar estimate.

CREATE TABLE IF NOT EXISTS umugwaneza.rental_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES umugwaneza.businesses(id),
  rental_contract_id UUID NOT NULL REFERENCES umugwaneza.rental_contracts(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  day_fraction NUMERIC NOT NULL DEFAULT 0 CHECK (day_fraction >= 0 AND day_fraction <= 1),
  machine_hours NUMERIC CHECK (machine_hours IS NULL OR machine_hours >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (rental_contract_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_umugwaneza_rental_usage_business_date
  ON umugwaneza.rental_usage(business_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_umugwaneza_rental_usage_contract
  ON umugwaneza.rental_usage(rental_contract_id);

-- Calendar estimate matching app logic (ceil days/hours/months)
CREATE OR REPLACE FUNCTION umugwaneza.rental_contract_calendar_total(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_rate NUMERIC,
  p_rental_type TEXT
) RETURNS NUMERIC AS $$
DECLARE
  diff_sec NUMERIC;
  days NUMERIC;
  hours NUMERIC;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_rate IS NULL OR p_rate <= 0 THEN
    RETURN 0;
  END IF;
  diff_sec := EXTRACT(EPOCH FROM (p_end - p_start));
  IF diff_sec <= 0 THEN
    RETURN 0;
  END IF;
  IF p_rental_type = 'HOUR' THEN
    hours := diff_sec / 3600.0;
    RETURN CEIL(hours) * p_rate;
  ELSIF p_rental_type = 'MONTH' THEN
    days := diff_sec / 86400.0;
    RETURN CEIL(days / 30.0) * p_rate;
  ELSE
    days := diff_sec / 86400.0;
    RETURN CEIL(days) * p_rate;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION umugwaneza.rental_usage_line_charge(
  p_rental_type TEXT,
  p_rate NUMERIC,
  p_day_fraction NUMERIC,
  p_machine_hours NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  r NUMERIC := COALESCE(p_rate, 0);
  df NUMERIC := COALESCE(p_day_fraction, 0);
  mh NUMERIC := COALESCE(p_machine_hours, 0);
BEGIN
  IF r <= 0 THEN
    RETURN 0;
  END IF;
  IF p_rental_type = 'HOUR' THEN
    RETURN r * mh;
  ELSIF p_rental_type = 'MONTH' THEN
    RETURN r * (df / 30.0);
  ELSE
    RETURN r * df;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION umugwaneza.recalc_rental_contract_total(p_contract_id UUID)
RETURNS VOID AS $$
DECLARE
  rc RECORD;
  usage_count INT;
  new_total NUMERIC;
  new_paid NUMERIC;
  new_rem NUMERIC;
  new_status TEXT;
BEGIN
  SELECT * INTO rc FROM umugwaneza.rental_contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::INT INTO usage_count FROM umugwaneza.rental_usage WHERE rental_contract_id = p_contract_id;

  IF usage_count = 0 THEN
    new_total := umugwaneza.rental_contract_calendar_total(
      rc.rental_start_datetime,
      rc.rental_end_datetime,
      rc.rate,
      COALESCE(rc.rental_type, 'DAY')
    );
  ELSE
    SELECT COALESCE(SUM(
      umugwaneza.rental_usage_line_charge(
        COALESCE(rc.rental_type, 'DAY'),
        rc.rate,
        ru.day_fraction,
        ru.machine_hours
      )
    ), 0) INTO new_total
    FROM umugwaneza.rental_usage ru
    WHERE ru.rental_contract_id = p_contract_id;
  END IF;

  new_paid := COALESCE(rc.amount_paid, 0);
  new_rem := GREATEST(0, new_total - new_paid);
  IF new_paid <= 0 THEN
    new_status := 'PENDING';
  ELSIF new_paid >= new_total THEN
    new_status := 'FULLY_SETTLED';
  ELSE
    new_status := 'PARTIAL';
  END IF;

  UPDATE umugwaneza.rental_contracts
  SET
    total_amount = new_total,
    remaining_amount = new_rem,
    financial_status = new_status,
    updated_at = NOW()
  WHERE id = p_contract_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION umugwaneza.trg_rental_usage_recalc()
RETURNS TRIGGER AS $$
DECLARE
  cid UUID;
  rc RECORD;
BEGIN
  cid := COALESCE(NEW.rental_contract_id, OLD.rental_contract_id);
  SELECT * INTO rc FROM umugwaneza.rental_contracts WHERE id = cid;
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.usage_date < (rc.rental_start_datetime::DATE) OR NEW.usage_date > (rc.rental_end_datetime::DATE) THEN
      RAISE EXCEPTION 'usage_date outside contract period';
    END IF;
  END IF;
  PERFORM umugwaneza.recalc_rental_contract_total(cid);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_rental_usage_recalc ON umugwaneza.rental_usage;
CREATE TRIGGER trg_rental_usage_recalc
  AFTER INSERT OR UPDATE OR DELETE ON umugwaneza.rental_usage
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.trg_rental_usage_recalc();

GRANT EXECUTE ON FUNCTION umugwaneza.recalc_rental_contract_total(UUID) TO authenticated;

-- RLS for rental_usage
ALTER TABLE umugwaneza.rental_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "umugwaneza_select_rental_usage" ON umugwaneza.rental_usage;
DROP POLICY IF EXISTS "umugwaneza_insert_rental_usage" ON umugwaneza.rental_usage;
DROP POLICY IF EXISTS "umugwaneza_update_rental_usage" ON umugwaneza.rental_usage;
DROP POLICY IF EXISTS "umugwaneza_delete_rental_usage" ON umugwaneza.rental_usage;

CREATE POLICY "umugwaneza_select_rental_usage" ON umugwaneza.rental_usage FOR SELECT TO authenticated USING (
  umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR umugwaneza.current_user_business_id() = business_id
);
CREATE POLICY "umugwaneza_insert_rental_usage" ON umugwaneza.rental_usage FOR INSERT TO authenticated WITH CHECK (
  umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR umugwaneza.current_user_business_id() = business_id
);
CREATE POLICY "umugwaneza_update_rental_usage" ON umugwaneza.rental_usage FOR UPDATE TO authenticated USING (
  umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR umugwaneza.current_user_business_id() = business_id
) WITH CHECK (
  umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR umugwaneza.current_user_business_id() = business_id
);
CREATE POLICY "umugwaneza_delete_rental_usage" ON umugwaneza.rental_usage FOR DELETE TO authenticated USING (
  umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR umugwaneza.current_user_business_id() = business_id
);

GRANT SELECT, INSERT, UPDATE, DELETE ON umugwaneza.rental_usage TO authenticated;

-- Dashboard: add usage-based billable amounts (outgoing)
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
  today_earned NUMERIC := 0;
  month_earned NUMERIC := 0;
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

  SELECT COALESCE(SUM(
    umugwaneza.rental_usage_line_charge(
      COALESCE(rc.rental_type, 'DAY'),
      rc.rate,
      ru.day_fraction,
      ru.machine_hours
    )
  ), 0) INTO today_earned
  FROM umugwaneza.rental_usage ru
  JOIN umugwaneza.rental_contracts rc ON rc.id = ru.rental_contract_id AND rc.business_id = ru.business_id
  WHERE ru.business_id = bid AND ru.usage_date = CURRENT_DATE
    AND rc.rental_direction = 'OUTGOING' AND rc.operational_status != 'CANCELLED';

  SELECT COALESCE(SUM(
    umugwaneza.rental_usage_line_charge(
      COALESCE(rc.rental_type, 'DAY'),
      rc.rate,
      ru.day_fraction,
      ru.machine_hours
    )
  ), 0) INTO month_earned
  FROM umugwaneza.rental_usage ru
  JOIN umugwaneza.rental_contracts rc ON rc.id = ru.rental_contract_id AND rc.business_id = ru.business_id
  WHERE ru.business_id = bid AND ru.usage_date >= month_start AND ru.usage_date <= month_end
    AND rc.rental_direction = 'OUTGOING' AND rc.operational_status != 'CANCELLED';

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
    'maintenanceRecordCountMonth', maintenance_record_count,
    'todayEarnedOutgoing', today_earned,
    'monthEarnedOutgoing', month_earned
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trends: rental daily = billable from usage rows (outgoing)
CREATE OR REPLACE FUNCTION umugwaneza.dashboard_trends()
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  start_d DATE := CURRENT_DATE - INTERVAL '60 days';
  grocery_daily JSONB := '[]'::JSONB;
  rental_daily JSONB := '[]'::JSONB;
  top_vehicles JSONB := '[]'::JSONB;
  d DATE;
  day_sales NUMERIC; day_purchases NUMERIC; day_rent NUMERIC;
BEGIN
  IF bid IS NULL THEN
    RETURN jsonb_build_object('error', 'No business context', 'groceryDaily', '[]'::JSONB, 'rentalDaily', '[]'::JSONB, 'topVehicles', '[]'::JSONB);
  END IF;

  FOR d IN SELECT generate_series(start_d, CURRENT_DATE, '1 day'::interval)::DATE
  LOOP
    SELECT COALESCE(SUM(total_sale_amount), 0) INTO day_sales FROM umugwaneza.sales WHERE business_id = bid AND sale_date = d;
    SELECT COALESCE(SUM(total_purchase_cost), 0) INTO day_purchases FROM umugwaneza.purchases WHERE business_id = bid AND purchase_date = d;
    SELECT COALESCE(SUM(
      umugwaneza.rental_usage_line_charge(
        COALESCE(rc.rental_type, 'DAY'),
        rc.rate,
        ru.day_fraction,
        ru.machine_hours
      )
    ), 0) INTO day_rent
    FROM umugwaneza.rental_usage ru
    JOIN umugwaneza.rental_contracts rc ON rc.id = ru.rental_contract_id AND rc.business_id = ru.business_id
    WHERE ru.business_id = bid AND ru.usage_date = d
      AND rc.rental_direction = 'OUTGOING' AND rc.operational_status != 'CANCELLED';

    grocery_daily := grocery_daily || jsonb_build_object(
      'date', d::TEXT,
      'sales', day_sales,
      'purchases', day_purchases,
      'profit', day_sales - day_purchases
    );
    rental_daily := rental_daily || jsonb_build_object('date', d::TEXT, 'revenue', day_rent);
  END LOOP;

  SELECT jsonb_agg(row)
  INTO top_vehicles
  FROM (
    SELECT jsonb_build_object(
      'vehicleId', v.id,
      'vehicleName', v.vehicle_name,
      'revenue', COALESCE(SUM(
        umugwaneza.rental_usage_line_charge(
          COALESCE(rc.rental_type, 'DAY'),
          rc.rate,
          ru.day_fraction,
          ru.machine_hours
        )
      ), 0),
      'contractCount', COUNT(DISTINCT rc.id)::INT
    ) AS row
    FROM umugwaneza.rental_usage ru
    JOIN umugwaneza.rental_contracts rc ON rc.id = ru.rental_contract_id AND rc.business_id = ru.business_id
    JOIN umugwaneza.vehicles v ON v.id = rc.vehicle_id AND v.business_id = rc.business_id
    WHERE rc.business_id = bid AND rc.rental_direction = 'OUTGOING'
      AND ru.usage_date >= start_d
    GROUP BY v.id, v.vehicle_name
    ORDER BY SUM(
      umugwaneza.rental_usage_line_charge(
        COALESCE(rc.rental_type, 'DAY'),
        rc.rate,
        ru.day_fraction,
        ru.machine_hours
      )
    ) DESC NULLS LAST
    LIMIT 10
  ) sub;

  RETURN jsonb_build_object(
    'groceryDaily', grocery_daily,
    'rentalDaily', rental_daily,
    'topVehicles', COALESCE(top_vehicles, '[]'::JSONB)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
