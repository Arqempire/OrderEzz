-- Seed Tables
INSERT INTO public.tables (table_number, qr_token, is_active) VALUES
  (1, gen_random_uuid(), true),
  (2, gen_random_uuid(), true),
  (3, gen_random_uuid(), true),
  (4, gen_random_uuid(), true),
  (5, gen_random_uuid(), false)
ON CONFLICT (table_number) DO NOTHING;

-- Seed Menu Categories
INSERT INTO public.menu_categories (id, name, sort_order) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Starters & Appetizers', 1),
  ('c2222222-2222-2222-2222-222222222222', 'Main Courses', 2),
  ('c3333333-3333-3333-3333-333333333333', 'Wood-Fired Pizza', 3),
  ('c4444444-4444-4444-4444-444444444444', 'Desserts', 4),
  ('c5555555-5555-5555-5555-555555555555', 'Drinks & Beverages', 5)
ON CONFLICT DO NOTHING;

-- Seed Menu Items (Prices in INR ₹)
INSERT INTO public.menu_items (id, category_id, name, description, price, image_url, is_available, sort_order) VALUES
  -- Starters
  ('a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Truffle Garlic Fries', 'Crispy hand-cut fries tossed in white truffle oil, rosemary, and aged Parmesan.', 240.00, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80', true, 1),
  ('a1111111-1111-1111-1111-222222222222', 'c1111111-1111-1111-1111-111111111111', 'Crispy Calamari', 'Wild-caught squid with house-made smoked paprika aioli and fresh lemon wedges.', 360.00, 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80', true, 2),
  ('a1111111-1111-1111-1111-333333333333', 'c1111111-1111-1111-1111-111111111111', 'Bruschetta Pomodoro', 'Grilled artisan sourdough topped with vine-ripened tomatoes, fresh basil, and balsamic reduction.', 280.00, 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=600&q=80', true, 3),

  -- Mains
  ('a2222222-2222-2222-2222-111111111111', 'c2222222-2222-2222-2222-222222222222', 'Wagyu Smash Burger', 'Double Wagyu beef patty, caramelized onions, sharp cheddar, secret sauce on a toasted brioche bun.', 450.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', true, 1),
  ('a2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Pan-Seared Salmon', 'Atlantic salmon fillet served with creamy saffron risotto and asparagus.', 650.00, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80', true, 2),
  ('a2222222-2222-2222-2222-333333333333', 'c2222222-2222-2222-2222-222222222222', 'Rigatoni Bolognese', 'Slow-simmered beef and pork ragù, fresh ricotta, and shaved Parmigiano-Reggiano.', 420.00, 'https://images.unsplash.com/photo-1621996346565-e3def6164286?auto=format&fit=crop&w=600&q=80', true, 3),

  -- Pizza
  ('a3333333-3333-3333-3333-111111111111', 'c3333333-3333-3333-3333-333333333333', 'Margherita Supreme', 'San Marzano tomato sauce, fresh buffalo mozzarella, fragrant basil leaves, extra virgin olive oil.', 390.00, 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80', true, 1),
  ('a3333333-3333-3333-3333-222222222222', 'c3333333-3333-3333-3333-333333333333', 'Spicy Pepperoni & Honey', 'Spicy artisan pepperoni, crushed chili flakes, mozzarella, and a drizzle of hot honey.', 480.00, 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80', true, 2),

  -- Desserts
  ('a4444444-4444-4444-4444-111111111111', 'c4444444-4444-4444-4444-444444444444', 'Classic Tiramisu', 'Layered espresso-soaked ladyfingers, whipped mascarpone cream, cocoa powder.', 220.00, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80', true, 1),
  ('a4444444-4444-4444-4444-222222222222', 'c4444444-4444-4444-4444-444444444444', 'Molten Chocolate Lava Cake', 'Warm chocolate cake with a gooey center, served with Madagascar vanilla bean ice cream.', 260.00, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80', true, 2),

  -- Drinks
  ('a5555555-5555-5555-5555-111111111111', 'c5555555-5555-5555-5555-555555555555', 'Craft Lemonade', 'Freshly squeezed lemons, mint leaves, sparkling mineral water, and agave syrup.', 140.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', true, 1),
  ('a5555555-5555-5555-5555-222222222222', 'c5555555-5555-5555-5555-555555555555', 'Iced Oat Milk Latte', 'Double shot of single-origin espresso with creamy oat milk over ice.', 180.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', true, 2)
ON CONFLICT DO NOTHING;
