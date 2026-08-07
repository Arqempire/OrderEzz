import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and staff role are required.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // 1. Create user via Supabase Auth Admin API (bypasses public signup & auto-confirms email)
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role,
      },
    });

    if (authError) {
      console.error('Supabase auth.admin.createUser error:', authError);
      return NextResponse.json(
        { error: `Supabase Auth Error: ${authError.message}` },
        { status: 400 }
      );
    }

    const newUserId = authData.user.id;

    const staffProfile = {
      id: newUserId,
      email,
      full_name: fullName || email.split('@')[0],
      role: role || 'kitchen',
      must_change_password: true,
      created_at: new Date().toISOString(),
    };

    // 2. Insert profile record into public.staff_users table in Supabase
    const { error: profileError } = await adminSupabase
      .from('staff_users')
      .upsert([staffProfile]);

    if (profileError) {
      console.error('Supabase staff_users insert error:', profileError);
      return NextResponse.json(
        { error: `Supabase Database Error: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: staffProfile,
    });
  } catch (error: any) {
    console.error('Error creating staff account:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
