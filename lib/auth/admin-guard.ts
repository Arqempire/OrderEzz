import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AdminAuthResult {
  authorized: boolean;
  user?: any;
  role?: string;
  error?: string;
  status?: number;
}

/**
 * Server-side guard function for API route handlers under /api/admin/*.
 * Verifies Supabase authentication token and enforces 'admin' role from public.staff_users.
 */
export async function verifyAdminSession(request: Request): Promise<AdminAuthResult> {
  try {
    const supabase = await createServerClient();
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    // If cookie user is null, fallback to checking Authorization Bearer token header
    if (!user) {
      const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        if (token) {
          const { data: tokenUserData, error: tokenError } = await supabase.auth.getUser(token);
          if (tokenUserData?.user && !tokenError) {
            user = tokenUserData.user;
            authError = null;
          }
        }
      }
    }

    if (authError || !user) {
      return {
        authorized: false,
        status: 401,
        error: 'Unauthorized: Authentication required.',
      };
    }

    // Fetch user's role from staff_users table using admin client to bypass RLS
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

    if (staffUser.role !== 'admin') {
      return {
        authorized: false,
        status: 403,
        error: 'Forbidden: Admin role required.',
      };
    }

    return {
      authorized: true,
      user,
      role: staffUser.role,
    };
  } catch (err: any) {
    console.error('Exception in verifyAdminSession:', err);
    return {
      authorized: false,
      status: 500,
      error: err.message || 'Internal server error verifying authorization.',
    };
  }
}
