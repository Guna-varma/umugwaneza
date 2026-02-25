-- UMUGWANEZA: Reject payment if it would exceed remaining amount (real-time validation)

CREATE OR REPLACE FUNCTION umugwaneza.check_grocery_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
  rem NUMERIC;
BEGIN
  IF NEW.reference_type = 'PURCHASE' THEN
    SELECT remaining_amount INTO rem FROM umugwaneza.purchases WHERE id = NEW.reference_id;
  ELSE
    SELECT remaining_amount INTO rem FROM umugwaneza.sales WHERE id = NEW.reference_id;
  END IF;
  IF FOUND AND (rem IS NULL OR NEW.amount > rem) THEN
    RAISE EXCEPTION 'Payment amount (%) exceeds remaining amount (%)', NEW.amount, COALESCE(rem, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_grocery_payment_amount ON umugwaneza.grocery_payments;
CREATE TRIGGER trg_check_grocery_payment_amount
  BEFORE INSERT ON umugwaneza.grocery_payments
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.check_grocery_payment_amount();

CREATE OR REPLACE FUNCTION umugwaneza.check_rental_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
  rem NUMERIC;
BEGIN
  SELECT remaining_amount INTO rem FROM umugwaneza.rental_contracts WHERE id = NEW.rental_contract_id;
  IF FOUND AND (rem IS NULL OR NEW.amount > rem) THEN
    RAISE EXCEPTION 'Rental payment amount (%) exceeds remaining amount (%)', NEW.amount, COALESCE(rem, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_rental_payment_amount ON umugwaneza.rental_payments;
CREATE TRIGGER trg_check_rental_payment_amount
  BEFORE INSERT ON umugwaneza.rental_payments
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.check_rental_payment_amount();
