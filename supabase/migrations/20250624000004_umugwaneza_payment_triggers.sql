-- UMUGWANEZA: Update amount_paid/remaining_amount/financial_status on payment insert

CREATE OR REPLACE FUNCTION umugwaneza.after_grocery_payment_insert()
RETURNS TRIGGER AS $$
DECLARE
  new_paid NUMERIC;
  new_rem NUMERIC;
  new_status TEXT;
BEGIN
  IF NEW.reference_type = 'PURCHASE' THEN
    SELECT amount_paid + NEW.amount, total_purchase_cost - (amount_paid + NEW.amount) INTO new_paid, new_rem
    FROM umugwaneza.purchases WHERE id = NEW.reference_id;
    IF FOUND THEN
      new_rem := GREATEST(0, new_rem);
      new_status := CASE WHEN new_rem <= 0 THEN 'FULLY_SETTLED' WHEN new_paid > 0 THEN 'PARTIAL' ELSE 'PENDING' END;
      UPDATE umugwaneza.purchases SET amount_paid = new_paid, remaining_amount = new_rem, financial_status = new_status, updated_at = now() WHERE id = NEW.reference_id;
    END IF;
  ELSE
    SELECT amount_received + NEW.amount, total_sale_amount - (amount_received + NEW.amount) INTO new_paid, new_rem
    FROM umugwaneza.sales WHERE id = NEW.reference_id;
    IF FOUND THEN
      new_rem := GREATEST(0, new_rem);
      new_status := CASE WHEN new_rem <= 0 THEN 'FULLY_RECEIVED' WHEN new_paid > 0 THEN 'PARTIAL' ELSE 'PENDING' END;
      UPDATE umugwaneza.sales SET amount_received = new_paid, remaining_amount = new_rem, financial_status = new_status, updated_at = now() WHERE id = NEW.reference_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_after_grocery_payment_insert ON umugwaneza.grocery_payments;
CREATE TRIGGER trg_after_grocery_payment_insert
  AFTER INSERT ON umugwaneza.grocery_payments
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.after_grocery_payment_insert();

CREATE OR REPLACE FUNCTION umugwaneza.after_rental_payment_insert()
RETURNS TRIGGER AS $$
DECLARE
  new_paid NUMERIC;
  new_rem NUMERIC;
  new_status TEXT;
BEGIN
  SELECT amount_paid + NEW.amount, total_amount - (amount_paid + NEW.amount) INTO new_paid, new_rem
  FROM umugwaneza.rental_contracts WHERE id = NEW.rental_contract_id;
  IF FOUND THEN
    new_rem := GREATEST(0, new_rem);
    new_status := CASE WHEN new_rem <= 0 THEN 'FULLY_SETTLED' WHEN new_paid > 0 THEN 'PARTIAL' ELSE 'PENDING' END;
    UPDATE umugwaneza.rental_contracts SET amount_paid = new_paid, remaining_amount = new_rem, financial_status = new_status, updated_at = now() WHERE id = NEW.rental_contract_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_after_rental_payment_insert ON umugwaneza.rental_payments;
CREATE TRIGGER trg_after_rental_payment_insert
  AFTER INSERT ON umugwaneza.rental_payments
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.after_rental_payment_insert();
