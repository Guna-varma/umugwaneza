-- UMUGWANEZA: Prevent overlapping active rentals for same vehicle

CREATE OR REPLACE FUNCTION umugwaneza.check_rental_no_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.operational_status NOT IN ('ACTIVE', 'MAINTENANCE') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM umugwaneza.rental_contracts r
    WHERE r.vehicle_id = NEW.vehicle_id
      AND r.operational_status IN ('ACTIVE', 'MAINTENANCE')
      AND r.id IS DISTINCT FROM COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND r.rental_start_datetime < NEW.rental_end_datetime
      AND r.rental_end_datetime > NEW.rental_start_datetime
  ) THEN
    RAISE EXCEPTION 'Vehicle has an overlapping active rental for the selected period.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rental_contracts_no_overlap ON umugwaneza.rental_contracts;
CREATE TRIGGER trg_rental_contracts_no_overlap
  BEFORE INSERT OR UPDATE ON umugwaneza.rental_contracts
  FOR EACH ROW EXECUTE FUNCTION umugwaneza.check_rental_no_overlap();
