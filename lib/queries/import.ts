import { createClient } from '@/lib/supabase/client';
import { MenuImportBatch, MenuImportItem } from '@/lib/types/database.types';

/**
 * Fetches an import batch by ID.
 */
export async function fetchImportBatch(batchId: string): Promise<MenuImportBatch | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_import_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (error) {
    console.error('Error fetching import batch:', error);
    return null;
  }

  return data;
}

/**
 * Fetches all staging items for a given import batch.
 */
export async function fetchImportBatchItems(batchId: string): Promise<MenuImportItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_import_items')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching import batch items:', error);
    return [];
  }

  return data || [];
}

/**
 * Confirms an import batch and publishes items to the live menu via RPC function.
 */
export async function confirmImportBatch(
  batchId: string,
  items: Array<{ category_name: string; item_name: string; description: string | null; price: number }>
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('confirm_menu_import_batch', {
    p_batch_id: batchId,
    p_items: items,
  });

  if (error) {
    console.error('Error confirming import batch:', error);
    return false;
  }

  return true;
}

/**
 * Discards an import batch and removes its staging items.
 */
export async function discardImportBatch(batchId: string): Promise<boolean> {
  const supabase = createClient();

  const { error: batchError } = await supabase
    .from('menu_import_batches')
    .update({ status: 'discarded' })
    .eq('id', batchId);

  if (batchError) {
    console.error('Error discarding import batch:', batchError);
    return false;
  }

  return true;
}
