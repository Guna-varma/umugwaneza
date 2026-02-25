-- UMUGWANEZA LTD - Notifications table in umugwaneza schema (avoids clash with public.notifications from Hapyjo)
CREATE SCHEMA IF NOT EXISTS umugwaneza;

CREATE TABLE IF NOT EXISTS umugwaneza.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  status TEXT DEFAULT 'NEW',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_umugwaneza_notifications_business_created ON umugwaneza.notifications(business_id, created_at DESC);
