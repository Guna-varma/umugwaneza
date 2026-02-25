-- UMUGWANEZA: users table + RLS helpers (schema umugwaneza)
-- Run after umugwaneza.businesses exists. Additive only.

CREATE SCHEMA IF NOT EXISTS umugwaneza;

-- App users: link auth.users to business and role
CREATE TABLE IF NOT EXISTS umugwaneza.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT REFERENCES umugwaneza.businesses(id),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'SYSTEM_ADMIN')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_umugwaneza_users_auth_user_id ON umugwaneza.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_umugwaneza_users_business_id ON umugwaneza.users(business_id);

-- RLS helper: current user's business_id (null for SYSTEM_ADMIN)
CREATE OR REPLACE FUNCTION umugwaneza.current_user_business_id()
RETURNS TEXT AS $$
  SELECT business_id FROM umugwaneza.users WHERE auth_user_id = auth.uid() AND is_active LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS helper: current user's role
CREATE OR REPLACE FUNCTION umugwaneza.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM umugwaneza.users WHERE auth_user_id = auth.uid() AND is_active LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS on users: users can read their own row
ALTER TABLE umugwaneza.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "umugwaneza_users_select_own" ON umugwaneza.users;
CREATE POLICY "umugwaneza_users_select_own" ON umugwaneza.users
  FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

-- Only service_role can insert/update/delete (used by seed script / admin)
DROP POLICY IF EXISTS "umugwaneza_users_service_role" ON umugwaneza.users;
CREATE POLICY "umugwaneza_users_service_role" ON umugwaneza.users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant
GRANT USAGE ON SCHEMA umugwaneza TO anon, authenticated, service_role;
GRANT SELECT ON umugwaneza.users TO authenticated;
GRANT ALL ON umugwaneza.users TO service_role;
