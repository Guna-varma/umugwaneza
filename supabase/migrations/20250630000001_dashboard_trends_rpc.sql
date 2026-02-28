-- Dashboard trend data for executive analytics charts (last 60 days + top vehicles)

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
    SELECT COALESCE(SUM(rc.total_amount), 0) INTO day_rent
    FROM umugwaneza.rental_contracts rc
    WHERE rc.business_id = bid AND rc.rental_direction = 'OUTGOING' AND rc.rental_start_datetime::DATE = d;

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
      'revenue', COALESCE(SUM(rc.total_amount), 0),
      'contractCount', COUNT(rc.id)::INT
    ) AS row
    FROM umugwaneza.rental_contracts rc
    JOIN umugwaneza.vehicles v ON v.id = rc.vehicle_id AND v.business_id = rc.business_id
    WHERE rc.business_id = bid AND rc.rental_direction = 'OUTGOING'
    GROUP BY v.id, v.vehicle_name
    ORDER BY SUM(rc.total_amount) DESC NULLS LAST
    LIMIT 10
  ) sub;

  RETURN jsonb_build_object(
    'groceryDaily', grocery_daily,
    'rentalDaily', rental_daily,
    'topVehicles', COALESCE(top_vehicles, '[]'::JSONB)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION umugwaneza.dashboard_trends() TO authenticated;
