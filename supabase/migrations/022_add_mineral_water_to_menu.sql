-- =============================================================
-- Migration 022: Add Mineral Water to Drinks Category in Menu
-- =============================================================

INSERT INTO public.menu_items (id, category_id, name, description, price, image_url, is_available, sort_order)
VALUES (
  'a5555555-5555-5555-5555-333333333333',
  'c5555555-5555-5555-5555-555555555555',
  'Packaged Mineral Water (1L)',
  'Sealed premium natural mineral water bottle.',
  40.00,
  'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
  true,
  3
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  is_available = EXCLUDED.is_available;
