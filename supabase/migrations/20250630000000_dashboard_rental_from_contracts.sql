-- Dashboard rental: derive Rented Out / Rented In from active contracts
-- so counts match "Giving Rental to Customers" and "Taking Rent from Owners" tables.

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
  -- Rented Out/In from active rental contracts (not vehicle.current_status)
  SELECT COUNT(DISTINCT vehicle_id)::INT INTO rented_out
  FROM umugwaneza.rental_contracts
  WHERE business_id = bid AND rental_direction = 'OUTGOING' AND operational_status = 'ACTIVE';
  SELECT COUNT(DISTINCT vehicle_id)::INT INTO rented_in
  FROM umugwaneza.rental_contracts
  WHERE business_id = bid AND rental_direction = 'INCOMING' AND operational_status = 'ACTIVE';
  SELECT COUNT(*)::INT INTO maintenance_v FROM umugwaneza.vehicles WHERE business_id = bid AND current_status = 'MAINTENANCE';
  -- Available = total - rented out - rented in - maintenance
  available_v := total_v - rented_out - rented_in - maintenance_v;
  IF available_v < 0 THEN
    available_v := 0;
  END IF;
  SELECT COALESCE(SUM(total_amount), 0) INTO month_revenue
  FROM umugwaneza.rental_contracts
  WHERE business_id = bid AND rental_direction = 'OUTGOING' AND rental_start_datetime >= month_start;
  RETURN jsonb_build_object(
    'total', total_v, 'available', available_v, 'rentedOut', rented_out, 'rentedIn', rented_in, 'maintenance', maintenance_v,
    'todayRevenue', 0, 'monthRevenue', month_revenue
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
