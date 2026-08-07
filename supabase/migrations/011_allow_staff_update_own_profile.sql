-- Allow staff users to update their own profile (e.g. must_change_password flag)
DROP POLICY IF EXISTS "Allow users to update their own staff profile" ON public.staff_users;

CREATE POLICY "Allow users to update their own staff profile"
  ON public.staff_users
  FOR UPDATE
  TO authenticated, public
  USING (true)
  WITH CHECK (true);

-- Create a SECURITY DEFINER function to bypass RLS when updating password status
CREATE OR REPLACE FUNCTION public.update_staff_must_change_password(p_user_id UUID, p_must_change BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.staff_users
  SET must_change_password = p_must_change
  WHERE id = p_user_id;
END;
$$;
