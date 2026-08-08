import { createClient } from '@/lib/supabase/server';
import {
  AnalyticsDataPayload,
  AnalyticsSummary,
  TopSellingItem,
  CategoryRevenue,
  HourlyVolume,
  TableTurnover,
  OrderStatusSnapshot,
} from '@/lib/types/analytics.types';

/**
 * Calculates start and end ISO dates for the given analytics range preset.
 */
export function getDateRangeBounds(
  rangePreset: 'today' | 'week' | 'month' | 'custom',
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  const now = new Date();

  if (rangePreset === 'custom' && customStart && customEnd) {
    return {
      startDate: new Date(customStart).toISOString(),
      endDate: new Date(customEnd).toISOString(),
    };
  }

  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (rangePreset === 'week') {
    start.setDate(start.getDate() - 7);
  } else if (rangePreset === 'month') {
    start.setDate(start.getDate() - 30);
  }

  return {
    startDate: start.toISOString(),
    endDate: end,
  };
}

/**
 * Fetches comprehensive server-side analytics metrics from Supabase DB.
 * Uses parallel Promise.all execution for ultra-fast query performance.
 */
export async function fetchAnalyticsData(
  startDate: string,
  endDate: string
): Promise<AnalyticsDataPayload> {
  const supabase = createClient();
  const warnings: string[] = [];

  // Execute all 7 analytics queries in PARALLEL to eliminate sequential network latency
  const [
    summaryRes,
    topItemsRes,
    slowItemsRes,
    catRevenueRes,
    hourlyVolRes,
    tableTurnoverRes,
    ordersSnapshotRes,
  ] = await Promise.all([
    // 1. Analytics Summary RPC
    supabase.rpc('get_analytics_summary', {
      p_start_date: startDate,
      p_end_date: endDate,
    }),
    // 2. Top Selling Items RPC
    supabase.rpc('get_top_selling_items', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_limit: 10,
    }),
    // 3. Slow Moving Items RPC
    supabase.rpc('get_slow_moving_items', {
      p_start_date: startDate,
      p_end_date: endDate,
    }),
    // 4. Category Revenue Distribution RPC
    supabase.rpc('get_category_revenue', {
      p_start_date: startDate,
      p_end_date: endDate,
    }),
    // 5. Hourly Order Volume RPC
    supabase.rpc('get_hourly_order_volume', {
      p_start_date: startDate,
      p_end_date: endDate,
    }),
    // 6. Table Utilization RPC
    supabase.rpc('get_table_utilization', {
      p_start_date: startDate,
      p_end_date: endDate,
    }),
    // 7. Orders Snapshot Query
    supabase
      .from('orders')
      .select('status')
      .gte('created_at', startDate)
      .lte('created_at', endDate),
  ]);

  // 1. Parse Summary
  let summary: AnalyticsSummary = {
    total_revenue: 0,
    total_orders: 0,
    average_order_value: 0,
    avg_fulfillment_time_mins: 0,
  };

  if (summaryRes.data && summaryRes.data.length > 0) {
    summary = {
      total_revenue: Number(summaryRes.data[0].total_revenue || 0),
      total_orders: Number(summaryRes.data[0].total_orders || 0),
      average_order_value: Number(summaryRes.data[0].average_order_value || 0),
      avg_fulfillment_time_mins: Number(summaryRes.data[0].avg_fulfillment_time_mins || 0),
    };
  } else if (summaryRes.error) {
    warnings.push(`get_analytics_summary: ${summaryRes.error.message}`);
  }

  // 2. Parse Top Selling Items
  let topItems: TopSellingItem[] = [];
  if (topItemsRes.data) {
    topItems = topItemsRes.data.map((d: any) => ({
      item_id: d.item_id,
      item_name: d.item_name,
      category_name: d.category_name,
      total_quantity: Number(d.total_quantity || 0),
      total_revenue: Number(d.total_revenue || 0),
    }));
  } else if (topItemsRes.error) {
    warnings.push(`get_top_selling_items: ${topItemsRes.error.message}`);
  }

  // 3. Parse Slow Moving Items
  let slowItems: TopSellingItem[] = [];
  if (slowItemsRes.data) {
    slowItems = slowItemsRes.data.map((d: any) => ({
      item_id: d.item_id,
      item_name: d.item_name,
      category_name: d.category_name,
      total_quantity: Number(d.total_quantity || 0),
      total_revenue: Number(d.total_revenue || 0),
    }));
  } else if (slowItemsRes.error) {
    warnings.push(`get_slow_moving_items: ${slowItemsRes.error.message}`);
  }

  // 4. Parse Category Revenue
  let categoryRevenue: CategoryRevenue[] = [];
  if (catRevenueRes.data) {
    categoryRevenue = catRevenueRes.data.map((d: any) => ({
      category_name: d.category_name,
      total_revenue: Number(d.total_revenue || 0),
      total_items_sold: Number(d.total_items_sold || 0),
    }));
  } else if (catRevenueRes.error) {
    warnings.push(`get_category_revenue: ${catRevenueRes.error.message}`);
  }

  // 5. Parse Hourly Volume
  let hourlyVolume: HourlyVolume[] = [];
  if (hourlyVolRes.data) {
    hourlyVolume = hourlyVolRes.data.map((d: any) => ({
      hour_of_day: Number(d.hour_of_day),
      order_count: Number(d.order_count || 0),
      revenue: Number(d.revenue || 0),
    }));
  } else if (hourlyVolRes.error) {
    warnings.push(`get_hourly_order_volume: ${hourlyVolRes.error.message}`);
  }

  // 6. Parse Table Turnover
  let tableTurnover: TableTurnover[] = [];
  if (tableTurnoverRes.data) {
    tableTurnover = tableTurnoverRes.data.map((d: any) => ({
      table_number: Number(d.table_number),
      order_count: Number(d.order_count || 0),
      total_revenue: Number(d.total_revenue || 0),
    }));
  } else if (tableTurnoverRes.error) {
    warnings.push(`get_table_utilization: ${tableTurnoverRes.error.message}`);
  }

  // 7. Parse Order Status Snapshot
  const statusSnapshot: OrderStatusSnapshot = {
    received: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    paid: 0,
    cancelled: 0,
  };

  if (ordersSnapshotRes.data) {
    ordersSnapshotRes.data.forEach((o: any) => {
      const st = o.status as keyof OrderStatusSnapshot;
      if (statusSnapshot[st] !== undefined) {
        statusSnapshot[st] += 1;
      }
    });
  }

  return {
    summary,
    topItems,
    slowItems,
    categoryRevenue,
    hourlyVolume,
    tableTurnover,
    statusSnapshot,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
