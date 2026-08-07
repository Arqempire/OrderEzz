'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AnalyticsDataPayload, AnalyticsDateRange } from '@/lib/types/analytics.types';
import { Order, OrderStatus } from '@/lib/types/database.types';
import { fetchAllActiveOrders } from '@/lib/queries/orders';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Clock,
  IndianRupee,
  Calendar,
  RefreshCw,
  ArrowLeft,
  Utensils,
  AlertCircle,
  PieChart as PieIcon,
  CheckCircle2,
  ChefHat,
  Flame,
  Award,
  MessageSquare,
  ChevronRight,
  Eye,
  X,
  Sparkles,
  Radio,
  ExternalLink,
  Table as TableIcon,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { AdminLogoutButton } from '@/components/admin/admin-logout-button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const CHART_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#64748b'];

export default function AdminAnalyticsPage() {
  const [rangePreset, setRangePreset] = useState<AnalyticsDateRange>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'top_qty' | 'top_rev' | 'slow'>('top_qty');

  const [payload, setPayload] = useState<AnalyticsDataPayload | null>(null);

  // Active Orders for live reactive status snapshot inspector
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [activeModalStatus, setActiveModalStatus] = useState<OrderStatus | null>(null);

  // Interactive Executive Metric Cards Inspector ('revenue' | 'orders' | null)
  const [activeExecutiveInspector, setActiveExecutiveInspector] = useState<'revenue' | 'orders' | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `/api/admin/analytics?range=${rangePreset}`;
      if (rangePreset === 'custom' && customStart && customEnd) {
        url += `&start=${encodeURIComponent(customStart)}&end=${encodeURIComponent(customEnd)}`;
      }

      const [res, liveOrders] = await Promise.all([
        fetch(url),
        fetchAllActiveOrders(),
      ]);

      const resData = await res.json();

      if (res.ok && resData.success) {
        setPayload(resData.data);
      } else {
        toast.error(resData.error || 'Failed to load analytics metrics.');
      }

      if (liveOrders) {
        setActiveOrders(liveOrders);
      }
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      toast.error('An error occurred while loading analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [rangePreset, customStart, customEnd]);

  // Realtime subscription for live order status snapshot updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('analytics-live-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          console.log('Realtime order status change detected on analytics page');
          loadAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAnalytics]);

  // Auto-fetch when rangePreset changes for non-custom range presets
  useEffect(() => {
    if (rangePreset !== 'custom') {
      loadAnalytics();
    }
  }, [rangePreset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    loadAnalytics();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Format hourly chart data to include 24 hours format labels
  const formattedHourlyData = React.useMemo(() => {
    if (!payload?.hourlyVolume) return [];
    const hourlyMap = new Map<number, { hour: string; count: number; revenue: number }>();
    
    for (let h = 0; h < 24; h++) {
      const label = `${h.toString().padStart(2, '0')}:00`;
      hourlyMap.set(h, { hour: label, count: 0, revenue: 0 });
    }

    payload.hourlyVolume.forEach((item) => {
      if (hourlyMap.has(item.hour_of_day)) {
        const existing = hourlyMap.get(item.hour_of_day)!;
        existing.count = item.order_count;
        existing.revenue = item.revenue;
      }
    });

    return Array.from(hourlyMap.values());
  }, [payload?.hourlyVolume]);

  const topItemsByQuantity = React.useMemo(() => {
    if (!payload?.topItems) return [];
    return [...payload.topItems].sort((a, b) => b.total_quantity - a.total_quantity);
  }, [payload?.topItems]);

  const topItemsByRevenue = React.useMemo(() => {
    if (!payload?.topItems) return [];
    return [...payload.topItems].sort((a, b) => b.total_revenue - a.total_revenue);
  }, [payload?.topItems]);

  // Active orders filtered by the active status
  const modalFilteredOrders = React.useMemo(() => {
    if (!activeModalStatus) return [];
    return activeOrders.filter((o) => o.status === activeModalStatus);
  }, [activeOrders, activeModalStatus]);

  return (
    <main className="admin-container space-y-8">
      {/* Header Navigation */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-display text-slate-100">
              Executive Analytics & Operations
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time revenue, kitchen throughput, menu velocity, and table utilization metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/admin/feedback"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <MessageSquare size={14} /> Customer Reviews
          </Link>
          <Link
            href="/admin/menu"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors"
          >
            Manage Menu
          </Link>
          <Link
            href="/admin/tables"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors"
          >
            Manage Tables
          </Link>
          <Link
            href="/admin/staff"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors"
          >
            Manage Staff
          </Link>
          <Link
            href="/admin/place-order"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <ChefHat size={14} /> Place Order
          </Link>
          <Link
            href="/staff/orders"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Staff Dashboard
          </Link>
          <AdminLogoutButton />
        </div>
      </header>

      {/* Date Range Selector Bar */}
      <section className="glass-panel rounded-3xl p-4 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-2">
            <Calendar size={14} className="text-amber-400" /> Filter Date Range:
          </span>
          {(['today', 'week', 'month', 'custom'] as AnalyticsDateRange[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setRangePreset(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                rangePreset === preset
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-bold'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {preset === 'week' ? 'Last 7 Days' : preset === 'month' ? 'Last 30 Days' : preset}
            </button>
          ))}
        </div>

        {rangePreset === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              className="admin-input !py-1 !px-2 text-xs"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              className="admin-input !py-1 !px-2 text-xs"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
            <Button variant="amber" size="sm" onClick={loadAnalytics}>
              Apply
            </Button>
          </div>
        )}

        <button
          onClick={loadAnalytics}
          className="text-slate-400 hover:text-amber-400 text-xs font-semibold flex items-center gap-1.5 self-end md:self-auto"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Metrics
        </button>
      </section>

      {/* Warnings Banner if RPC issues detected */}
      {payload?.warnings && payload.warnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-300 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-400">
            <AlertCircle size={15} /> Database RPC Warnings
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-slate-300">
            {payload.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Executive Metric Cards (Interactive) */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue (Interactive) */}
          <button
            onClick={() => setActiveExecutiveInspector(activeExecutiveInspector === 'revenue' ? null : 'revenue')}
            className={`glass-card rounded-2xl p-5 border text-left transition-all relative overflow-hidden cursor-pointer group ${
              activeExecutiveInspector === 'revenue'
                ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40 scale-105'
                : 'border-slate-800 hover:border-amber-500/50 hover:scale-105'
            }`}
          >
            <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <IndianRupee size={20} />
            </div>
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              Total Revenue <Eye size={12} className="text-amber-400 opacity-60 group-hover:opacity-100" />
            </span>
            <div className="text-2xl font-extrabold text-slate-100 font-display">
              ₹{payload?.summary.total_revenue.toFixed(2) || '0.00'}
            </div>
            <p className="text-[11px] text-amber-400 flex items-center gap-1 font-semibold">
              <TrendingUp size={12} /> Click to inspect revenue breakdown
            </p>
          </button>

          {/* Total Orders (Interactive) */}
          <button
            onClick={() => setActiveExecutiveInspector(activeExecutiveInspector === 'orders' ? null : 'orders')}
            className={`glass-card rounded-2xl p-5 border text-left transition-all relative overflow-hidden cursor-pointer group ${
              activeExecutiveInspector === 'orders'
                ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/40 scale-105'
                : 'border-slate-800 hover:border-blue-500/50 hover:scale-105'
            }`}
          >
            <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <ShoppingBag size={20} />
            </div>
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              Total Orders <Eye size={12} className="text-blue-400 opacity-60 group-hover:opacity-100" />
            </span>
            <div className="text-2xl font-extrabold text-slate-100 font-display">
              {payload?.summary.total_orders || 0}
            </div>
            <p className="text-[11px] text-blue-400 font-semibold">
              Click to inspect order volume origin
            </p>
          </button>

          {/* Average Order Value (AOV) */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2 relative overflow-hidden">
            <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-semibold text-slate-400">Average Order Value (AOV)</span>
            <div className="text-2xl font-extrabold text-slate-100 font-display">
              ₹{payload?.summary.average_order_value.toFixed(2) || '0.00'}
            </div>
            <p className="text-[11px] text-slate-400">Average spend per table order</p>
          </div>

          {/* Avg Kitchen Fulfillment Speed */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2 relative overflow-hidden">
            <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Clock size={20} />
            </div>
            <span className="text-xs font-semibold text-slate-400">Avg Kitchen Speed</span>
            <div className="text-2xl font-extrabold text-slate-100 font-display">
              {payload?.summary.avg_fulfillment_time_mins || 0} <span className="text-xs font-medium text-slate-400">mins</span>
            </div>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> Time from Received to Served
            </p>
          </div>
        </div>

        {/* INLINE REVENUE / ORDERS BREAKDOWN INSPECTOR DRAWER */}
        {activeExecutiveInspector && (
          <div className="glass-panel rounded-3xl p-6 border border-slate-700 space-y-4 transition-all duration-300 ease-out animate-in fade-in zoom-in-95 bg-slate-950/90 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-100 font-display flex items-center gap-2">
                {activeExecutiveInspector === 'revenue' ? (
                  <>
                    <IndianRupee size={16} className="text-amber-400" />
                    <span>Revenue Origin & Earnings Breakdown</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={16} className="text-blue-400" />
                    <span>Order Volume & Table Turnover Breakdown</span>
                  </>
                )}
              </h3>

              <button
                onClick={() => setActiveExecutiveInspector(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {activeExecutiveInspector === 'revenue' ? (
              /* REVENUE BREAKDOWN CONTENT */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* 1. Category Revenue Origin */}
                <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="font-bold text-amber-400 flex items-center gap-1.5 font-display">
                    <Layers size={14} /> Revenue by Category
                  </h4>
                  <div className="divide-y divide-slate-800/60 pt-1">
                    {payload?.categoryRevenue?.map((cat, idx) => (
                      <div key={idx} className="py-2 flex justify-between items-center">
                        <span className="text-slate-300 font-medium">{cat.category_name}</span>
                        <span className="font-extrabold text-amber-400 font-display">
                          ₹{cat.total_revenue.toFixed(2)}
                        </span>
                      </div>
                    )) || <p className="text-slate-500 py-2 italic">No category data</p>}
                  </div>
                </div>

                {/* 2. Top Earning Tables */}
                <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="font-bold text-blue-400 flex items-center gap-1.5 font-display">
                    <TableIcon size={14} /> Top Earning Tables
                  </h4>
                  <div className="divide-y divide-slate-800/60 pt-1">
                    {payload?.tableTurnover
                      ?.slice()
                      .sort((a, b) => b.total_revenue - a.total_revenue)
                      .slice(0, 5)
                      .map((t, idx) => (
                        <div key={idx} className="py-2 flex justify-between items-center">
                          <span className="text-slate-300 font-medium">Table {t.table_number}</span>
                          <span className="font-bold text-slate-200">
                            ₹{t.total_revenue.toFixed(2)} <span className="text-[10px] text-slate-500">({t.order_count} orders)</span>
                          </span>
                        </div>
                      )) || <p className="text-slate-500 py-2 italic">No table data</p>}
                  </div>
                </div>

                {/* 3. Highest Revenue Dish */}
                <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 font-display">
                    <Flame size={14} /> Highest Earning Dishes
                  </h4>
                  <div className="divide-y divide-slate-800/60 pt-1">
                    {topItemsByRevenue.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="py-2 flex justify-between items-center">
                        <span className="text-slate-300 font-medium truncate max-w-[140px]">
                          {item.item_name}
                        </span>
                        <span className="font-extrabold text-emerald-400 font-display">
                          ₹{item.total_revenue.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ORDERS BREAKDOWN CONTENT */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 1. Orders Count per Table */}
                <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="font-bold text-blue-400 flex items-center gap-1.5 font-display">
                    <TableIcon size={14} /> Orders Count per Table
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {payload?.tableTurnover?.map((t) => (
                      <div key={t.table_number} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                        <span className="text-[11px] text-slate-400 block font-semibold">Table {t.table_number}</span>
                        <span className="text-base font-extrabold text-blue-400 font-display">{t.order_count} orders</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Order Fulfillment Status Ratios */}
                <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-purple-400 flex items-center gap-1.5 font-display">
                    <CheckCircle2 size={14} /> Live Order Fulfillment Ratios
                  </h4>
                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Active Kitchen Orders:</span>
                      <strong className="text-amber-400">
                        {(payload?.statusSnapshot.received || 0) + (payload?.statusSnapshot.preparing || 0) + (payload?.statusSnapshot.ready || 0)} orders
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Completed / Served:</span>
                      <strong className="text-emerald-400">
                        {(payload?.statusSnapshot.served || 0) + (payload?.statusSnapshot.paid || 0)} orders
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Cancelled Orders:</span>
                      <strong className="text-red-400">{payload?.statusSnapshot.cancelled || 0} orders</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Operational Live Status & Category Breakdown Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Order Status Snapshot Card (Card-contained Inline Popup Inspector) */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4 relative flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-100 font-display flex items-center justify-between">
              <span>Live Order Status Snapshot</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadAnalytics}
                  title="Refresh live order snapshot"
                  className="text-slate-400 hover:text-amber-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw size={14} className={isLoading ? 'animate-spin text-amber-400' : ''} />
                </button>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">
                  Live Realtime
                </span>
              </div>
            </h2>

            <p className="text-[11px] text-slate-400">
              Click any status box to inspect dishes being prepared:
            </p>

            {/* Interactive Reactive Status Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => setActiveModalStatus(activeModalStatus === 'received' ? null : 'received')}
                className={`p-3.5 rounded-2xl border transition-all text-center group cursor-pointer shadow-lg ${
                  activeModalStatus === 'received'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300 ring-2 ring-amber-500/40'
                    : 'border-amber-500/30 bg-gradient-to-br from-slate-900 to-amber-950/30 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1">
                  <span>Received</span>
                  <Eye size={13} className={activeModalStatus === 'received' ? 'text-amber-400' : 'opacity-60'} />
                </div>
                <span className="text-2xl font-extrabold text-slate-100 font-display">
                  {payload?.statusSnapshot.received || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveModalStatus(activeModalStatus === 'preparing' ? null : 'preparing')}
                className={`p-3.5 rounded-2xl border transition-all text-center group cursor-pointer shadow-lg ${
                  activeModalStatus === 'preparing'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300 ring-2 ring-blue-500/40'
                    : 'border-blue-500/30 bg-gradient-to-br from-slate-900 to-blue-950/30 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-blue-400 mb-1">
                  <span>Preparing</span>
                  <Eye size={13} className={activeModalStatus === 'preparing' ? 'text-blue-400' : 'opacity-60'} />
                </div>
                <span className="text-2xl font-extrabold text-slate-100 font-display">
                  {payload?.statusSnapshot.preparing || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveModalStatus(activeModalStatus === 'ready' ? null : 'ready')}
                className={`p-3.5 rounded-2xl border transition-all text-center group cursor-pointer shadow-lg ${
                  activeModalStatus === 'ready'
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300 ring-2 ring-purple-500/40'
                    : 'border-purple-500/30 bg-gradient-to-br from-slate-900 to-purple-950/30 hover:border-purple-400'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-purple-400 mb-1">
                  <span>Ready</span>
                  <Eye size={13} className={activeModalStatus === 'ready' ? 'text-purple-400' : 'opacity-60'} />
                </div>
                <span className="text-2xl font-extrabold text-slate-100 font-display">
                  {payload?.statusSnapshot.ready || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveModalStatus(activeModalStatus === 'served' ? null : 'served')}
                className={`p-3.5 rounded-2xl border transition-all text-center group cursor-pointer shadow-lg ${
                  activeModalStatus === 'served'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/40'
                    : 'border-emerald-500/30 bg-gradient-to-br from-slate-900 to-emerald-950/30 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-1">
                  <span>Served</span>
                  <Eye size={13} className={activeModalStatus === 'served' ? 'text-emerald-400' : 'opacity-60'} />
                </div>
                <span className="text-2xl font-extrabold text-slate-100 font-display">
                  {payload?.statusSnapshot.served || 0}
                </span>
              </button>
            </div>

            {/* INLINE CARD-CONTAINED POPUP INSPECTOR (Covers only this card area) */}
            {activeModalStatus && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 transition-all duration-300 ease-out animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200 capitalize">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" /> Active '{activeModalStatus}' Dishes ({modalFilteredOrders.length})
                  </span>
                  <button
                    onClick={() => setActiveModalStatus(null)}
                    className="text-slate-400 hover:text-slate-200 p-1 rounded-md"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div key={activeModalStatus} className="max-h-52 overflow-y-auto space-y-2 pr-1 animate-in fade-in zoom-in-95 duration-200">
                  {modalFilteredOrders.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                      No active orders in '{activeModalStatus}' stage.
                    </div>
                  ) : (
                    modalFilteredOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5 hover:border-amber-500/40 transition-colors"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                          <span className="font-bold text-amber-400 font-display">
                            Table {ord.table?.table_number ?? 'N/A'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="space-y-1 pl-1">
                          {ord.order_items?.map((item) => (
                            <div key={item.id} className="flex justify-between text-slate-300 text-[11px]">
                              <span>
                                <strong className="text-amber-400 mr-1.5">{item.quantity}x</strong>
                                {item.menu_item?.name || 'Dish'}
                              </span>
                              {item.notes && <span className="text-[10px] text-slate-400 italic">({item.notes})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-between text-xs text-slate-400">
            <span>Paid: <strong className="text-slate-200">{payload?.statusSnapshot.paid || 0}</strong></span>
            <span>Cancelled: <strong className="text-red-400">{payload?.statusSnapshot.cancelled || 0}</strong></span>
          </div>
        </div>

        {/* Category Revenue Distribution (Pie Chart) */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
            <PieIcon size={18} className="text-amber-400" /> Revenue Breakdown by Menu Category
          </h2>

          {payload?.categoryRevenue && payload.categoryRevenue.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={payload.categoryRevenue}
                    dataKey="total_revenue"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={4}
                    label={(entry: any) => `${entry.category_name}: ₹${entry.total_revenue}`}
                  >
                    {payload.categoryRevenue.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              No category revenue data available for selected range.
            </div>
          )}
        </div>
      </section>

      {/* Hourly Volume Trend & Table Turnover Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Order Volume Trend */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
            <Clock size={18} className="text-amber-400" /> Order Volume by Hour of Day
          </h2>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedHourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  formatter={(val: any) => [val, 'Orders']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table Turnover / Utilization */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
            <ChefHat size={18} className="text-amber-400" /> Orders & Revenue per Table
          </h2>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payload?.tableTurnover || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="table_number" tickFormatter={(t) => `T-${t}`} stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  formatter={(val: any, name: any) => [name === 'total_revenue' ? `₹${val}` : val, name === 'total_revenue' ? 'Revenue' : 'Orders']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                />
                <Bar dataKey="order_count" fill="#3b82f6" name="Orders" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Menu Item Performance & Velocity Table */}
      <section className="glass-card rounded-3xl p-6 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-display flex items-center gap-2">
              <Flame size={20} className="text-amber-400" /> Menu Velocity & Performance
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Top-selling items by quantity vs revenue, and slow-moving items requiring attention
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('top_qty')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'top_qty'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Top by Quantity
            </button>
            <button
              onClick={() => setActiveTab('top_rev')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'top_rev'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Top by Revenue
            </button>
            <button
              onClick={() => setActiveTab('slow')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'slow'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Slow Moving / Never
            </button>
          </div>
        </div>

        {/* Menu Performance Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <tbody className="divide-y divide-slate-800/60">
              {(activeTab === 'top_qty'
                ? topItemsByQuantity
                : activeTab === 'top_rev'
                ? topItemsByRevenue
                : payload?.slowItems || []
              ).map((item) => (
                <tr key={item.item_id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 font-semibold text-slate-100 flex items-center gap-2">
                    {activeTab !== 'slow' && <Award size={14} className="text-amber-400" />}
                    {item.item_name}
                  </td>
                  <td className="p-3 text-slate-400">{item.category_name}</td>
                  <td className="p-3 text-right font-bold text-slate-200">
                    {item.total_quantity}
                  </td>
                  <td className="p-3 text-right font-bold text-amber-400 font-display">
                    ₹{item.total_revenue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
