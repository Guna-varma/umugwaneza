-- UMUGWANEZA: Dashboard and unified report RPCs (daily, monthly, custom)

CREATE OR REPLACE FUNCTION umugwaneza.dashboard_grocery()
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  today DATE := CURRENT_DATE;
  month_start DATE := date_trunc('month', today)::DATE;
  total_stock INT;
  today_sales NUMERIC;
  monthly_sales NUMERIC;
  monthly_purchases NUMERIC;
  payables NUMERIC;
  receivables NUMERIC;
BEGIN
  IF bid IS NULL THEN
    RETURN jsonb_build_object('error', 'No business context');
  END IF;
  SELECT COUNT(*)::INT INTO total_stock FROM umugwaneza.items WHERE business_id = bid AND is_active;
  SELECT COALESCE(SUM(total_sale_amount), 0) INTO today_sales FROM umugwaneza.sales WHERE business_id = bid AND sale_date = today;
  SELECT COALESCE(SUM(total_sale_amount), 0) INTO monthly_sales FROM umugwaneza.sales WHERE business_id = bid AND sale_date >= month_start;
  SELECT COALESCE(SUM(total_purchase_cost), 0) INTO monthly_purchases FROM umugwaneza.purchases WHERE business_id = bid AND purchase_date >= month_start;
  SELECT COALESCE(SUM(remaining_amount), 0) INTO payables FROM umugwaneza.purchases WHERE business_id = bid AND remaining_amount > 0;
  SELECT COALESCE(SUM(remaining_amount), 0) INTO receivables FROM umugwaneza.sales WHERE business_id = bid AND remaining_amount > 0;
  RETURN jsonb_build_object(
    'totalStock', total_stock,
    'todaySales', today_sales,
    'monthlySales', monthly_sales,
    'monthlyProfit', monthly_sales - monthly_purchases,
    'payables', payables,
    'receivables', receivables
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION umugwaneza.dashboard_rental()
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  month_start TIMESTAMPTZ := date_trunc('month', CURRENT_DATE)::TIMESTAMPTZ;
  total_v INT; available_v INT; rented_out INT; rented_in INT; maintenance_v INT;
  month_revenue NUMERIC;
BEGIN
  IF bid IS NULL THEN
    RETURN jsonb_build_object('error', 'No business context');
  END IF;
  SELECT COUNT(*)::INT INTO total_v FROM umugwaneza.vehicles WHERE business_id = bid;
  SELECT COUNT(*)::INT INTO available_v FROM umugwaneza.vehicles WHERE business_id = bid AND current_status = 'AVAILABLE';
  SELECT COUNT(*)::INT INTO rented_out FROM umugwaneza.vehicles WHERE business_id = bid AND current_status = 'RENTED_OUT';
  SELECT COUNT(*)::INT INTO rented_in FROM umugwaneza.vehicles WHERE business_id = bid AND current_status = 'RENTED_IN';
  SELECT COUNT(*)::INT INTO maintenance_v FROM umugwaneza.vehicles WHERE business_id = bid AND current_status = 'MAINTENANCE';
  SELECT COALESCE(SUM(total_amount), 0) INTO month_revenue FROM umugwaneza.rental_contracts WHERE business_id = bid AND rental_direction = 'OUTGOING' AND rental_start_datetime >= month_start;
  RETURN jsonb_build_object(
    'total', total_v, 'available', available_v, 'rentedOut', rented_out, 'rentedIn', rented_in, 'maintenance', maintenance_v,
    'todayRevenue', 0, 'monthRevenue', month_revenue
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Unified daily report: one table for a date
CREATE OR REPLACE FUNCTION umugwaneza.report_daily(p_date DATE)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  j JSONB;
  rows_out JSONB := '[]'::JSONB;
  total_purchase NUMERIC := 0; total_sales NUMERIC := 0; total_rent_out NUMERIC := 0; total_rent_in NUMERIC := 0;
  dt TEXT := p_date::TEXT;
  r RECORD;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  FOR r IN
    SELECT p.reference_no AS ref, p.purchase_date AS d, 'Purchase' AS typ, s.supplier_name AS party, i.item_name AS item_vehicle, p.total_quantity::TEXT || ' ' || p.unit AS qty, p.unit_price, p.total_purchase_cost AS total, p.amount_paid AS paid, p.remaining_amount AS remaining, p.financial_status AS status
    FROM umugwaneza.purchases p JOIN umugwaneza.suppliers s ON p.supplier_id = s.id JOIN umugwaneza.items i ON p.item_id = i.id
    WHERE p.business_id = bid AND p.purchase_date = p_date
    UNION ALL
    SELECT sal.reference_no, sal.sale_date, 'Sale', c.customer_name, i.item_name, sal.total_quantity::TEXT || ' ' || sal.unit, sal.unit_price, sal.total_sale_amount, sal.amount_received, sal.remaining_amount, sal.financial_status
    FROM umugwaneza.sales sal JOIN umugwaneza.customers c ON sal.customer_id = c.id JOIN umugwaneza.items i ON sal.item_id = i.id
    WHERE sal.business_id = bid AND sal.sale_date = p_date
    UNION ALL
    SELECT 'RNT-' || LEFT(rc.id::TEXT, 8), (rc.rental_start_datetime::DATE)::TEXT, 'Rental Out', c.customer_name, v.vehicle_name, '—', rc.rate, rc.total_amount, rc.amount_paid, rc.remaining_amount, rc.financial_status
    FROM umugwaneza.rental_contracts rc JOIN umugwaneza.vehicles v ON rc.vehicle_id = v.id LEFT JOIN umugwaneza.customers c ON rc.customer_id = c.id
    WHERE rc.business_id = bid AND rc.rental_direction = 'OUTGOING' AND rc.rental_start_datetime::DATE = p_date
    UNION ALL
    SELECT 'RNT-' || LEFT(rc.id::TEXT, 8), (rc.rental_start_datetime::DATE)::TEXT, 'Rental In', e.owner_name, v.vehicle_name, '—', rc.rate, rc.total_amount, rc.amount_paid, rc.remaining_amount, rc.financial_status
    FROM umugwaneza.rental_contracts rc JOIN umugwaneza.vehicles v ON rc.vehicle_id = v.id LEFT JOIN umugwaneza.external_asset_owners e ON rc.external_owner_id = e.id
    WHERE rc.business_id = bid AND rc.rental_direction = 'INCOMING' AND rc.rental_start_datetime::DATE = p_date
  LOOP
    rows_out := rows_out || jsonb_build_object('date', r.d, 'type', r.typ, 'reference', r.ref, 'party', r.party, 'item_vehicle', r.item_vehicle, 'quantity', r.qty, 'unit_price', r.unit_price, 'total', r.total, 'paid', r.paid, 'remaining', r.remaining, 'status', r.status);
    IF r.typ = 'Purchase' THEN total_purchase := total_purchase + COALESCE(r.total, 0);
    ELSIF r.typ = 'Sale' THEN total_sales := total_sales + COALESCE(r.total, 0);
    ELSIF r.typ = 'Rental Out' THEN total_rent_out := total_rent_out + COALESCE(r.total, 0);
    ELSE total_rent_in := total_rent_in + COALESCE(r.total, 0);
    END IF;
  END LOOP;
  RETURN jsonb_build_object(
    'rows', rows_out,
    'totalPurchase', total_purchase, 'totalSales', total_sales, 'totalRentalRevenue', total_rent_out, 'totalRentalCost', total_rent_in,
    'netProfit', total_sales - total_purchase + total_rent_out - total_rent_in
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Monthly: same structure, filter by month
CREATE OR REPLACE FUNCTION umugwaneza.report_monthly(p_month INT, p_year INT)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  from_d DATE := make_date(p_year, p_month, 1);
  to_d DATE := (from_d + interval '1 month' - interval '1 day')::DATE;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  RETURN umugwaneza.report_custom(from_d, to_d);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Custom range: unified rows
CREATE OR REPLACE FUNCTION umugwaneza.report_custom(p_from DATE, p_to DATE)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  total_purchase NUMERIC := 0; total_sales NUMERIC := 0; total_rent_out NUMERIC := 0; total_rent_in NUMERIC := 0;
  r RECORD;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  FOR r IN
    SELECT * FROM (
    SELECT p.reference_no AS ref, p.purchase_date::TEXT AS d, 'Purchase' AS typ, s.supplier_name AS party, i.item_name AS item_vehicle, p.total_quantity::TEXT || ' ' || p.unit AS qty, p.unit_price, p.total_purchase_cost AS total, p.amount_paid AS paid, p.remaining_amount AS remaining, p.financial_status AS status
    FROM umugwaneza.purchases p JOIN umugwaneza.suppliers s ON p.supplier_id = s.id JOIN umugwaneza.items i ON p.item_id = i.id
    WHERE p.business_id = bid AND p.purchase_date >= p_from AND p.purchase_date <= p_to
    UNION ALL
    SELECT sal.reference_no, sal.sale_date::TEXT, 'Sale', c.customer_name, i.item_name, sal.total_quantity::TEXT || ' ' || sal.unit, sal.unit_price, sal.total_sale_amount, sal.amount_received, sal.remaining_amount, sal.financial_status
    FROM umugwaneza.sales sal JOIN umugwaneza.customers c ON sal.customer_id = c.id JOIN umugwaneza.items i ON sal.item_id = i.id
    WHERE sal.business_id = bid AND sal.sale_date >= p_from AND sal.sale_date <= p_to
    UNION ALL
    SELECT 'RNT-' || LEFT(rc.id::TEXT, 8), (rc.rental_start_datetime::DATE)::TEXT, 'Rental Out', c.customer_name, v.vehicle_name, '—', rc.rate, rc.total_amount, rc.amount_paid, rc.remaining_amount, rc.financial_status
    FROM umugwaneza.rental_contracts rc JOIN umugwaneza.vehicles v ON rc.vehicle_id = v.id LEFT JOIN umugwaneza.customers c ON rc.customer_id = c.id
    WHERE rc.business_id = bid AND rc.rental_direction = 'OUTGOING' AND rc.rental_start_datetime::DATE >= p_from AND rc.rental_start_datetime::DATE <= p_to
    UNION ALL
    SELECT 'RNT-' || LEFT(rc.id::TEXT, 8), (rc.rental_start_datetime::DATE)::TEXT, 'Rental In', e.owner_name, v.vehicle_name, '—', rc.rate, rc.total_amount, rc.amount_paid, rc.remaining_amount, rc.financial_status
    FROM umugwaneza.rental_contracts rc JOIN umugwaneza.vehicles v ON rc.vehicle_id = v.id LEFT JOIN umugwaneza.external_asset_owners e ON rc.external_owner_id = e.id
    WHERE rc.business_id = bid AND rc.rental_direction = 'INCOMING' AND rc.rental_start_datetime::DATE >= p_from AND rc.rental_start_datetime::DATE <= p_to
    ) sub ORDER BY d
  LOOP
    rows_out := rows_out || jsonb_build_object('date', r.d, 'type', r.typ, 'reference', r.ref, 'party', r.party, 'item_vehicle', r.item_vehicle, 'quantity', r.qty, 'unit_price', r.unit_price, 'total', r.total, 'paid', r.paid, 'remaining', r.remaining, 'status', r.status);
    IF r.typ = 'Purchase' THEN total_purchase := total_purchase + COALESCE(r.total, 0);
    ELSIF r.typ = 'Sale' THEN total_sales := total_sales + COALESCE(r.total, 0);
    ELSIF r.typ = 'Rental Out' THEN total_rent_out := total_rent_out + COALESCE(r.total, 0);
    ELSE total_rent_in := total_rent_in + COALESCE(r.total, 0);
    END IF;
  END LOOP;
  RETURN jsonb_build_object(
    'rows', rows_out,
    'totalPurchase', total_purchase, 'totalSales', total_sales, 'totalRentalRevenue', total_rent_out, 'totalRentalCost', total_rent_in,
    'netProfit', total_sales - total_purchase + total_rent_out - total_rent_in
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION umugwaneza.dashboard_grocery() TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.dashboard_rental() TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.report_daily(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.report_monthly(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.report_custom(DATE, DATE) TO authenticated;
