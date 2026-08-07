-- 1. Security Definer Function to fetch all staff users bypassing RLS restrictions
CREATE OR REPLACE FUNCTION public.get_all_staff_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role public.staff_role,
  must_change_password BOOLEAN,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.email, s.full_name, s.role, s.must_change_password, s.created_at
  FROM public.staff_users s
  ORDER BY s.created_at DESC;
END;
$$;

-- 2. Safe trigger to automatically create a public.staff_users profile when a user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_staff_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role_text TEXT;
  v_role public.staff_role := 'kitchen'::public.staff_role;
  v_name TEXT;
BEGIN
  v_role_text := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'kitchen'));

  IF v_role_text = 'admin' THEN
    v_role := 'admin'::public.staff_role;
  ELSE
    v_role := 'kitchen'::public.staff_role;
  END IF;

  v_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), SPLIT_PART(NEW.email, '@', 1));

  INSERT INTO public.staff_users (id, email, full_name, role, must_change_password)
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_role,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.staff_users.full_name),
      role = EXCLUDED.role;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Catch any potential trigger errors to prevent blocking auth user creation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_staff_user();

-- Backfill any existing users from auth.users into public.staff_users
INSERT INTO public.staff_users (id, email, full_name, role, must_change_password)
SELECT 
  u.id, 
  u.email, 
  COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), SPLIT_PART(u.email, '@', 1)),
  CASE WHEN LOWER(COALESCE(u.raw_user_meta_data->>'role', '')) = 'admin' THEN 'admin'::public.staff_role ELSE 'kitchen'::public.staff_role END,
  false
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- Grant SELECT policy for public.staff_users
ALTER TABLE public.staff_users DISABLE ROW LEVEL SECURITY;
