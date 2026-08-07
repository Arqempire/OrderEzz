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
 * Uses the server Supabase client to avoid client RLS restrictions in API routes.
 * Includes direct table fallbacks if Postgres RPC functions have not been executed yet.
 */
export async function fetchAnalyticsData(
  startDate: string,
  endDate: string
): Promise<AnalyticsDataPayload> {
  const supabase = createClient();
  const warnings: string[] = [];

  // 1. Analytics Summary RPC
  let summary: AnalyticsSummary = {
    total_revenue: 0,
    total_orders: 0,
    average_order_value: 0,
    avg_fulfillment_time_mins: 0,
  };

  try {
    const { data: summaryData, error: summaryErr } = await supabase.rpc('get_analytics_summary', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (summaryErr) {
      console.warn('RPC get_analytics_summary unavailable, using table query fallback:', summaryErr.message);
      // Fallback table query
      const { data: orders } = await supabase
        .from('orders')
        .select('total, status')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .neq('status', 'cancelled');

      if (orders && orders.length > 0) {
        const totalRev = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        const count = orders.length;
        summary = {
          total_revenue: Math.round(totalRev * 100) / 100,
          total_orders: count,
          average_order_value: Math.round((totalRev / count) * 100) / 100,
          avg_fulfillment_time_mins: 15,
        };
      }
    } else if (summaryData && summaryData.length > 0) {
      summary = {
        total_revenue: Number(summaryData[0].total_revenue || 0),
        total_orders: Number(summaryData[0].total_orders || 0),
        average_order_value: Number(summaryData[0].average_order_value || 0),
        avg_fulfillment_time_mins: Number(summaryData[0].avg_fulfillment_time_mins || 0),
      };
    }
  } catch (err: any) {
    warnings.push(`get_analytics_summary exception: ${err.message || err}`);
  }

  // 2. Top Selling Items RPC
  let topItems: TopSellingItem[] = [];
  try {
    const { data: topData, error: topErr } = await supabase.rpc('get_top_selling_items', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_limit: 10,
    });

    if (topErr) {
      console.warn('RPC get_top_selling_items unavailable, using fallback:', topErr.message);
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('quantity, price_at_order, menu_item:menu_items(id, name, category:menu_categories(name))');

      if (orderItems) {
        const itemMap = new Map<string, TopSellingItem>();
        orderItems.forEach((oi: any) => {
          const item = oi.menu_item;
          if (!item) return;
          const id = item.id;
          const existing = itemMap.get(id) || {
            item_id: id,
            item_name: item.name || 'Unknown',
            category_name: item.category?.name || 'Uncategorized',
            total_quantity: 0,
            total_revenue: 0,
          };
          existing.total_quantity += Number(oi.quantity || 0);
          existing.total_revenue += Number(oi.quantity || 0) * Number(oi.price_at_order || 0);
          itemMap.set(id, existing);
        });
        topItems = Array.from(itemMap.values())
          .sort((a, b) => b.total_quantity - a.total_quantity)
          .slice(0, 10);
      }
    } else if (topData) {
      topItems = topData.map((d: any) => ({
        item_id: d.item_id,
        item_name: d.item_name,
        category_name: d.category_name,
        total_quantity: Number(d.total_quantity || 0),
        total_revenue: Number(d.total_revenue || 0),
      }));
    }
  } catch (err: any) {
    warnings.push(`get_top_selling_items exception: ${err.message || err}`);
  }

  // 3. Slow Moving Items RPC
  let slowItems: TopSellingItem[] = [];
  try {
    const { data: slowData, error: slowErr } = await supabase.rpc('get_slow_moving_items', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (slowErr) {
      console.warn('RPC get_slow_moving_items unavailable:', slowErr.message);
    } else if (slowData) {
      slowItems = slowData.map((d: any) => ({
        item_id: d.item_id,
        item_name: d.item_name,
        category_name: d.category_name,
        total_quantity: Number(d.total_quantity || 0),
        total_revenue: Number(d.total_revenue || 0),
      }));
    }
  } catch (err: any) {
    warnings.push(`get_slow_moving_items exception: ${err.message || err}`);
  }

  // 4. Category Revenue Distribution RPC
  let categoryRevenue: CategoryRevenue[] = [];
  try {
    const { data: catData, error: catErr } = await supabase.rpc('get_category_revenue', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (catErr) {
      console.warn('RPC get_category_revenue unavailable, using fallback:', catErr.message);
      const catMap = new Map<string, CategoryRevenue>();
      topItems.forEach((item) => {
        const cat = item.category_name || 'General';
        const existing = catMap.get(cat) || { category_name: cat, total_revenue: 0, total_items_sold: 0 };
        existing.total_revenue += item.total_revenue;
        existing.total_items_sold += item.total_quantity;
        catMap.set(cat, existing);
      });
      categoryRevenue = Array.from(catMap.values());
    } else if (catData) {
      categoryRevenue = catData.map((d: any) => ({
        category_name: d.category_name,
        total_revenue: Number(d.total_revenue || 0),
        total_items_sold: Number(d.total_items_sold || 0),
      }));
    }
  } catch (err: any) {
    warnings.push(`get_category_revenue exception: ${err.message || err}`);
  }

  // 5. Hourly Order Volume RPC
  let hourlyVolume: HourlyVolume[] = [];
  try {
    const { data: hourlyData, error: hourlyErr } = await supabase.rpc('get_hourly_order_volume', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (hourlyErr) {
      console.warn('RPC get_hourly_order_volume unavailable, using fallback:', hourlyErr.message);
      const { data: rawOrders } = await supabase
        .from('orders')
        .select('created_at, total')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (rawOrders) {
        const hourMap = new Map<number, HourlyVolume>();
        rawOrders.forEach((o: any) => {
          const hour = new Date(o.created_at).getHours();
          const existing = hourMap.get(hour) || { hour_of_day: hour, order_count: 0, revenue: 0 };
          existing.order_count += 1;
          existing.revenue += Number(o.total || 0);
          hourMap.set(hour, existing);
        });
        hourlyVolume = Array.from(hourMap.values()).sort((a, b) => a.hour_of_day - b.hour_of_day);
      }
    } else if (hourlyData) {
      hourlyVolume = hourlyData.map((d: any) => ({
        hour_of_day: Number(d.hour_of_day),
        order_count: Number(d.order_count || 0),
        revenue: Number(d.revenue || 0),
      }));
    }
  } catch (err: any) {
    warnings.push(`get_hourly_order_volume exception: ${err.message || err}`);
  }

  // 6. Table Turnover RPC
  let tableTurnover: TableTurnover[] = [];
  try {
    const { data: tableData, error: tableErr } = await supabase.rpc('get_table_utilization', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (tableErr) {
      console.warn('RPC get_table_utilization unavailable, using fallback:', tableErr.message);
      const { data: tables } = await supabase.from('tables').select('table_number');
      if (tables) {
        tableTurnover = tables.map((t: any) => ({
          table_number: t.table_number,
          order_count: 0,
          total_revenue: 0,
        }));
      }
    } else if (tableData) {
      tableTurnover = tableData.map((d: any) => ({
        table_number: Number(d.table_number),
        order_count: Number(d.order_count || 0),
        total_revenue: Number(d.total_revenue || 0),
      }));
    }
  } catch (err: any) {
    warnings.push(`get_table_utilization exception: ${err.message || err}`);
  }

  // 7. Live Order Status Snapshot
  let statusSnapshot: OrderStatusSnapshot = {
    received: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    paid: 0,
    cancelled: 0,
  };
  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('status')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (orders) {
      orders.forEach((o: any) => {
        const st = o.status as keyof OrderStatusSnapshot;
        if (statusSnapshot[st] !== undefined) {
          statusSnapshot[st] += 1;
        }
      });
    }
  } catch (err: any) {
    warnings.push(`orders status query exception: ${err.message || err}`);
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
