import { Order } from '@/lib/types/database.types';

/**
 * Safely extracts the table number from an Order object across all possible shapes:
 * - Single object: order.table = { table_number: 5 }
 * - Array: order.table = [{ table_number: 5 }]  (rare Supabase edge case)
 * - Top-level flat: (order as any).table_number = 5  (old RPC migration 020)
 */
export function extractTableNumber(order?: Order | null): number | null {
  if (!order) return null;

  // 1. Nested single table object (standard Supabase join shape)
  if (order.table && !Array.isArray(order.table) && typeof order.table === 'object') {
    const n = (order.table as any).table_number;
    if (n !== undefined && n !== null) return Number(n);
  }

  // 2. Array table property (edge case: Supabase PostgREST sometimes wraps in array)
  if (Array.isArray(order.table) && (order.table as any[]).length > 0) {
    const n = ((order.table as any[])[0] as any)?.table_number;
    if (n !== undefined && n !== null) return Number(n);
  }

  // 3. Top-level table_number (flat RPC shape from migration 020)
  const topLevel = (order as any).table_number;
  if (topLevel !== undefined && topLevel !== null) return Number(topLevel);

  return null;
}

/**
 * Returns true if the order is a takeaway / counter order.
 * Takeaway orders are identified by:
 * - No table_id (counter/phone order)
 * - table_number is 0 or 999 (sentinel values used by admin place-order)
 * - Order items contain [Takeaway] note tag
 */
export function isTakeawayOrder(order?: Order | null): boolean {
  if (!order) return false;

  const tableNum = extractTableNumber(order);

  if (tableNum === 0 || tableNum === 999) return true;

  if (!order.table_id && !tableNum) {
    // Only call it takeaway if there's an explicit [Takeaway] note OR no table at all
    if (order.order_items?.some((i) => i.notes?.includes('[Takeaway]'))) return true;
    // Has a table_id but no resolved table — not takeaway, just RLS issue
    return !order.table_id;
  }

  return false;
}

/**
 * Formats the table number/label for display across customer & staff components.
 * Handles Table #, Takeaway/Counter, and fallback states.
 */
export function formatTableLabel(order?: Order | null): string {
  if (!order) return 'Table N/A';

  // If there is a table_id and we can extract a valid table number, always show it
  const tableNum = extractTableNumber(order);

  if (tableNum !== null) {
    if (tableNum === 0 || tableNum === 999) return 'Takeaway / Counter';
    return `Table ${tableNum}`;
  }

  // No table resolved — check for explicit takeaway signals
  if (isTakeawayOrder(order)) return 'Takeaway / Counter';

  // Has a table_id but table data hasn't loaded yet (RLS / timing issue)
  if (order.table_id) return 'Table #';

  return 'Counter / Takeaway';
}
