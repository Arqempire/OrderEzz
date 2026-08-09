-- Migration 028: Add index on order_items(menu_item_id) for join performance
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item ON public.order_items(menu_item_id);
