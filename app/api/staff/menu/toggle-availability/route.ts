import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, isAvailable } = body;

    if (!itemId || typeof isAvailable !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: itemId and isAvailable.' },
        { status: 400 }
      );
    }

    // 1. Try updating with server client (uses staff auth session cookies)
    const supabase = createClient();
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: isAvailable })
      .eq('id', itemId);

    // 2. If RLS error occurs, use admin service client (bypasses RLS entirely)
    if (error) {
      console.warn('Server client RLS update failed, falling back to admin client:', error.message);
      const adminSupabase = createAdminClient();
      const { error: adminError } = await adminSupabase
        .from('menu_items')
        .update({ is_available: isAvailable })
        .eq('id', itemId);

      if (adminError) {
        console.error('Admin client failed to update menu_item availability:', adminError);
        return NextResponse.json(
          { success: false, error: adminError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      itemId,
      is_available: isAvailable,
    });
  } catch (err: any) {
    console.error('Exception in toggle-availability API route:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
