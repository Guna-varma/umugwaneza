-- Fix report_stock_summary: aggregate purchases and sales per item in subqueries
-- to avoid Cartesian product (which was inflating/doubling sums and causing wrong/negative stock).

CREATE OR REPLACE FUNCTION umugwaneza.report_stock_summary()
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rows_out JSONB := '[]'::JSONB;
  r RECORD;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_object('error', 'No business context'); END IF;
  FOR r IN
    SELECT
      i.item_name AS item,
      COALESCE(p.total_purchased, 0) AS total_purchased,
      COALESCE(s.total_sold, 0) AS total_sold,
      COALESCE(p.total_purchased, 0) - COALESCE(s.total_sold, 0) AS current_stock,
      i.base_unit AS unit,
      i.measurement_type AS measurement_type
    FROM umugwaneza.items i
    LEFT JOIN (
      SELECT item_id, SUM(total_quantity) AS total_purchased
      FROM umugwaneza.purchases
      WHERE business_id = bid
      GROUP BY item_id
    ) p ON p.item_id = i.id
    LEFT JOIN (
      SELECT item_id, SUM(total_quantity) AS total_sold
      FROM umugwaneza.sales
      WHERE business_id = bid
      GROUP BY item_id
    ) s ON s.item_id = i.id
    WHERE i.business_id = bid AND i.is_active
    ORDER BY i.item_name
  LOOP
    rows_out := rows_out || to_jsonb(r);
  END LOOP;
  RETURN jsonb_build_object('rows', rows_out);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
