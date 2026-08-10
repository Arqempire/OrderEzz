import { createClient } from '@/lib/supabase/client';
import { Order } from '@/lib/types/database.types';

const DISMISSED_ORDERS_KEY = 'orderezz_cashier_dismissed_orders';

export function getDismissedOrderIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_ORDERS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveDismissedOrderId(orderId: string) {
  if (typeof window === 'undefined') return;
  try {
    const set = getDismissedOrderIds();
    set.add(orderId);
    localStorage.setItem(DISMISSED_ORDERS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Error saving dismissed order id:', e);
  }
}

/**
 * Gets or creates the dedicated Takeaway Counter Table (table_number: 0 or 999).
 */
async function getOrCreateTakeawayTableId(): Promise<string | null> {
  const supabase = createClient();

  try {
    const { data: existing } = await supabase
      .from('tables')
      .select('id')
      .in('table_number', [0, 999])
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return existing.id;
    }

    const { data: created, error } = await supabase
      .from('tables')
      .insert({
        table_number: 999,
        is_active: true,
      })
      .select('id')
      .maybeSingle();

    if (!error && created?.id) {
      return created.id;
    }
  } catch (err) {
    console.error('Error getting/creating takeaway table:', err);
  }

  return null;
}

/**
 * Creates a Takeaway / Walk-in order directly from the Cashier Panel POS.
 */
export async function createTakeawayOrder(
  items: Array<{ menuItemId: string; quantity: number; notes?: string }>,
  settleImmediately: boolean = false
): Promise<{ orderId: string | null; error: string | null }> {
  const supabase = createClient();

  const formattedItems = items.map((item, index) => {
    const itemNotes = item.notes?.trim() || '';
    const takeawayTag = index === 0 ? '[Takeaway]' : '';
    const combinedNotes = [itemNotes, takeawayTag].filter(Boolean).join(' | ');

    return {
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      notes: combinedNotes,
    };
  });

  // Get dedicated Takeaway table ID (table_number: 0) to prevent fallback to active dine-in tables
  const takeawayTableId = await getOrCreateTakeawayTableId();

  const { data: orderId, error: rpcError } = await supabase.rpc('place_order_with_items', {
    p_table_id: takeawayTableId,
    p_items: formattedItems,
  });

  if (rpcError || !orderId) {
    console.error('Error placing takeaway order:', rpcError);
    return { orderId: null, error: rpcError?.message || 'Failed to place takeaway order' };
  }

  if (settleImmediately) {
    const paidSuccess = await markOrderAsPaid(orderId);
    if (!paidSuccess) {
      console.error('Failed to mark takeaway order as paid:', orderId);
    }
  }

  return { orderId, error: null };
}

/**
 * Fetches all orders currently served and awaiting cash/payment settlement.
 */
export async function fetchOrdersAwaitingPayment(): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      table:tables(id, table_number),
      order_items(
        id,
        quantity,
        notes,
        price_at_order,
        menu_item:menu_items(name)
      )
    `)
    .in('status', ['received', 'preparing', 'ready', 'served', 'cancelled'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching orders awaiting payment:', error);
    return [];
  }

  const dismissedSet = getDismissedOrderIds();

  const filtered = (data || []).filter((order) => {
    if (order.is_dismissed) return false;
    if (order.status === 'cancelled' && dismissedSet.has(order.id)) return false;
    return true;
  });

  return filtered as Order[];
}

/**
 * Marks a cancelled order as dismissed/cleared by the cashier queue.
 */
export async function dismissCancelledOrder(orderId: string): Promise<boolean> {
  saveDismissedOrderId(orderId);
  const supabase = createClient();
  try {
    await supabase.from('orders').update({ is_dismissed: true }).eq('id', orderId);
  } catch {
    // Graceful fallback if is_dismissed column doesn't exist yet
  }
  return true;
}

/**
 * Marks an order as paid (settled at counter).
 */
export async function markOrderAsPaid(orderId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', orderId);

  if (error) {
    console.error('Error marking order as paid:', error);
    return false;
  }

  return true;
}

/**
 * Calculates today's cashier summary (total collected ₹ and count of paid orders today).
 */
export async function fetchTodaysCashierSummary(): Promise<{
  totalCollected: number;
  paidOrderCount: number;
}> {
  const supabase = createClient();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('orders')
    .select('total')
    .eq('status', 'paid')
    .gte('updated_at', startOfToday.toISOString());

  if (error) {
    console.error("Error fetching today's cashier summary:", error);
    return { totalCollected: 0, paidOrderCount: 0 };
  }

  const paidOrderCount = data?.length || 0;
  const totalCollected = (data || []).reduce(
    (sum, order) => sum + (Number(order.total) || 0),
    0
  );

  return { totalCollected, paidOrderCount };
}

/**
 * Fetches all orders marked as paid today for cashier history & bill re-printing.
 */
export async function fetchTodaysPaidOrders(): Promise<Order[]> {
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
        quantity,
        notes,
        price_at_order,
        menu_item:menu_items(name)
      )
    `)
    .in('status', ['paid', 'cancelled'])
    .gte('updated_at', startOfToday.toISOString())
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching today paid orders:', error);
    return [];
  }

  return (data || []) as Order[];
}
