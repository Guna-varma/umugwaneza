-- Umugwaneza: profiles RLS (legacy). On shared DB with Hapyjo, public.profiles has different structure (id not user_id).
-- App uses umugwaneza.users and RLS from 20250624* migrations. This migration is a no-op so db push succeeds on shared DB.
DO $$
BEGIN
  RAISE NOTICE 'umugwaneza_profiles_rls: no-op (use umugwaneza.users + 20250624 RLS on shared DB)';
END $$;
