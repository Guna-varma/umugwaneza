-- Add MONTH as a rental type option for vehicles.
ALTER TABLE umugwaneza.vehicles
  DROP CONSTRAINT IF EXISTS vehicles_rental_type_check;
ALTER TABLE umugwaneza.vehicles
  ADD CONSTRAINT vehicles_rental_type_check CHECK (rental_type IN ('DAY', 'HOUR', 'MONTH'));
