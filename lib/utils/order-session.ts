/**
 * Utility functions for table-scoped persistent customer order session management in localStorage.
 * Enables customers to browse the menu after placing an order while tracking their active orders.
 */

const getStorageKey = (tableToken: string): string => {
  return `orderezz_orders_${tableToken}`;
};

/**
 * Saves a newly placed order ID to localStorage scoped under the table's QR token.
 */
export function saveOrderToLocalStorage(tableToken: string, orderId: string): void {
  if (!tableToken || !orderId || typeof window === 'undefined') return;

  try {
    const key = getStorageKey(tableToken);
    const raw = localStorage.getItem(key);
    const existingIds: string[] = raw ? JSON.parse(raw) : [];

    // Filter out duplicates and prepend new orderId to top
    const updated = [orderId, ...existingIds.filter((id) => id !== orderId)];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving order ID to localStorage:', err);
  }
}

/**
 * Retrieves all stored order IDs for a specific table QR token.
 */
export function getActiveOrderIdsForTable(tableToken: string): string[] {
  if (!tableToken || typeof window === 'undefined') return [];

  try {
    const key = getStorageKey(tableToken);
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading order IDs from localStorage:', err);
    return [];
  }
}

/**
 * Removes an order ID from a table's stored order list (used when an order reaches 'paid' or 'cancelled').
 */
export function removeOrderFromLocalStorage(tableToken: string, orderId: string): void {
  if (!tableToken || !orderId || typeof window === 'undefined') return;

  try {
    const key = getStorageKey(tableToken);
    const raw = localStorage.getItem(key);
    if (!raw) return;

    const existingIds: string[] = JSON.parse(raw);
    const updated = existingIds.filter((id) => id !== orderId);

    if (updated.length > 0) {
      localStorage.setItem(key, JSON.stringify(updated));
    } else {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.error('Error removing order ID from localStorage:', err);
  }
}
