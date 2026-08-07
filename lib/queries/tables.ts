import { createClient } from '@/lib/supabase/client';
import { TableRow } from '@/lib/types/database.types';

/**
 * Resolves a table ID from a QR token via the secure Supabase RPC function.
 */
export async function resolveTableFromQrToken(qrToken: string): Promise<{ table_id: string; is_active: boolean } | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('resolve_table_from_qr_token', {
    p_qr_token: qrToken,
  });

  if (error || !data || data.length === 0) {
    console.error('Error resolving table from QR token via Supabase:', error);
    return null;
  }

  return data[0];
}

/**
 * Fetches all tables directly from Supabase DB.
 */
export async function fetchAllTables(): Promise<TableRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .order('table_number', { ascending: true });

  if (error) {
    console.error('Error fetching tables from Supabase:', error);
    return [];
  }

  return data || [];
}

/**
 * Regenerates QR token for a table via Supabase RPC.
 */
export async function regenerateTableQrToken(tableId: string): Promise<string | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('regenerate_qr_token', {
    p_table_id: tableId,
  });

  if (error) {
    console.error('Error regenerating QR token via Supabase:', error);
    return null;
  }

  return data;
}

/**
 * Creates a new restaurant table directly in Supabase DB.
 */
export async function createNewTable(tableNumber: number): Promise<TableRow | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('tables')
    .insert([{ table_number: tableNumber, is_active: true }])
    .select()
    .single();

  if (error) {
    console.error('Error creating table in Supabase:', error);
    return null;
  }

  return data;
}

/**
 * Toggles a table's active state in Supabase DB.
 */
export async function toggleTableActiveState(tableId: string, isActive: boolean): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('tables')
    .update({ is_active: isActive })
    .eq('id', tableId);

  if (error) {
    console.error('Error toggling table status in Supabase:', error);
    return false;
  }

  return true;
}
