import { Order } from '@/lib/types/database.types';

export interface ExtractedGuestInfo {
  name?: string;
  phone?: string;
}

/**
 * Extracts guest name and phone number from order items notes.
 */
export function extractGuestInfoFromOrder(order: Order): ExtractedGuestInfo {
  if (!order || !order.order_items) return {};

  for (const item of order.order_items) {
    if (item.notes && item.notes.includes('[Guest:')) {
      const match = item.notes.match(/\[Guest:\s*([^|\]]+)(?:\|\s*Phone:\s*([^\]]+))?\]/);
      if (match) {
        return {
          name: match[1]?.trim(),
          phone: match[2]?.trim(),
        };
      }
    }
  }

  return {};
}

/**
 * Extracts guest info from a list of grouped orders for a table session.
 */
export function extractGuestInfoFromTableOrders(orders: Order[]): ExtractedGuestInfo {
  if (!orders || orders.length === 0) return {};

  for (const order of orders) {
    const info = extractGuestInfoFromOrder(order);
    if (info.name || info.phone) return info;
  }

  return {};
}

/**
 * Cleans item notes for display by removing internal [Guest: ...] and [Takeaway] tags.
 */
export function formatCleanItemNotes(notes: string | null | undefined): string {
  if (!notes) return '';
  return notes
    .replace(/\[Guest:\s*[^|\]]+(?:\|\s*Phone:\s*[^\]]+)?\]/g, '')
    .replace(/\[Takeaway\]/g, '')
    .replace(/^\|+|\|+$/g, '')
    .trim();
}
