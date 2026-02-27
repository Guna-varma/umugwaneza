-- Amount Due (final settlement) date for purchases and sales, plus 3-day due reminders at 10:00 AM Rwanda.

-- Add optional due date: pay before this date to avoid DELAYED status
ALTER TABLE umugwaneza.purchases ADD COLUMN IF NOT EXISTS amount_due_date DATE;
ALTER TABLE umugwaneza.sales ADD COLUMN IF NOT EXISTS amount_due_date DATE;

COMMENT ON COLUMN umugwaneza.purchases.amount_due_date IS 'Final settlement date; if remaining_amount > 0 after this date, treat as DELAYED';
COMMENT ON COLUMN umugwaneza.sales.amount_due_date IS 'Final settlement date; if remaining_amount > 0 after this date, treat as DELAYED';

-- Track that we ran due-date reminders for a business on a given Rwanda date (idempotent once per day)
CREATE TABLE IF NOT EXISTS umugwaneza.due_reminder_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES umugwaneza.businesses(id),
  run_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, run_date)
);

CREATE INDEX IF NOT EXISTS idx_due_reminder_runs_business_date ON umugwaneza.due_reminder_runs(business_id, run_date);

ALTER TABLE umugwaneza.due_reminder_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "due_reminder_runs_select" ON umugwaneza.due_reminder_runs;
CREATE POLICY "due_reminder_runs_select" ON umugwaneza.due_reminder_runs FOR SELECT TO authenticated
  USING (umugwaneza.current_user_business_id() = business_id);
DROP POLICY IF EXISTS "due_reminder_runs_insert" ON umugwaneza.due_reminder_runs;
CREATE POLICY "due_reminder_runs_insert" ON umugwaneza.due_reminder_runs FOR INSERT TO authenticated
  WITH CHECK (umugwaneza.current_user_business_id() = business_id);

GRANT SELECT, INSERT ON umugwaneza.due_reminder_runs TO authenticated;

-- Process due-date reminders for current user's business.
-- Notify on 3 days before, 2 days before, and on due date (at 10:00 AM Rwanda).
-- Only runs once per business per Rwanda calendar day (call from client after 10:00 AM Rwanda).
-- If remaining_amount becomes 0 (paid), no further reminders (we only select remaining > 0).
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

  -- Only run at or after 10:00 AM Rwanda (hour >= 10) so reminders go "at 10:00 AM"
  IF rw_hour < 10 THEN RETURN 0; END IF;

  -- Idempotent: already ran for this business and date?
  IF EXISTS (SELECT 1 FROM umugwaneza.due_reminder_runs WHERE business_id = bid AND run_date = rw_date) THEN
    RETURN 0;
  END IF;

  -- Notify when due date is today, tomorrow, or in 2 days (3 reminders: D-2, D-1, D)
  -- So we want amount_due_date IN (rw_date, rw_date+1, rw_date+2)
  FOR r IN
    SELECT p.id, p.reference_no, p.amount_due_date,
           (p.amount_due_date - rw_date) AS days_until_due
    FROM umugwaneza.purchases p
    WHERE p.business_id = bid
      AND p.remaining_amount > 0
      AND p.amount_due_date IS NOT NULL
      AND p.amount_due_date >= rw_date
      AND p.amount_due_date <= rw_date + 2
  LOOP
    due_ordinal := r.amount_due_date - rw_date;
    IF due_ordinal = 0 THEN
      msg_title := 'Due today: ' || r.reference_no;
      msg_desc := 'Purchase amount due (final settlement) is today. Pay to avoid DELAYED status.';
    ELSIF due_ordinal = 1 THEN
      msg_title := 'Due tomorrow: ' || r.reference_no;
      msg_desc := 'Purchase amount due tomorrow (' || r.amount_due_date::TEXT || '). Pay on time to avoid DELAYED.';
    ELSE
      msg_title := 'Due in ' || (r.amount_due_date - rw_date) || ' days: ' || r.reference_no;
      msg_desc := 'Purchase amount due on ' || r.amount_due_date::TEXT || '. Pay before due date.';
    END IF;
    INSERT INTO umugwaneza.notifications (business_id, type, title, description, entity_type, entity_id)
    VALUES (bid, 'amount_due', msg_title, msg_desc, 'purchase', r.id);
    inserted := inserted + 1;
  END LOOP;

  FOR r IN
    SELECT s.id, s.reference_no, s.amount_due_date,
           (s.amount_due_date - rw_date) AS days_until_due
    FROM umugwaneza.sales s
    WHERE s.business_id = bid
      AND s.remaining_amount > 0
      AND s.amount_due_date IS NOT NULL
      AND s.amount_due_date >= rw_date
      AND s.amount_due_date <= rw_date + 2
  LOOP
    due_ordinal := r.amount_due_date - rw_date;
    IF due_ordinal = 0 THEN
      msg_title := 'Due today: ' || r.reference_no;
      msg_desc := 'Sale amount due (final settlement) is today. Collect to avoid DELAYED status.';
    ELSIF due_ordinal = 1 THEN
      msg_title := 'Due tomorrow: ' || r.reference_no;
      msg_desc := 'Sale amount due tomorrow (' || r.amount_due_date::TEXT || '). Collect on time to avoid DELAYED.';
    ELSE
      msg_title := 'Due in ' || (r.amount_due_date - rw_date) || ' days: ' || r.reference_no;
      msg_desc := 'Sale amount due on ' || r.amount_due_date::TEXT || '. Collect before due date.';
    END IF;
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

GRANT EXECUTE ON FUNCTION umugwaneza.process_due_date_reminders() TO authenticated;
