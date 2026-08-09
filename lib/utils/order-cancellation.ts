const CUSTOMER_CANCELLED_KEY = 'orderezz_customer_cancelled_orders';
const STAFF_CANCELLED_KEY = 'orderezz_staff_cancelled_orders';

/**
 * Stores an order ID in localStorage as cancelled by customer.
 */
export function markOrderCancelledByCustomer(orderId: string) {
  if (typeof window === 'undefined' || !orderId) return;
  try {
    const raw = localStorage.getItem(CUSTOMER_CANCELLED_KEY);
    const set = raw ? new Set(JSON.parse(raw)) : new Set();
    set.add(orderId);
    localStorage.setItem(CUSTOMER_CANCELLED_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Error saving customer cancelled order:', e);
  }
}

/**
 * Stores an order ID in localStorage as cancelled by staff.
 */
export function markOrderCancelledByStaff(orderId: string) {
  if (typeof window === 'undefined' || !orderId) return;
  try {
    const raw = localStorage.getItem(STAFF_CANCELLED_KEY);
    const set = raw ? new Set(JSON.parse(raw)) : new Set();
    set.add(orderId);
    localStorage.setItem(STAFF_CANCELLED_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Error saving staff cancelled order:', e);
  }
}

/**
 * Determines whether an order was cancelled by customer or staff.
 * Checks database column first, then local storage cache.
 */
export function getOrderCancellationSource(
  orderId: string,
  dbCancelledBy?: string | null
): 'customer' | 'staff' | 'unknown' {
  if (dbCancelledBy) {
    const lower = dbCancelledBy.toLowerCase();
    if (lower === 'customer') return 'customer';
    if (lower === 'staff') return 'staff';
  }

  if (typeof window === 'undefined' || !orderId) return 'unknown';

  try {
    const customerRaw = localStorage.getItem(CUSTOMER_CANCELLED_KEY);
    if (customerRaw) {
      const set = new Set(JSON.parse(customerRaw));
      if (set.has(orderId)) return 'customer';
    }

    const staffRaw = localStorage.getItem(STAFF_CANCELLED_KEY);
    if (staffRaw) {
      const set = new Set(JSON.parse(staffRaw));
      if (set.has(orderId)) return 'staff';
    }
  } catch (e) {
    console.error('Error reading cancellation source:', e);
  }

  return 'unknown';
}
