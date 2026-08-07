import { NextResponse } from 'next/server';
import { fetchAnalyticsData, getDateRangeBounds } from '@/lib/queries/analytics';
import { verifyAdminSession } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Server-side auth & role verification
  const auth = await verifyAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status || 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const rangePreset = (searchParams.get('range') || 'today') as 'today' | 'week' | 'month' | 'custom';
    const customStart = searchParams.get('start') || undefined;
    const customEnd = searchParams.get('end') || undefined;

    const { startDate, endDate } = getDateRangeBounds(rangePreset, customStart, customEnd);
    const analyticsPayload = await fetchAnalyticsData(startDate, endDate);

    return NextResponse.json({
      success: true,
      range: rangePreset,
      bounds: { startDate, endDate },
      data: analyticsPayload,
    });
  } catch (error: any) {
    console.error('Error fetching analytics endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
