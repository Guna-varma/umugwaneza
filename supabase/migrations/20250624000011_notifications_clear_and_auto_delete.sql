-- Notifications: clear-all RPC, list with 7-day auto-delete, RLS, and triggers to populate from activity.

-- RLS on notifications (only see/delete own business)
ALTER TABLE umugwaneza.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "umugwaneza_select_notifications" ON umugwaneza.notifications;
CREATE POLICY "umugwaneza_select_notifications" ON umugwaneza.notifications FOR SELECT TO authenticated
  USING (umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR umugwaneza.current_user_business_id() = business_id);

DROP POLICY IF EXISTS "umugwaneza_insert_notifications" ON umugwaneza.notifications;
CREATE POLICY "umugwaneza_insert_notifications" ON umugwaneza.notifications FOR INSERT TO authenticated
  WITH CHECK (umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR umugwaneza.current_user_business_id() = business_id);

DROP POLICY IF EXISTS "umugwaneza_delete_notifications" ON umugwaneza.notifications;
CREATE POLICY "umugwaneza_delete_notifications" ON umugwaneza.notifications FOR DELETE TO authenticated
  USING (umugwaneza.current_user_role() = 'SYSTEM_ADMIN' OR umugwaneza.current_user_business_id() = business_id);

-- Hard delete all notifications for current user's business (no notifications will show until new ones are created)
CREATE OR REPLACE FUNCTION umugwaneza.notifications_clear_all()
RETURNS void AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
BEGIN
  IF bid IS NULL THEN RETURN; END IF;
  DELETE FROM umugwaneza.notifications WHERE business_id = bid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- List notifications: first delete any older than 7 days, then return the rest (ordered newest first)
CREATE OR REPLACE FUNCTION umugwaneza.notifications_list(p_limit INT DEFAULT 50)
RETURNS JSONB AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  out_arr JSONB := '[]'::JSONB;
  r RECORD;
BEGIN
  IF bid IS NULL THEN RETURN out_arr; END IF;

  -- Auto-delete notifications that are 7 or more days old
  DELETE FROM umugwaneza.notifications
  WHERE business_id = bid AND created_at < (CURRENT_TIMESTAMP - interval '7 days');

  FOR r IN
    SELECT type, title, description, created_at
    FROM umugwaneza.notifications
    WHERE business_id = bid
    ORDER BY created_at DESC
    LIMIT p_limit
  LOOP
    out_arr := out_arr || jsonb_build_object(
      'type', r.type, 'title', r.title, 'description', r.description, 'created_at', r.created_at
    );
  END LOOP;

  RETURN out_arr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION umugwaneza.notifications_clear_all() TO authenticated;
GRANT EXECUTE ON FUNCTION umugwaneza.notifications_list(INT) TO authenticated;

-- Trigger: insert notification when purchase is created
CREATE OR REPLACE FUNCTION umugwaneza.notify_on_purchase()
RETURNS trigger AS $$
BEGIN
  INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id)
  VALUES (NEW.business_id, 'purchase', NEW.reference_no, 'Purchase from supplier', 'purchase', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_purchase ON umugwaneza.purchases;
CREATE TRIGGER tr_notify_purchase AFTER INSERT ON umugwaneza.purchases
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.notify_on_purchase();

-- Trigger: insert notification when sale is created
CREATE OR REPLACE FUNCTION umugwaneza.notify_on_sale()
RETURNS trigger AS $$
BEGIN
  INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id)
  VALUES (NEW.business_id, 'sale', NEW.reference_no, 'Sale to customer', 'sale', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_sale ON umugwaneza.sales;
CREATE TRIGGER tr_notify_sale AFTER INSERT ON umugwaneza.sales
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.notify_on_sale();

-- Trigger: insert notification when grocery payment is created
CREATE OR REPLACE FUNCTION umugwaneza.notify_on_grocery_payment()
RETURNS trigger AS $$
BEGIN
  INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id)
  VALUES (NEW.business_id, 'payment', 'Payment ' || NEW.reference_type, 'Grocery payment', 'grocery_payment', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_grocery_payment ON umugwaneza.grocery_payments;
CREATE TRIGGER tr_notify_grocery_payment AFTER INSERT ON umugwaneza.grocery_payments
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.notify_on_grocery_payment();

-- Trigger: insert notification when rental payment is created
CREATE OR REPLACE FUNCTION umugwaneza.notify_on_rental_payment()
RETURNS trigger AS $$
BEGIN
  INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id)
  VALUES (NEW.business_id, 'rental_payment', 'Rental payment', 'Rental payment', 'rental_payment', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_rental_payment ON umugwaneza.rental_payments;
CREATE TRIGGER tr_notify_rental_payment AFTER INSERT ON umugwaneza.rental_payments
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.notify_on_rental_payment();

-- Trigger: insert notification when rental contract is created
CREATE OR REPLACE FUNCTION umugwaneza.notify_on_rental_contract()
RETURNS trigger AS $$
BEGIN
  INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id)
  VALUES (NEW.business_id, 'rental', NEW.rental_direction, 'Rental contract', 'rental_contract', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_rental_contract ON umugwaneza.rental_contracts;
CREATE TRIGGER tr_notify_rental_contract AFTER INSERT ON umugwaneza.rental_contracts
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.notify_on_rental_contract();

-- One-time backfill: insert notifications for existing activity in the last 7 days (so list is not empty after deploy)
INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id, created_at)
SELECT business_id, 'purchase', reference_no, 'Purchase from supplier', 'purchase', id, created_at
FROM umugwaneza.purchases WHERE created_at >= (CURRENT_TIMESTAMP - interval '7 days');
INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id, created_at)
SELECT business_id, 'sale', reference_no, 'Sale to customer', 'sale', id, created_at
FROM umugwaneza.sales WHERE created_at >= (CURRENT_TIMESTAMP - interval '7 days');
INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id, created_at)
SELECT business_id, 'payment', 'Payment ' || reference_type, 'Grocery payment', 'grocery_payment', id, created_at
FROM umugwaneza.grocery_payments WHERE created_at >= (CURRENT_TIMESTAMP - interval '7 days');
INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id, created_at)
SELECT business_id, 'rental_payment', 'Rental payment', 'Rental payment', 'rental_payment', id, created_at
FROM umugwaneza.rental_payments WHERE created_at >= (CURRENT_TIMESTAMP - interval '7 days');
INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id, created_at)
SELECT business_id, 'rental', rental_direction, 'Rental contract', 'rental_contract', id, created_at
FROM umugwaneza.rental_contracts WHERE created_at >= (CURRENT_TIMESTAMP - interval '7 days');
