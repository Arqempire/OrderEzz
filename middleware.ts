import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Process /admin and /staff pages, and their /api counterparts
  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');
  const isStaffPage = pathname.startsWith('/staff');
  const isStaffApi = pathname.startsWith('/api/staff');

  if (!isAdminPage && !isAdminApi && !isStaffPage && !isStaffApi) {
    return NextResponse.next();
  }

  // 2. Allow access to the login pages themselves without redirect loops
  const isAdminLoginPage = pathname === '/admin/login';
  const isStaffLoginPage = pathname === '/staff/login';

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. Authenticate Supabase user
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  let isStaff = false;
  if (user) {
    // Query staff_users table to check role
    const { data: staffUser } = await supabase
      .from('staff_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (staffUser) {
      isStaff = true;
      isAdmin = staffUser.role === 'admin';
    }
  }

  // 4. Handle the login pages when already logged in
  if (isAdminLoginPage) {
    if (isAdmin) {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/admin/analytics';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return response;
  }
  if (isStaffLoginPage) {
    if (isStaff) {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/staff/orders';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return response;
  }

  // 5. Admin routes require the admin role; staff routes require any staff_users row.
  const requiresAdmin = isAdminPage || isAdminApi;
  const isAuthorized = requiresAdmin ? isAdmin : isStaff;

  if (!user || !isAuthorized) {
    if (isAdminApi || isStaffApi) {
      return NextResponse.json(
        {
          success: false,
          error: !user
            ? 'Unauthorized: Authentication required.'
            : `Forbidden: ${requiresAdmin ? 'Admin' : 'Staff'} privileges required.`,
        },
        { status: !user ? 401 : 403 }
      );
    }

    // Page request -> redirect to the matching login page with return-to path
    const returnUrl = encodeURIComponent(pathname + search);
    const loginPath = requiresAdmin ? '/admin/login' : '/staff/login';
    const loginUrl = new URL(`${loginPath}?redirectTo=${returnUrl}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/staff/:path*',
    '/api/staff/:path*',
  ],
};
