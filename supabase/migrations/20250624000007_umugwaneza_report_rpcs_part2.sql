-- UMUGWANEZA: Remaining report RPCs (purchases, sales, profit, outstanding, stock, ledgers, rental)

CREATE OR REPLACE FUNCTION umugwaneza.report_purchases(p_from DATE, p_to DATE, p_supplier_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  r RECORD;
  total_purchased NUMERIC := 0; total_paid NUMERIC := 0; total_outstanding NUMERIC := 0;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  FOR r IN
    SELECT p.purchase_date::TEXT AS date, s.supplier_name AS supplier, i.item_name AS item, p.total_quantity AS quantity, p.unit, p.unit_price, p.total_purchase_cost AS total, p.amount_paid AS paid, p.remaining_amount AS remaining, p.financial_status AS status
    FROM umugwaneza.purchases p JOIN umugwaneza.suppliers s ON p.supplier_id = s.id JOIN umugwaneza.items i ON p.item_id = i.id
    WHERE p.business_id = bid AND (p_from IS NULL OR p.purchase_date >= p_from) AND (p_to IS NULL OR p.purchase_date <= p_to) AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
    ORDER BY p.purchase_date
  LOOP
    rows_out := rows_out || to_jsonb(r);
    total_purchased := total_purchased + COALESCE(r.total, 0);
    total_paid := total_paid + COALESCE(r.paid, 0);
    total_outstanding := total_outstanding + COALESCE(r.remaining, 0);
  END LOOP;
  RETURN jsonb_build_object('rows', rows_out, 'totalPurchased', total_purchased, 'totalPaid', total_paid, 'totalOutstanding', total_outstanding);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION umugwaneza.report_sales(p_from DATE, p_to DATE, p_customer_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  r RECORD;
  total_sales NUMERIC := 0; total_received NUMERIC := 0; total_outstanding NUMERIC := 0;
  total_purchases NUMERIC := 0;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  FOR r IN
    SELECT sal.sale_date::TEXT AS date, c.customer_name AS customer, i.item_name AS item, sal.total_quantity AS quantity, sal.unit, sal.unit_price, sal.total_sale_amount AS total, sal.amount_received AS received, sal.remaining_amount AS remaining, sal.financial_status AS status
    FROM umugwaneza.sales sal JOIN umugwaneza.customers c ON sal.customer_id = c.id JOIN umugwaneza.items i ON sal.item_id = i.id
    WHERE sal.business_id = bid AND (p_from IS NULL OR sal.sale_date >= p_from) AND (p_to IS NULL OR sal.sale_date <= p_to) AND (p_customer_id IS NULL OR sal.customer_id = p_customer_id)
    ORDER BY sal.sale_date
  LOOP
    rows_out := rows_out || to_jsonb(r);
    total_sales := total_sales + COALESCE(r.total, 0);
    total_received := total_received + COALESCE(r.received, 0);
    total_outstanding := total_outstanding + COALESCE(r.remaining, 0);
  END LOOP;
  IF p_from IS NOT NULL AND p_to IS NOT NULL THEN
    SELECT COALESCE(SUM(total_purchase_cost), 0) INTO total_purchases FROM umugwaneza.purchases WHERE business_id = bid AND purchase_date >= p_from AND purchase_date <= p_to;
  END IF;
  RETURN jsonb_build_object('rows', rows_out, 'totalSales', total_sales, 'totalReceived', total_received, 'totalOutstanding', total_outstanding, 'netProfit', total_sales - total_purchases);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION umugwaneza.report_profit(p_from DATE, p_to DATE)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  grand_sales NUMERIC := 0; grand_purchases NUMERIC := 0;
  rec RECORD;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  FOR rec IN
    SELECT COALESCE(p.d, s.d)::TEXT AS date,
      COALESCE(SUM(s.total_sale_amount), 0) AS total_sales,
      COALESCE(SUM(p.total_purchase_cost), 0) AS total_purchases
    FROM (SELECT sale_date AS d, total_sale_amount FROM umugwaneza.sales WHERE business_id = bid AND sale_date >= p_from AND sale_date <= p_to) s
    FULL OUTER JOIN (SELECT purchase_date AS d, total_purchase_cost FROM umugwaneza.purchases WHERE business_id = bid AND purchase_date >= p_from AND purchase_date <= p_to) p ON s.d = p.d
    GROUP BY COALESCE(p.d, s.d)
    ORDER BY 1
  LOOP
    rows_out := rows_out || jsonb_build_object('date', rec.date, 'totalSales', rec.total_sales, 'totalPurchases', rec.total_purchases, 'profit', rec.total_sales - rec.total_purchases);
    grand_sales := grand_sales + rec.total_sales;
    grand_purchases := grand_purchases + rec.total_purchases;
  END LOOP;
  RETURN jsonb_build_object('rows', rows_out, 'grandTotalSales', grand_sales, 'grandTotalPurchases', grand_purchases, 'netProfit', grand_sales - grand_purchases);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION umugwaneza.report_outstanding_payables(p_supplier_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  total_outstanding NUMERIC := 0;
  r RECORD;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  FOR r IN
    SELECT p.purchase_date::TEXT AS date, s.supplier_name AS supplier, i.item_name AS item, p.total_purchase_cost AS total, p.amount_paid AS paid, p.remaining_amount AS remaining, p.financial_status AS status
    FROM umugwaneza.purchases p JOIN umugwaneza.suppliers s ON p.supplier_id = s.id JOIN umugwaneza.items i ON p.item_id = i.id
    WHERE p.business_id = bid AND p.remaining_amount > 0 AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
    ORDER BY p.purchase_date
  LOOP
    rows_out := rows_out || to_jsonb(r);
    total_outstanding := total_outstanding + COALESCE(r.remaining, 0);
  END LOOP;
  RETURN jsonb_build_object('rows', rows_out, 'totalOutstanding', total_outstanding);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION umugwaneza.report_outstanding_receivables(p_customer_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  total_outstanding NUMERIC := 0;
  r RECORD;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  FOR r IN
    SELECT sal.sale_date::TEXT AS date, c.customer_name AS customer, i.item_name AS item, sal.total_sale_amount AS total, sal.amount_received AS received, sal.remaining_amount AS remaining, sal.financial_status AS status
    FROM umugwaneza.sales sal JOIN umugwaneza.customers c ON sal.customer_id = c.id JOIN umugwaneza.items i ON sal.item_id = i.id
    WHERE sal.business_id = bid AND sal.remaining_amount > 0 AND (p_customer_id IS NULL OR sal.customer_id = p_customer_id)
    ORDER BY sal.sale_date
  LOOP
    rows_out := rows_out || to_jsonb(r);
    total_outstanding := total_outstanding + COALESCE(r.remaining, 0);
  END LOOP;
  RETURN jsonb_build_object('rows', rows_out, 'totalOutstanding', total_outstanding);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION umugwaneza.report_stock_summary()
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  r RECORD;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  FOR r IN
    SELECT i.item_name AS item, COALESCE(SUM(p.total_quantity), 0) AS total_purchased, COALESCE(SUM(s.total_quantity), 0) AS total_sold,
      COALESCE(SUM(p.total_quantity), 0) - COALESCE(SUM(s.total_quantity), 0) AS current_stock, i.base_unit AS unit, i.measurement_type AS measurement_type
    FROM umugwaneza.items i
    LEFT JOIN umugwaneza.purchases p ON p.item_id = i.id AND p.business_id = i.business_id
    LEFT JOIN umugwaneza.sales s ON s.item_id = i.id AND s.business_id = i.business_id
    WHERE i.business_id = bid AND i.is_active
    GROUP BY i.id, i.item_name, i.base_unit, i.measurement_type
  LOOP
    rows_out := rows_out || to_jsonb(r);
  END LOOP;
  RETURN jsonb_build_object('rows', rows_out);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION umugwaneza.report_supplier_ledger(p_supplier_id UUID, p_from DATE DEFAULT NULL, p_to DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  balance NUMERIC := 0;
  r RECORD;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  FOR r IN
    SELECT * FROM (
      SELECT p.purchase_date AS date, p.reference_no AS reference, p.total_purchase_cost AS purchase_amount, 0::NUMERIC AS payment_amount
      FROM umugwaneza.purchases p WHERE p.business_id = bid AND p.supplier_id = p_supplier_id AND (p_from IS NULL OR p.purchase_date >= p_from) AND (p_to IS NULL OR p.purchase_date <= p_to)
      UNION ALL
      SELECT gp.payment_date, 'PMT-' || LEFT(gp.reference_id::TEXT, 8), 0::NUMERIC, gp.amount FROM umugwaneza.grocery_payments gp
      WHERE gp.business_id = bid AND gp.reference_type = 'PURCHASE' AND gp.reference_id IN (SELECT id FROM umugwaneza.purchases WHERE supplier_id = p_supplier_id AND business_id = bid)
        AND (p_from IS NULL OR gp.payment_date >= p_from) AND (p_to IS NULL OR gp.payment_date <= p_to)
    ) t ORDER BY date
  LOOP
    balance := balance + COALESCE(r.purchase_amount, 0) - COALESCE(r.payment_amount, 0);
    rows_out := rows_out || jsonb_build_object('date', r.date::TEXT, 'reference', r.reference, 'purchaseAmount', r.purchase_amount, 'paymentAmount', r.payment_amount, 'balance', balance);
  END LOOP;
  RETURN jsonb_build_object('rows', rows_out, 'finalBalance', balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION umugwaneza.report_customer_ledger(p_customer_id UUID, p_from DATE DEFAULT NULL, p_to DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  balance NUMERIC := 0;
  r RECORD;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  FOR r IN
    SELECT * FROM (
      SELECT sal.sale_date AS date, sal.reference_no AS reference, sal.total_sale_amount AS sale_amount, 0::NUMERIC AS payment_amount
      FROM umugwaneza.sales sal WHERE sal.business_id = bid AND sal.customer_id = p_customer_id AND (p_from IS NULL OR sal.sale_date >= p_from) AND (p_to IS NULL OR sal.sale_date <= p_to)
      UNION ALL
      SELECT gp.payment_date, 'PMT-' || LEFT(gp.reference_id::TEXT, 8), 0::NUMERIC, gp.amount FROM umugwaneza.grocery_payments gp
      WHERE gp.business_id = bid AND gp.reference_type = 'SALE' AND gp.reference_id IN (SELECT id FROM umugwaneza.sales WHERE customer_id = p_customer_id AND business_id = bid)
        AND (p_from IS NULL OR gp.payment_date >= p_from) AND (p_to IS NULL OR gp.payment_date <= p_to)
    ) t ORDER BY date
  LOOP
    balance := balance + COALESCE(r.sale_amount, 0) - COALESCE(r.payment_amount, 0);
    rows_out := rows_out || jsonb_build_object('date', r.date::TEXT, 'reference', r.reference, 'saleAmount', r.sale_amount, 'paymentAmount', r.payment_amount, 'balance', balance);
  END LOOP;
  RETURN jsonb_build_object('rows', rows_out, 'finalBalance', balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION umugwaneza.report_rental_outgoing(p_from DATE DEFAULT NULL, p_to DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  total_revenue NUMERIC := 0; total_received NUMERIC := 0; total_outstanding NUMERIC := 0;
  r RECORD;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  FOR r IN
    SELECT c.customer_name AS customer, v.vehicle_name AS vehicle,
      (rc.rental_start_datetime::DATE)::TEXT || ' to ' || (rc.rental_end_datetime::DATE)::TEXT AS period,
      rc.total_amount AS total, rc.amount_paid AS paid, rc.remaining_amount AS remaining, rc.financial_status AS status
    FROM umugwaneza.rental_contracts rc JOIN umugwaneza.vehicles v ON rc.vehicle_id = v.id LEFT JOIN umugwaneza.customers c ON rc.customer_id = c.id
    WHERE rc.business_id = bid AND rc.rental_direction = 'OUTGOING'
      AND (p_from IS NULL OR rc.rental_start_datetime::DATE >= p_from) AND (p_to IS NULL OR rc.rental_start_datetime::DATE <= p_to)
    ORDER BY rc.rental_start_datetime
  LOOP
    rows_out := rows_out || to_jsonb(r);
    total_revenue := total_revenue + COALESCE(r.total, 0);
    total_received := total_received + COALESCE(r.paid, 0);
    total_outstanding := total_outstanding + COALESCE(r.remaining, 0);
  END LOOP;
  RETURN jsonb_build_object('rows', rows_out, 'totalRevenue', total_revenue, 'totalReceived', total_received, 'totalOutstanding', total_outstanding);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION umugwaneza.report_rental_incoming(p_from DATE DEFAULT NULL, p_to DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  total_cost NUMERIC := 0; total_paid NUMERIC := 0; total_outstanding NUMERIC := 0;
  r RECORD;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  FOR r IN
    SELECT e.owner_name AS external_owner, v.vehicle_name AS vehicle,
      (rc.rental_start_datetime::DATE)::TEXT || ' to ' || (rc.rental_end_datetime::DATE)::TEXT AS period,
      rc.total_amount AS total, rc.amount_paid AS paid, rc.remaining_amount AS remaining, rc.financial_status AS status
    FROM umugwaneza.rental_contracts rc JOIN umugwaneza.vehicles v ON rc.vehicle_id = v.id LEFT JOIN umugwaneza.external_asset_owners e ON rc.external_owner_id = e.id
    WHERE rc.business_id = bid AND rc.rental_direction = 'INCOMING'
      AND (p_from IS NULL OR rc.rental_start_datetime::DATE >= p_from) AND (p_to IS NULL OR rc.rental_start_datetime::DATE <= p_to)
    ORDER BY rc.rental_start_datetime
  LOOP
    rows_out := rows_out || to_jsonb(r);
    total_cost := total_cost + COALESCE(r.total, 0);
    total_paid := total_paid + COALESCE(r.paid, 0);
    total_outstanding := total_outstanding + COALESCE(r.remaining, 0);
  END LOOP;
  RETURN jsonb_build_object('rows', rows_out, 'totalCost', total_cost, 'totalPaid', total_paid, 'totalOutstanding', total_outstanding);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION umugwaneza.report_vehicle_utilization(p_from DATE DEFAULT NULL, p_to DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  period_days INT := 30;
  r RECORD;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  IF p_from IS NOT NULL AND p_to IS NOT NULL THEN period_days := GREATEST(1, (p_to - p_from + 1)); END IF;
  FOR r IN
    SELECT v.vehicle_name AS vehicle, v.vehicle_type AS type,
      COALESCE(SUM(CASE WHEN rc.rental_direction = 'OUTGOING' THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM (rc.rental_end_datetime - rc.rental_start_datetime)) / 86400)::INT) ELSE 0 END), 0)::INT AS total_rental_days,
      COALESCE(SUM(CASE WHEN rc.rental_direction = 'OUTGOING' THEN rc.total_amount ELSE 0 END), 0) AS total_revenue,
      COUNT(rc.id)::INT AS rental_count
    FROM umugwaneza.vehicles v
    LEFT JOIN umugwaneza.rental_contracts rc ON rc.vehicle_id = v.id AND (p_from IS NULL OR rc.rental_start_datetime::DATE >= p_from) AND (p_to IS NULL OR rc.rental_start_datetime::DATE <= p_to)
    WHERE v.business_id = bid
    GROUP BY v.id, v.vehicle_name, v.vehicle_type
  LOOP
    rows_out := rows_out || jsonb_build_object(
      'vehicle', r.vehicle, 'type', r.type, 'totalRentalDays', r.total_rental_days, 'totalRevenue', r.total_revenue, 'rentalCount', r.rental_count,
      'availability', GREATEST(0, 100 - ROUND((r.total_rental_days::NUMERIC / period_days) * 100))
    );
  END LOOP;
  RETURN jsonb_build_object('rows', rows_out);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION umugwaneza.report_rental_profit(p_from DATE DEFAULT NULL, p_to DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  total_revenue NUMERIC := 0; total_cost NUMERIC := 0;
  outgoing_count INT := 0; incoming_count INT := 0;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)::INT INTO total_revenue, outgoing_count
  FROM umugwaneza.rental_contracts WHERE business_id = bid AND rental_direction = 'OUTGOING'
    AND (p_from IS NULL OR rental_start_datetime::DATE >= p_from) AND (p_to IS NULL OR rental_start_datetime::DATE <= p_to);
  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)::INT INTO total_cost, incoming_count
  FROM umugwaneza.rental_contracts WHERE business_id = bid AND rental_direction = 'INCOMING'
    AND (p_from IS NULL OR rental_start_datetime::DATE >= p_from) AND (p_to IS NULL OR rental_start_datetime::DATE <= p_to);
  RETURN jsonb_build_object('totalRevenue', total_revenue, 'totalCost', total_cost, 'netProfit', total_revenue - total_cost, 'outgoingCount', outgoing_count, 'incomingCount', incoming_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION umugwaneza.report_purchases(DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.report_sales(DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.report_profit(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.report_outstanding_payables(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.report_outstanding_receivables(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.report_stock_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.report_supplier_ledger(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.report_customer_ledger(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.report_rental_outgoing(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.report_rental_incoming(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.report_vehicle_utilization(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.report_rental_profit(DATE, DATE) TO authenticated;
