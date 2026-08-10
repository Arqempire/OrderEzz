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
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

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
    .or(`status.in.(received,preparing,ready,served,cancelled),and(status.eq.paid,created_at.gte.${startOfToday.toISOString()})`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching active orders:', error);
    return [];
  }

  return (data || []) as Order[];
}

/**
 * Fetches the most recent order placed for a specific table.
 */
export async function fetchLatestOrderForTable(tableId: string): Promise<Order | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      table:tables(id, table_number, qr_token),
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
    .eq('table_id', tableId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching latest order for table:', error);
    return null;
  }

  return (data as Order) || null;
}

/**
 * Advances or updates an order's status (Staff action).
 * Calls server API route first; if that fails, falls back to RPC and direct client update.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  cancelledBy?: 'customer' | 'staff'
): Promise<boolean> {
  // 1. Try server API route first (uses staff auth session + admin fallback)
  try {
    const response = await fetch('/api/staff/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, newStatus, cancelledBy }),
    });

    const resData = await response.json();
    if (response.ok && resData.success) {
      return true;
    }
    console.warn('API route update-status failed, trying direct RPC/client update:', resData?.error);
  } catch (apiErr) {
    console.warn('Network error calling update-status API route:', apiErr);
  }

  // 2. Fallback: direct browser Supabase client (RPC or table update)
  const supabase = createClient();
  try {
    const { data: rpcSuccess, error: rpcErr } = await supabase.rpc('update_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_cancelled_by: newStatus === 'cancelled' ? (cancelledBy || 'staff') : null,
    });

    if (!rpcErr && rpcSuccess !== false) {
      return true;
    }
  } catch (rpcErr) {
    console.warn('Direct RPC update_order_status failed, falling back to direct table update:', rpcErr);
  }

  // 3. Fallback: direct table update
  const payload: { status: OrderStatus; cancelled_by?: string } = { status: newStatus };
  if (newStatus === 'cancelled') {
    payload.cancelled_by = cancelledBy || 'staff';
  }

  let { error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', orderId);

  if (error && payload.cancelled_by && (error.code === 'PGRST204' || error.message?.includes('cancelled_by'))) {
    const { error: fallbackError } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    error = fallbackError;
  }

  if (error) {
    console.error('Error updating order status:', error);
    return false;
  }

  return true;
}

/**
 * Cancels a customer order securely via RPC if status is still 'received'.
 * Explicitly ensures cancelled_by is recorded as 'customer'.
 */
export async function cancelCustomerOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  let { error } = await supabase.rpc('cancel_customer_order', {
    p_order_id: orderId,
  });

  if (error) {
    console.warn('RPC cancel_customer_order failed, trying direct table update:', error.message);
    const { error: directError } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_by: 'customer' })
      .eq('id', orderId)
      .eq('status', 'received');

    if (directError) {
      console.error('Error cancelling customer order via direct update:', directError);
      return { success: false, error: directError.message || 'Failed to cancel order' };
    }
  } else {
    // Explicitly update cancelled_by to 'customer' to guarantee attribution
    try {
      await supabase
        .from('orders')
        .update({ cancelled_by: 'customer' })
        .eq('id', orderId);
    } catch (updateErr) {
      console.warn('Notice: could not set cancelled_by to customer:', updateErr);
    }
  }

  return { success: true };
}
