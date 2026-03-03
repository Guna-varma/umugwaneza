-- Fix rental dashboard: income = payments from OUTGOING (giving rents), expense = payments from INCOMING (taking rents), profit = income - expense.
-- Exclude CANCELLED contracts. Use rental_payments for actual collected/paid amounts.

CREATE OR REPLACE FUNCTION umugwaneza.dashboard_rental()
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  month_start DATE := date_trunc('month', CURRENT_DATE)::DATE;
  month_end DATE := month_start + INTERVAL '1 month' - INTERVAL '1 day';
  total_v INT; available_v INT; rented_out INT; rented_in INT; maintenance_v INT;
  today_income NUMERIC := 0;
  today_expense NUMERIC := 0;
  month_income NUMERIC := 0;
  month_expense NUMERIC := 0;
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

  -- Today: sum of payments by direction (exclude cancelled contracts)
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

  -- Current month: income (outgoing payments) and expense (incoming payments)
  SELECT COALESCE(SUM(rp.amount), 0) INTO month_income
  FROM umugwaneza.rental_payments rp
  JOIN umugwaneza.rental_contracts rc ON rc.id = rp.rental_contract_id AND rc.business_id = rp.business_id
  WHERE rp.business_id = bid AND rp.payment_date >= month_start AND rp.payment_date <= month_end
    AND rc.rental_direction = 'OUTGOING' AND rc.operational_status != 'CANCELLED';

  SELECT COALESCE(SUM(rp.amount), 0) INTO month_expense
  FROM umugwaneza.rental_payments rp
  JOIN umugwaneza.rental_contracts rc ON rc.id = rp.rental_contract_id AND rc.business_id = rp.business_id
  WHERE rp.business_id = bid AND rp.payment_date >= month_start AND rp.payment_date <= month_end
    AND rc.rental_direction = 'INCOMING' AND rc.operational_status != 'CANCELLED';

  RETURN jsonb_build_object(
    'total', total_v,
    'available', available_v,
    'rentedOut', rented_out,
    'rentedIn', rented_in,
    'maintenance', maintenance_v,
    'todayRevenue', today_income,
    'todayExpense', today_expense,
    'monthRevenue', month_income,
    'monthExpense', month_expense,
    'monthProfit', COALESCE(month_income, 0) - COALESCE(month_expense, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Monthly breakdown for charts: { month, totalIncome, totalExpense, profit }[]
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
    income_expense AS (
      SELECT
        date_trunc('month', rp.payment_date)::DATE AS month_start,
        SUM(CASE WHEN rc.rental_direction = 'OUTGOING' AND rc.operational_status != 'CANCELLED' THEN rp.amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN rc.rental_direction = 'INCOMING' AND rc.operational_status != 'CANCELLED' THEN rp.amount ELSE 0 END) AS total_expense
      FROM umugwaneza.rental_payments rp
      JOIN umugwaneza.rental_contracts rc ON rc.id = rp.rental_contract_id AND rc.business_id = rp.business_id
      WHERE rp.business_id = bid
        AND rp.payment_date >= start_month
        AND rp.payment_date < (date_trunc('month', CURRENT_DATE)::DATE + INTERVAL '1 month')::DATE
      GROUP BY date_trunc('month', rp.payment_date)
    )
    SELECT
      m.month_start AS month,
      COALESCE(ie.total_income, 0)::NUMERIC AS total_income,
      COALESCE(ie.total_expense, 0)::NUMERIC AS total_expense,
      (COALESCE(ie.total_income, 0) - COALESCE(ie.total_expense, 0))::NUMERIC AS profit
    FROM month_series m
    LEFT JOIN income_expense ie ON ie.month_start = m.month_start
    ORDER BY m.month_start
  LOOP
    rows_out := rows_out || jsonb_build_object(
      'month', to_char(r.month, 'YYYY-MM'),
      'totalIncome', r.total_income,
      'totalExpense', r.total_expense,
      'profit', r.profit
    );
  END LOOP;

  RETURN jsonb_build_object('rows', rows_out);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION umugwaneza.dashboard_rental_monthly(INT) TO authenticated;
