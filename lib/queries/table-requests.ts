import { createClient } from '@/lib/supabase/client';
import { TableRequest, RequestType, RequestStatus } from '@/lib/types/table-request.types';

/**
 * Creates a new table quick request ('waiter' or 'water') in Supabase.
 */
export async function createTableRequest(
  tableId: string,
  type: RequestType
): Promise<TableRequest | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('table_requests')
    .insert([
      {
        table_id: tableId,
        type,
        status: 'pending',
      },
    ])
    .select('*, table:tables(*)')
    .single();

  if (error) {
    console.error('Error creating table request in Supabase:', error);
    return null;
  }

  return data as TableRequest;
}

/**
 * Fetches all pending and acknowledged table requests sorted by longest-waiting first (created_at ASC).
 */
export async function fetchPendingTableRequests(): Promise<TableRequest[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('table_requests')
    .select('*, table:tables(*)')
    .in('status', ['pending', 'acknowledged'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending table requests:', error);
    return [];
  }

  return (data || []) as TableRequest[];
}

/**
 * Updates the status of a table request ('acknowledged' or 'resolved').
 */
export async function updateTableRequestStatus(
  requestId: string,
  status: RequestStatus
): Promise<boolean> {
  const supabase = createClient();

  const payload: { status: RequestStatus; resolved_at?: string } = { status };
  if (status === 'resolved') {
    payload.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('table_requests')
    .update(payload)
    .eq('id', requestId);

  if (error) {
    console.error('Error updating table request status:', error);
    return false;
  }

  return true;
}
