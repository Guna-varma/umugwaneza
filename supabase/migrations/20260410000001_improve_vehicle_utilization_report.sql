-- Improve vehicle utilization reporting for production reporting and export.
-- Fixes:
-- 1. Count only outgoing rentals in rental_count.
-- 2. Limit rental days to the selected reporting window.
-- 3. Return utilization alongside availability for richer analytics.

CREATE OR REPLACE FUNCTION umugwaneza.report_vehicle_utilization(p_from DATE DEFAULT NULL, p_to DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  period_start DATE := COALESCE(p_from, CURRENT_DATE - INTERVAL '29 day');
  period_end DATE := COALESCE(p_to, CURRENT_DATE);
  period_days INT;
  total_revenue NUMERIC := 0;
  total_rental_days INT := 0;
  total_vehicles INT := 0;
  active_vehicles INT := 0;
  r RECORD;
  utilization_pct NUMERIC;
  availability_pct NUMERIC;
BEGIN
  IF bid IS NULL THEN
    RETURN jsonb_build_object('error', 'No business context');
  END IF;

  period_days := GREATEST(1, (period_end - period_start + 1));

  FOR r IN
    SELECT
      v.vehicle_name AS vehicle,
      v.vehicle_type AS type,
      COALESCE(
        SUM(
          CASE
            WHEN rc.rental_direction = 'OUTGOING' THEN
              GREATEST(
                0,
                LEAST(rc.rental_end_datetime::DATE, period_end) - GREATEST(rc.rental_start_datetime::DATE, period_start) + 1
              )
            ELSE 0
          END
        ),
        0
      )::INT AS total_rental_days,
      COALESCE(SUM(CASE WHEN rc.rental_direction = 'OUTGOING' THEN rc.total_amount ELSE 0 END), 0) AS total_revenue,
      COUNT(*) FILTER (WHERE rc.rental_direction = 'OUTGOING')::INT AS rental_count
    FROM umugwaneza.vehicles v
    LEFT JOIN umugwaneza.rental_contracts rc
      ON rc.vehicle_id = v.id
      AND rc.business_id = bid
      AND rc.rental_start_datetime::DATE <= period_end
      AND rc.rental_end_datetime::DATE >= period_start
    WHERE v.business_id = bid
    GROUP BY v.id, v.vehicle_name, v.vehicle_type
    ORDER BY v.vehicle_name
  LOOP
    utilization_pct := LEAST(100, ROUND((COALESCE(r.total_rental_days, 0)::NUMERIC / period_days) * 100, 1));
    availability_pct := GREATEST(0, 100 - utilization_pct);

    total_vehicles := total_vehicles + 1;
    total_revenue := total_revenue + COALESCE(r.total_revenue, 0);
    total_rental_days := total_rental_days + COALESCE(r.total_rental_days, 0);
    IF COALESCE(r.total_rental_days, 0) > 0 THEN
      active_vehicles := active_vehicles + 1;
    END IF;

    rows_out := rows_out || jsonb_build_object(
      'vehicle', r.vehicle,
      'type', r.type,
      'totalRentalDays', r.total_rental_days,
      'totalRevenue', r.total_revenue,
      'rentalCount', r.rental_count,
      'utilization', utilization_pct,
      'availability', availability_pct
    );
  END LOOP;

  RETURN jsonb_build_object(
    'rows', rows_out,
    'periodDays', period_days,
    'totalVehicles', total_vehicles,
    'activeVehicles', active_vehicles,
    'totalRentalDays', total_rental_days,
    'totalRevenue', total_revenue
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
