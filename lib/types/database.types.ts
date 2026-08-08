export type OrderStatus = 'received' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';
export type StaffRole = 'kitchen' | 'admin';
export type ImportBatchStatus = 'pending_review' | 'confirmed' | 'discarded';

export * from './table-request.types';

export interface TableRow {
  id: string;
  table_number: number;
  qr_token: string;
  is_active: boolean;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
  created_at?: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  quantity: number;
  notes: string | null;
  price_at_order: number;
  menu_item?: MenuItem;
}

export interface Order {
  id: string;
  table_id: string;
  status: OrderStatus;
  total: number;
  cancelled_by?: 'customer' | 'staff' | string | null;
  is_dismissed?: boolean;
  created_at: string;
  updated_at: string;
  table?: TableRow;
  order_items?: OrderItem[];
}

export interface StaffUser {
  id: string;
  email: string;
  full_name?: string | null;
  role: StaffRole;
  must_change_password?: boolean;
  created_at: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export interface MenuImportBatch {
  id: string;
  uploaded_by: string | null;
  source_image_url: string | null;
  status: ImportBatchStatus;
  created_at: string;
}

export interface MenuImportItem {
  id: string;
  batch_id: string;
  category_name: string;
  item_name: string;
  description: string | null;
  price: number;
  confidence_flag: string | null;
  created_at?: string;
}
