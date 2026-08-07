import { NextResponse } from 'next/server';
import { fetchAnalyticsData, getDateRangeBounds } from '@/lib/queries/analytics';

export const runtime = 'nodejs';

export async function GET(request: Request) {
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
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
