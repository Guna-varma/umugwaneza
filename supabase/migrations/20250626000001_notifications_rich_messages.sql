-- Rich notification messages and navigation metadata (entity_type/entity_id) for purchases, sales, and due reminders.

-- Update notifications_list to return entity_type and entity_id and keep 7-day auto-delete.
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
    SELECT type, title, description, entity_type, entity_id, created_at
    FROM umugwaneza.notifications
    WHERE business_id = bid
    ORDER BY created_at DESC
    LIMIT p_limit
  LOOP
    out_arr := out_arr || jsonb_build_object(
      'type', r.type,
      'title', r.title,
      'description', r.description,
      'entity_type', r.entity_type,
      'entity_id', r.entity_id,
      'created_at', r.created_at
    );
  END LOOP;

  RETURN out_arr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rich messages for purchase notifications
CREATE OR REPLACE FUNCTION umugwaneza.notify_on_purchase()
RETURNS trigger AS $$
DECLARE
  sup_name TEXT;
  item_name TEXT;
  qty_text TEXT;
  remaining NUMERIC;
  due_text TEXT;
BEGIN
  SELECT supplier_name INTO sup_name FROM umugwaneza.suppliers WHERE id = NEW.supplier_id;
  SELECT i.item_name INTO item_name FROM umugwaneza.items i WHERE i.id = NEW.item_id;
  qty_text := NEW.total_quantity::TEXT || ' ' || NEW.unit;
  remaining := COALESCE(NEW.total_purchase_cost, 0) - COALESCE(NEW.amount_paid, 0);
  IF NEW.amount_due_date IS NOT NULL THEN
    due_text := ' Due by ' || NEW.amount_due_date::TEXT || '.';
  ELSE
    due_text := '';
  END IF;

  INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id)
  VALUES (
    NEW.business_id,
    'purchase',
    'Purchase ' || NEW.reference_no || ' from ' || COALESCE(sup_name, 'supplier'),
    'Bought ' || qty_text || ' of ' || COALESCE(item_name, 'item')
      || ' for ' || COALESCE(NEW.total_purchase_cost, 0)::TEXT || ' RWF. '
      || 'Paid ' || COALESCE(NEW.amount_paid, 0)::TEXT || ' RWF, remaining '
      || GREATEST(remaining, 0)::TEXT || ' RWF.' || due_text,
    'purchase',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_purchase ON umugwaneza.purchases;
CREATE TRIGGER tr_notify_purchase AFTER INSERT ON umugwaneza.purchases
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.notify_on_purchase();

-- Rich messages for sale notifications
CREATE OR REPLACE FUNCTION umugwaneza.notify_on_sale()
RETURNS trigger AS $$
DECLARE
  cust_name TEXT;
  item_name TEXT;
  qty_text TEXT;
  remaining NUMERIC;
  due_text TEXT;
BEGIN
  SELECT customer_name INTO cust_name FROM umugwaneza.customers WHERE id = NEW.customer_id;
  SELECT i.item_name INTO item_name FROM umugwaneza.items i WHERE i.id = NEW.item_id;
  qty_text := NEW.total_quantity::TEXT || ' ' || NEW.unit;
  remaining := COALESCE(NEW.total_sale_amount, 0) - COALESCE(NEW.amount_received, 0);
  IF NEW.amount_due_date IS NOT NULL THEN
    due_text := ' Due by ' || NEW.amount_due_date::TEXT || '.';
  ELSE
    due_text := '';
  END IF;

  INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id)
  VALUES (
    NEW.business_id,
    'sale',
    'Sale ' || NEW.reference_no || ' to ' || COALESCE(cust_name, 'customer'),
    'Sold ' || qty_text || ' of ' || COALESCE(item_name, 'item')
      || ' for ' || COALESCE(NEW.total_sale_amount, 0)::TEXT || ' RWF. '
      || 'Received ' || COALESCE(NEW.amount_received, 0)::TEXT || ' RWF, remaining '
      || GREATEST(remaining, 0)::TEXT || ' RWF.' || due_text,
    'sale',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_sale ON umugwaneza.sales;
CREATE TRIGGER tr_notify_sale AFTER INSERT ON umugwaneza.sales
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.notify_on_sale();

-- Keep existing payment and rental triggers, but ensure they use entity_type/entity_id consistently.
CREATE OR REPLACE FUNCTION umugwaneza.notify_on_grocery_payment()
RETURNS trigger AS $$
BEGIN
  INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id)
  VALUES (
    NEW.business_id,
    'payment',
    'Grocery payment ' || NEW.reference_type,
    'Recorded payment of ' || NEW.amount::TEXT || ' RWF for ' || NEW.reference_type || '.',
    'grocery_payment',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_grocery_payment ON umugwaneza.grocery_payments;
CREATE TRIGGER tr_notify_grocery_payment AFTER INSERT ON umugwaneza.grocery_payments
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.notify_on_grocery_payment();

CREATE OR REPLACE FUNCTION umugwaneza.notify_on_rental_payment()
RETURNS trigger AS $$
BEGIN
  INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id)
  VALUES (
    NEW.business_id,
    'rental_payment',
    'Rental payment',
    'Recorded rental payment of ' || NEW.amount::TEXT || ' RWF.',
    'rental_payment',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_rental_payment ON umugwaneza.rental_payments;
CREATE TRIGGER tr_notify_rental_payment AFTER INSERT ON umugwaneza.rental_payments
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.notify_on_rental_payment();

CREATE OR REPLACE FUNCTION umugwaneza.notify_on_rental_contract()
RETURNS trigger AS $$
BEGIN
  INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id)
  VALUES (
    NEW.business_id,
    'rental',
    'Rental contract ' || NEW.rental_direction,
    'New rental contract created with total ' || COALESCE(NEW.total_amount, 0)::TEXT || ' RWF.',
    'rental_contract',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_rental_contract ON umugwaneza.rental_contracts;
CREATE TRIGGER tr_notify_rental_contract AFTER INSERT ON umugwaneza.rental_contracts
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.notify_on_rental_contract();

-- Richer due-date reminder messages (purchases and sales)
CREATE OR REPLACE FUNCTION umugwaneza.process_due_date_reminders()
RETURNS INT AS $$
DECLARE
  bid TEXT := umugwaneza.current_user_business_id();
  rw_date DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Kigali')::DATE;
  rw_hour INT := EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Kigali'));
  inserted INT := 0;
  r RECORD;
  due_ordinal INT;
  msg_title TEXT;
  msg_desc TEXT;
BEGIN
  IF bid IS NULL THEN RETURN 0; END IF;

  -- Only run at or after 10:00 AM Rwanda (hour >= 10)
  IF rw_hour < 10 THEN RETURN 0; END IF;

  -- Idempotent: already ran for this business and date?
  IF EXISTS (SELECT 1 FROM umugwaneza.due_reminder_runs WHERE business_id = bid AND run_date = rw_date) THEN
    RETURN 0;
  END IF;

  -- Purchases: amount due today, tomorrow, or in 2 days
  FOR r IN
    SELECT p.id,
           p.reference_no,
           p.amount_due_date,
           p.remaining_amount,
           p.total_purchase_cost,
           s.supplier_name,
           i.item_name,
           p.total_quantity,
           p.unit
    FROM umugwaneza.purchases p
    JOIN umugwaneza.suppliers s ON p.supplier_id = s.id
    JOIN umugwaneza.items i ON p.item_id = i.id
    WHERE p.business_id = bid
      AND p.remaining_amount > 0
      AND p.amount_due_date IS NOT NULL
      AND p.amount_due_date >= rw_date
      AND p.amount_due_date <= rw_date + 2
  LOOP
    due_ordinal := r.amount_due_date - rw_date;
    IF due_ordinal = 0 THEN
      msg_title := 'Purchase ' || r.reference_no || ' due today';
    ELSIF due_ordinal = 1 THEN
      msg_title := 'Purchase ' || r.reference_no || ' due tomorrow';
    ELSE
      msg_title := 'Purchase ' || r.reference_no || ' due in ' || due_ordinal::TEXT || ' days';
    END IF;

    msg_desc :=
      'Supplier: ' || r.supplier_name
      || '. Item: ' || r.item_name
      || ' (' || r.total_quantity::TEXT || ' ' || r.unit || '). '
      || 'Remaining: ' || r.remaining_amount::TEXT || ' RWF. '
      || 'Final settlement date: ' || r.amount_due_date::TEXT || '.';

    INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id)
    VALUES (bid, 'amount_due', msg_title, msg_desc, 'purchase', r.id);
    inserted := inserted + 1;
  END LOOP;

  -- Sales: amount due today, tomorrow, or in 2 days
  FOR r IN
    SELECT s.id,
           s.reference_no,
           s.amount_due_date,
           s.remaining_amount,
           s.total_sale_amount,
           c.customer_name,
           i.item_name,
           s.total_quantity,
           s.unit
    FROM umugwaneza.sales s
    JOIN umugwaneza.customers c ON s.customer_id = c.id
    JOIN umugwaneza.items i ON s.item_id = i.id
    WHERE s.business_id = bid
      AND s.remaining_amount > 0
      AND s.amount_due_date IS NOT NULL
      AND s.amount_due_date >= rw_date
      AND s.amount_due_date <= rw_date + 2
  LOOP
    due_ordinal := r.amount_due_date - rw_date;
    IF due_ordinal = 0 THEN
      msg_title := 'Sale ' || r.reference_no || ' due today';
    ELSIF due_ordinal = 1 THEN
      msg_title := 'Sale ' || r.reference_no || ' due tomorrow';
    ELSE
      msg_title := 'Sale ' || r.reference_no || ' due in ' || due_ordinal::TEXT || ' days';
    END IF;

    msg_desc :=
      'Customer: ' || r.customer_name
      || '. Item: ' || r.item_name
      || ' (' || r.total_quantity::TEXT || ' ' || r.unit || '). '
      || 'Remaining: ' || r.remaining_amount::TEXT || ' RWF. '
      || 'Final settlement date: ' || r.amount_due_date::TEXT || '.';

    INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id)
    VALUES (bid, 'amount_due', msg_title, msg_desc, 'sale', r.id);
    inserted := inserted + 1;
  END LOOP;

  INSERT INTO umugwaneza.due_reminder_runs (business_id, run_date)
  VALUES (bid, rw_date)
  ON CONFLICT (business_id, run_date) DO NOTHING;

  RETURN inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

