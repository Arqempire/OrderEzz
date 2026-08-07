import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Only process /admin routes and /api/admin routes
  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  // 2. Allow access to /admin/login page without redirect loops
  const isAdminLoginPage = pathname === '/admin/login';

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
  if (user) {
    // Query staff_users table to check role
    const { data: staffUser } = await supabase
      .from('staff_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (staffUser?.role === 'admin') {
      isAdmin = true;
    }
  }

  // 4. Handle /admin/login page when already logged in as Admin
  if (isAdminLoginPage) {
    if (isAdmin) {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/admin/analytics';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return response;
  }

  // 5. If not authenticated or not admin:
  if (!user || !isAdmin) {
    if (isAdminApi) {
      return NextResponse.json(
        {
          success: false,
          error: !user
            ? 'Unauthorized: Authentication required.'
            : 'Forbidden: Admin privileges required.',
        },
        { status: !user ? 401 : 403 }
      );
    }

    // Page request -> Redirect to /admin/login with return-to path
    const returnUrl = encodeURIComponent(pathname + search);
    const loginUrl = new URL(`/admin/login?redirectTo=${returnUrl}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
