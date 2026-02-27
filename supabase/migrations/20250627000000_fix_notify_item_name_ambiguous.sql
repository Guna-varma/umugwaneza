-- Fix: column reference "item_name" is ambiguous in notify_on_purchase / notify_on_sale.
-- Qualify the column with table alias so the variable assignment is unambiguous.

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
