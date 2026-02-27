-- Store how each contract is charged: per day, hour, or month.
-- Outgoing: user chooses Day or Hour (how we charge the customer).
-- Incoming: from vehicle (Day, Hour, or Month).
ALTER TABLE umugwaneza.rental_contracts
  ADD COLUMN IF NOT EXISTS rental_type TEXT DEFAULT 'DAY' CHECK (rental_type IN ('DAY', 'HOUR', 'MONTH'));

COMMENT ON COLUMN umugwaneza.rental_contracts.rental_type IS 'Charge basis: DAY, HOUR, or MONTH. Outgoing = Day/Hour only; Incoming = from vehicle.';
