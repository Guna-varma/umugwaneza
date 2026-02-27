-- Fix: UNION types date and text cannot be matched in report_daily.
-- Cast date column to TEXT in all branches so types match.

CREATE OR REPLACE FUNCTION umugwaneza.report_daily(p_date DATE)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  total_purchase NUMERIC := 0; total_sales NUMERIC := 0; total_rent_out NUMERIC := 0; total_rent_in NUMERIC := 0;
  r RECORD;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  FOR r IN
    SELECT p.reference_no AS ref, p.purchase_date::TEXT AS d, 'Purchase' AS typ, s.supplier_name AS party, i.item_name AS item_vehicle, p.total_quantity::TEXT || ' ' || p.unit AS qty, p.unit_price, p.total_purchase_cost AS total, p.amount_paid AS paid, p.remaining_amount AS remaining, p.financial_status AS status
    FROM umugwaneza.purchases p JOIN umugwaneza.suppliers s ON p.supplier_id = s.id JOIN umugwaneza.items i ON p.item_id = i.id
    WHERE p.business_id = bid AND p.purchase_date = p_date
    UNION ALL
    SELECT sal.reference_no, sal.sale_date::TEXT, 'Sale', c.customer_name, i.item_name, sal.total_quantity::TEXT || ' ' || sal.unit, sal.unit_price, sal.total_sale_amount, sal.amount_received, sal.remaining_amount, sal.financial_status
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
