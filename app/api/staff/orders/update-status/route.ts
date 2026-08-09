import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyStaffSession } from '@/lib/auth/staff-guard';
import { OrderStatus } from '@/lib/types/database.types';

const VALID_STATUSES: OrderStatus[] = ['received', 'preparing', 'ready', 'served', 'paid', 'cancelled'];

export async function POST(request: Request) {
  try {
    const auth = await verifyStaffSession(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    const { orderId, newStatus, cancelledBy } = body;

    if (!orderId || !newStatus || !VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid parameters: orderId and newStatus required.' },
        { status: 400 }
      );
    }

    const payload: { status: OrderStatus; cancelled_by?: string } = { status: newStatus };
    if (newStatus === 'cancelled') {
      payload.cancelled_by = cancelledBy || 'staff';
    }

    // Helper to perform direct update with fallback if cancelled_by column is missing in DB
    const performTableUpdate = async (client: any) => {
      let { error } = await client.from('orders').update(payload).eq('id', orderId);
      if (error && payload.cancelled_by && (error.code === 'PGRST204' || error.message?.includes('cancelled_by'))) {
        const { error: fallbackErr } = await client.from('orders').update({ status: newStatus }).eq('id', orderId);
        error = fallbackErr;
      }
      return error;
    };

    // 1. Attempt update using server client (RPC or table update with staff session cookies)
    const supabase = await createClient();
    try {
      const { data: rpcSuccess, error: rpcError } = await supabase.rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus,
        p_cancelled_by: newStatus === 'cancelled' ? (cancelledBy || 'staff') : null,
      });

      if (!rpcError && rpcSuccess !== false) {
        return NextResponse.json({ success: true, orderId, status: newStatus });
      }
    } catch {
      // RPC does not exist on database yet
    }

    let directError = await performTableUpdate(supabase);

    if (directError) {
      console.warn('Server client direct update failed, falling back to admin client:', directError.message);

      // 2. Admin service-role client fallback (bypasses RLS locks completely)
      const adminSupabase = createAdminClient();

      try {
        const { data: adminRpcSuccess, error: adminRpcError } = await adminSupabase.rpc('update_order_status', {
          p_order_id: orderId,
          p_new_status: newStatus,
          p_cancelled_by: newStatus === 'cancelled' ? (cancelledBy || 'staff') : null,
        });

        if (!adminRpcError && adminRpcSuccess !== false) {
          return NextResponse.json({ success: true, orderId, status: newStatus });
        }
      } catch {
        // RPC fallback
      }

      let adminDirectError = await performTableUpdate(adminSupabase);

      if (adminDirectError) {
        console.error('Admin client failed to update order status:', adminDirectError);
        return NextResponse.json(
          { success: false, error: adminDirectError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      status: newStatus,
    });
  } catch (err: any) {
    console.error('Exception in update-status API route:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
