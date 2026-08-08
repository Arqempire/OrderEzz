import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface StaffAuthResult {
  authorized: boolean;
  user?: any;
  role?: string;
  error?: string;
  status?: number;
}

/**
 * Server-side guard function for API route handlers under /api/staff/*.
 * Verifies Supabase authentication token and confirms the user has a row
 * in public.staff_users (any role — staff or admin). This is a second,
 * route-level layer of defense on top of the middleware check, so a staff
 * route is never reachable purely because middleware was skipped or
 * misconfigured for a given runtime.
 */
export async function verifyStaffSession(request: Request): Promise<StaffAuthResult> {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        authorized: false,
        status: 401,
        error: 'Unauthorized: Authentication required.',
      };
    }

    // Fetch the user's staff_users row using the admin client to bypass RLS
    const adminSupabase = createAdminClient();
    const { data: staffUser, error: staffError } = await adminSupabase
      .from('staff_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (staffError || !staffUser) {
      return {
        authorized: false,
        status: 403,
        error: 'Forbidden: Staff profile not found.',
      };
    }

    return {
      authorized: true,
      user,
      role: staffUser.role,
    };
  } catch (err: any) {
    console.error('Exception in verifyStaffSession:', err);
    return {
      authorized: false,
      status: 500,
      error: err.message || 'Internal server error verifying authorization.',
    };
  }
}
