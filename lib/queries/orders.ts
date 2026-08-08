import { createClient } from '@/lib/supabase/client';
import { Order, OrderStatus } from '@/lib/types/database.types';

/**
 * Places an order securely via the RPC function which recalculates prices server-side.
 */
export async function placeCustomerOrder(
  tableId: string,
  items: Array<{ menuItemId: string; quantity: number; notes?: string }>
): Promise<string | null> {
  const supabase = createClient();

  const formattedItems = items.map((item) => ({
    menu_item_id: item.menuItemId,
    quantity: item.quantity,
    notes: item.notes || '',
  }));

  const { data, error } = await supabase.rpc('place_order_with_items', {
    p_table_id: tableId,
    p_items: formattedItems,
  });

  if (error) {
    console.error('Error placing order:', error);
    return null;
  }

  return data;
}

/**
 * Fetches order details for the customer live status page via a scoped RPC
 * (get_order_status) that returns only the single requested order — direct
 * table SELECT on `orders`/`order_items` is staff-only, since it would
 * otherwise let any anon request list every order in the restaurant.
 */
export async function fetchOrderDetailsById(orderId: string): Promise<Order | null> {
  const supabase = createClient();

  // 1. Try RPC get_order_status first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_order_status', {
      p_order_id: orderId,
    });

    if (!rpcError && rpcData && typeof rpcData === 'object' && (rpcData as any).id) {
      return rpcData as Order;
    }
  } catch (err) {
    console.warn('RPC get_order_status failed, trying direct select fallback:', err);
  }

  // 2. Fallback direct table select
  const { data: directData, error: directError } = await supabase
    .from('orders')
    .select(`
      *,
      table:tables(*),
      order_items(
        *,
        menu_item:menu_items(*)
      )
    `)
    .eq('id', orderId)
    .single();

  if (directError) {
    console.error('Error fetching order details via direct select:', directError);
    return null;
  }

  return directData as Order;
}

/**
 * Fetches all active orders for the Staff Kanban Dashboard.
 */
export async function fetchAllActiveOrders(): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      table:tables(id, table_number),
      order_items(
        id,
        order_id,
        menu_item_id,
        quantity,
        notes,
        price_at_order,
        menu_item:menu_items(name, image_url)
      )
    `)
    .in('status', ['received', 'preparing', 'ready', 'served'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching active orders:', error);
    return [];
  }

  return (data || []) as Order[];
}

/**
 * Advances or updates an order's status (Staff action).
 */
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order status:', error);
    return false;
  }

  return true;
}
