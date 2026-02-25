-- UMUGWANEZA: Validate stock before sale (derived stock = purchases - sales)

CREATE OR REPLACE FUNCTION umugwaneza.check_sale_stock()
RETURNS TRIGGER AS $$
DECLARE
  available NUMERIC;
BEGIN
  SELECT
    (SELECT COALESCE(SUM(total_quantity), 0) FROM umugwaneza.purchases WHERE item_id = NEW.item_id AND business_id = NEW.business_id)
    - (SELECT COALESCE(SUM(total_quantity), 0) FROM umugwaneza.sales WHERE item_id = NEW.item_id AND business_id = NEW.business_id AND id IS DISTINCT FROM COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid))
  INTO available;
  IF available IS NULL OR available < NEW.total_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for this item. Available: %', COALESCE(available, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_sale_stock ON umugwaneza.sales;
CREATE TRIGGER trg_check_sale_stock
  BEFORE INSERT OR UPDATE OF item_id, total_quantity ON umugwaneza.sales
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.check_sale_stock();
