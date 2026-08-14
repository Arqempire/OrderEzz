import { createClient } from '@/lib/supabase/client';
import { CustomerFeedback } from '@/lib/types/feedback.types';

/**
 * Saves a customer feedback entry to Supabase DB.
 */
export async function saveCustomerFeedback(
  orderId: string | null,
  tableNumber: number | null,
  rating: number,
  tags: string[],
  note: string | null
): Promise<boolean> {
  const supabase = createClient();
  const payload = {
    order_id: orderId,
    table_number: tableNumber,
    rating,
    tags,
    note: note || null,
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from('customer_feedbacks').insert([payload]);
    if (!error) return true;
    console.warn('Supabase feedback insert error:', error.message);
  } catch (err) {
    console.error('Error saving feedback to DB:', err);
  }

  // Fallback to localStorage
  try {
    const stored: CustomerFeedback[] = JSON.parse(localStorage.getItem('orderezz_customer_feedbacks') || '[]');
    const newEntry: CustomerFeedback = {
      id: `fb-${Date.now()}`,
      ...payload,
    };
    localStorage.setItem('orderezz_customer_feedbacks', JSON.stringify([newEntry, ...stored]));
  } catch (e) {}

  return true;
}

/**
 * Fetches all customer feedbacks for Admin & Hotel Staff Dashboard.
 */
export async function fetchAllCustomerFeedbacks(): Promise<CustomerFeedback[]> {
  const supabase = createClient();
  let dbFeedbacks: CustomerFeedback[] = [];

  try {
    const { data, error } = await supabase
      .from('customer_feedbacks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      dbFeedbacks = data as CustomerFeedback[];
    }
  } catch (err) {
    console.error('Error fetching feedbacks from Supabase:', err);
  }

  // Merge local storage feedbacks if present
  try {
    const stored: CustomerFeedback[] = JSON.parse(localStorage.getItem('orderezz_customer_feedbacks') || '[]');
    if (stored.length > 0) {
      const existingIds = new Set(dbFeedbacks.map((f) => f.id).filter(Boolean));
      for (const item of stored) {
        if (item.id && !existingIds.has(item.id)) {
          dbFeedbacks.push(item);
        }
      }
    }
  } catch (e) {}

  // Ensure every item has a unique id if missing
  const sanitized = dbFeedbacks.map((item, index) => ({
    ...item,
    id: item.id || `fb-${item.created_at || 'entry'}-${index}`,
  }));

  // Return sorted descending
  return sanitized.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
