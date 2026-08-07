export type AnalyticsDateRange = 'today' | 'week' | 'month' | 'custom';

export interface AnalyticsSummary {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  avg_fulfillment_time_mins: number;
}

export interface TopSellingItem {
  item_id: string;
  item_name: string;
  category_name: string;
  total_quantity: number;
  total_revenue: number;
}

export interface CategoryRevenue {
  category_name: string;
  total_revenue: number;
  total_items_sold: number;
}

export interface HourlyVolume {
  hour_of_day: number;
  order_count: number;
  revenue: number;
}

export interface TableTurnover {
  table_number: number;
  order_count: number;
  total_revenue: number;
}

export interface OrderStatusSnapshot {
  received: number;
  preparing: number;
  ready: number;
  served: number;
  paid: number;
  cancelled: number;
}

export interface AnalyticsDataPayload {
  summary: AnalyticsSummary;
  topItems: TopSellingItem[];
  slowItems: TopSellingItem[];
  categoryRevenue: CategoryRevenue[];
  hourlyVolume: HourlyVolume[];
  tableTurnover: TableTurnover[];
  statusSnapshot: OrderStatusSnapshot;
  warnings?: string[];
}
