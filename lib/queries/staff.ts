import { createClient } from '@/lib/supabase/client';
import { StaffUser } from '@/lib/types/database.types';

/**
 * Fetches staff profile directly from Supabase DB by auth user ID.
 */
export async function fetchStaffProfile(userId: string): Promise<StaffUser | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('staff_users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching staff profile from Supabase:', error);
    return null;
  }

  return data as StaffUser;
}

/**
 * Updates must_change_password flag for a staff profile in Supabase & local storage.
 */
export async function updateMustChangePasswordFlag(userId: string, mustChange: boolean): Promise<boolean> {
  const supabase = createClient();

  // Mark local storage so browser remembers password change state
  if (!mustChange) {
    try {
      localStorage.setItem(`orderezz_pwd_changed_${userId}`, 'true');
    } catch (e) {}
  }
  
  // 1. Try updating via Security Definer RPC
  try {
    const { error: rpcErr } = await supabase.rpc('update_staff_must_change_password', {
      p_user_id: userId,
      p_must_change: mustChange,
    });
    if (!rpcErr) return true;
  } catch (e) {}

  // 2. Direct table update fallback
  const { error } = await supabase
    .from('staff_users')
    .update({ must_change_password: mustChange })
    .eq('id', userId);

  if (error) {
    console.error('Error updating must_change_password flag in Supabase:', error);
    return false;
  }

  return true;
}

/**
 * Fetches all staff users directly from Supabase public.staff_users table or via get_all_staff_users RPC.
 */
export async function fetchAllStaffUsers(): Promise<{ data: StaffUser[]; error: string | null }> {
  const supabase = createClient();

  // 1. Try fetching via security definer RPC (bypasses RLS filtering)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_staff_users');
    if (!rpcError && rpcData) {
      return { data: rpcData as StaffUser[], error: null };
    }
  } catch (e) {}

  // 2. Direct table fetch fallback
  const { data, error } = await supabase
    .from('staff_users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching staff users from Supabase:', error);
    return { data: [], error: error.message };
  }

  return { data: (data || []) as StaffUser[], error: null };
}
