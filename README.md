# OrderEzz - Dine-In Restaurant Ordering Web App

**OrderEzz** is a modern, mobile-first, real-time dine-in restaurant ordering application. Customers scan a QR code at their table, browse the menu, add items to cart, place orders securely, and track kitchen status live.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (Postgres, Auth, Realtime, RLS)**.

---

## Key Features & Security Architecture

1. **End-to-End Admin Panel Authentication & Authorization**:
   - **Root Middleware Guard (`middleware.ts`)**: Intercepts `/admin/*` pages and `/api/admin/*` API endpoints, enforcing a valid Supabase Auth session and `role = 'admin'` in `public.staff_users`.
   - **Server-Side API Route Verification (`lib/auth/admin-guard.ts`)**: Server-side guard function `verifyAdminSession()` checks session authentication & admin role at the top of every `/api/admin/*` route handler (rejects with 401/403).
   - **Analytics RPC Role Protection (`017_admin_auth_rls_security.sql`)**: All 6 analytics RPC functions enforce `IF NOT public.is_admin() THEN RAISE EXCEPTION ...` inside their SQL bodies.
   - **Dedicated Admin Login (`/admin/login`)**: Supports return-to path redirection (`?redirectTo=...`) and auto-restores active admin sessions.
2. **Unguessable QR Tokens & Table Privacy**:
   - Customers scan QR codes pointing to `/order?t=<qr_token>` where `qr_token` is a UUID.
   - Internal `table_number` is never exposed in URLs or client payloads.
   - Table resolution is handled via a PostgreSQL `SECURITY DEFINER` function `resolve_table_from_qr_token(token)`.
3. **Server-Side Price Validation**:
   - Orders are placed through the Postgres function `place_order_with_items(p_table_id, p_items)`.
   - Prices and total amounts are recalculated server-side directly from `menu_items.price` before saving to prevent payload tampering.
4. **Staff & Admin Menu Stock Control (`/staff/menu` & `/admin/menu`)**:
   - Both **Admins** (`/admin/menu`) and **Kitchen Staff** (`/staff/menu`) can toggle dish availability (`In Stock` / `Sold Out`).
   - When marked `Sold Out`, the customer ordering interface (`/order`) immediately exposes a "Sold Out" overlay and disables cart additions for that dish in real time.
5. **Customer Reviews & Feedback System (`/admin/feedback` & `/staff/feedback`)**:
   - Available in **both** the Admin Panel (`/admin/feedback`) and Staff Panel (`/staff/feedback`).
   - Admins, kitchen staff, and hotel management can inspect diner star ratings (1 to 5 stars), experience tags (`Delicious Food`, `Quick Service`, `Friendly Staff`), and custom chef notes submitted during table checkout.
6. **Executive Analytics Dashboard (`/admin/analytics`)**:
   - Live revenue, order count, AOV (₹), and average kitchen fulfillment time.
   - Interactive Total Revenue & Total Orders metric breakdown cards.
   - Card-contained Live Order Status Snapshot inspector with real-time active dish popup.
7. **Order Status Transition History Logging (`order_status_history`)**:
   - Automatic database trigger `trigger_log_order_status_change` logs every order status change (`received` -> `preparing` -> `ready` -> `served` -> `paid`) with exact `changed_at` timestamps for precise throughput analytics.
8. **Real-time Kitchen & Customer Updates**:
   - Staff Kanban Dashboard (`/staff/orders`) and Customer Status Page (`/order/status/[orderId]`) subscribe to Supabase Realtime updates on the `orders` table.
   - > **Note:** Migration `020` is a security fix — it closes a privilege-escalation
> hole in `staff_users` (any anon request could previously set `role = 'admin'`)
> and removes public read access to the full `orders`/`order_items` tables.
> It must be applied to every environment, including any fresh Supabase project.

---

## Database Migrations Setup

In your Supabase Dashboard SQL Editor, run the migration scripts in numerical order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_rpc_functions.sql`
4. `supabase/migrations/004_seed_data.sql`
5. `supabase/migrations/005_ai_menu_import.sql`
6. `supabase/migrations/006_staff_profiles_update.sql`
7. `supabase/migrations/007_auto_create_staff_profile.sql`
8. `supabase/migrations/008_analytics_and_history.sql`
9. `supabase/migrations/009_enable_realtime_orders.sql`
10. `supabase/migrations/010_customer_feedbacks.sql`
11. `supabase/migrations/011_allow_staff_update_own_profile.sql`
12. `supabase/migrations/012_analytics_rpc_functions.sql`
13. `supabase/migrations/013_enable_realtime_menu_items.sql`
14. `supabase/migrations/014_toggle_menu_availability_rpc.sql`
15. `supabase/migrations/015_menu_items_update_policy.sql`
16. `supabase/migrations/016_fix_staff_menu_update_rls.sql`
17. `supabase/migrations/017_admin_auth_rls_security.sql`
18. `supabase/migrations/018_random_qr_tokens.sql`
19. `supabase/migrations/019_table_requests.sql`
20. `supabase/migrations/020_fix_staff_users_rls.sql`
Enable **Realtime** in Supabase for tables `orders`, `menu_items`, and `table_requests`:
- Go to **Database** -> **Publications** -> **supabase_realtime** -> Enable `orders`, `menu_items`, and `table_requests`.

---

## Managing Admin Accounts

Run these SQL scripts in your **Supabase Dashboard → SQL Editor** to promote existing users or create fresh admin accounts.

### Promote an Existing User Account to Admin

```sql
-- Update role to admin for an existing user in staff_users
UPDATE public.staff_users
SET role = 'admin'
WHERE email = 'your-email@example.com';

-- Or create staff_users profile for an existing Supabase Auth user
INSERT INTO public.staff_users (id, email, role, full_name, must_change_password)
SELECT 
  id, 
  email, 
  'admin'::staff_role, 
  COALESCE(raw_user_meta_data->>'full_name', 'Admin User'), 
  false
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

### Create a Fresh Admin Account Directly in SQL

```sql
-- 1. Create Supabase Auth user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@restaurant.com',
  crypt('admin123456', gen_salt('bf')), -- Password: admin123456
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Executive Admin","role":"admin"}',
  now(),
  now()
) ON CONFLICT (email) DO NOTHING;

-- 2. Link staff profile as admin
INSERT INTO public.staff_users (id, email, role, full_name, must_change_password)
SELECT id, email, 'admin'::staff_role, 'Executive Admin', false
FROM auth.users
WHERE email = 'admin@restaurant.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

---


```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
