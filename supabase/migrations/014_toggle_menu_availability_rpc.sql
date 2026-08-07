-- Create SECURITY DEFINER RPC function to toggle menu item availability bypassing RLS
CREATE OR REPLACE FUNCTION public.toggle_menu_item_availability(
  p_item_id UUID,
  p_is_available BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.menu_items
  SET is_available = p_is_available
  WHERE id = p_item_id;

  RETURN FOUND;
END;
$$;

-- Grant permissions to public, anon, authenticated, service_role
GRANT EXECUTE ON FUNCTION public.toggle_menu_item_availability(UUID, BOOLEAN) TO anon, authenticated, service_role, public;
