-- UMUGWANEZA: Recent activity for notifications (no separate notifications table)

CREATE OR REPLACE FUNCTION umugwaneza.get_recent_activity(p_limit INT DEFAULT 50)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  out_arr JSONB := '[]'::JSONB;
  r RECORD;
BEGIN
  IF bid IS NULL THEN RETURN jsonb_build_array(); END IF;

  FOR r IN
    SELECT sub.type, sub.title, sub.description, sub.sort_at FROM (
      SELECT 'purchase' AS type, p.reference_no AS title, 'Purchase from supplier' AS description, p.created_at AS sort_at FROM umugwaneza.purchases p WHERE p.business_id = bid
      UNION ALL
      SELECT 'sale', s.reference_no, 'Sale to customer', s.created_at FROM umugwaneza.sales s WHERE s.business_id = bid
      UNION ALL
      SELECT 'payment', 'Payment ' || g.reference_type, 'Grocery payment', g.created_at FROM umugwaneza.grocery_payments g WHERE g.business_id = bid
      UNION ALL
      SELECT 'rental_payment', 'Rental payment', 'Rental payment', rp.created_at FROM umugwaneza.rental_payments rp WHERE rp.business_id = bid
      UNION ALL
      SELECT 'rental', rc.rental_direction, 'Rental contract', rc.created_at FROM umugwaneza.rental_contracts rc WHERE rc.business_id = bid
    ) sub ORDER BY sub.sort_at DESC LIMIT p_limit
  LOOP
    out_arr := out_arr || jsonb_build_object('type', r.type, 'title', r.title, 'description', r.description, 'created_at', r.sort_at);
  END LOOP;

  RETURN out_arr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION umugwaneza.get_recent_activity(INT) TO authenticated;
