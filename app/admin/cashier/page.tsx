'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Order } from '@/lib/types/database.types';
import {
  fetchOrdersAwaitingPayment,
  markOrderAsPaid,
  fetchTodaysCashierSummary,
  fetchTodaysPaidOrders,
  dismissCancelledOrder,
} from '@/lib/queries/cashier';
import { createClient } from '@/lib/supabase/client';
import { AdminLogoutButton } from '@/components/admin/admin-logout-button';
import { OrderStatusBadge } from '@/components/ui/badge';
import { getOrderCancellationSource } from '@/lib/utils/order-cancellation';
import {
  IndianRupee,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Receipt,
  Eye,
  EyeOff,
  Printer,
  X,
  History,
  ShoppingBag,
  User,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { TakeawayBillingModal, PosCartItem } from '@/components/cashier/takeaway-billing-modal';
import { extractGuestInfoFromOrder, extractGuestInfoFromTableOrders, formatCleanItemNotes } from '@/lib/utils/guest-info';

interface TableOrderGroup {
  tableId: string;
  tableNumber: number | string;
  orders: Order[];
  groupTotal: number;
}

export default function CashierPanelPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<{ totalCollected: number; paidOrderCount: number }>({
    totalCollected: 0,
    paidOrderCount: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showAmount, setShowAmount] = useState<boolean>(false);
  const [processingOrderIds, setProcessingOrderIds] = useState<Record<string, boolean>>({});
  const [receiptToPrint, setReceiptToPrint] = useState<TableOrderGroup | null>(null);
  const [paidOrdersHistory, setPaidOrdersHistory] = useState<Order[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'paid' | 'cancelled'>('all');
  const [isTakeawayModalOpen, setIsTakeawayModalOpen] = useState<boolean>(false);

  const handleTakeawayOrderCreated = (
    orderId: string,
    settledImmediately: boolean,
    total: number,
    items: PosCartItem[]
  ) => {
    loadData();

    if (settledImmediately) {
      setReceiptToPrint({
        tableId: 'takeaway_counter',
        tableNumber: 'Takeaway',
        groupTotal: total,
        orders: [
          {
            id: orderId,
            table_id: null,
            status: 'paid',
            total: total,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            order_items: items.map((i, idx) => ({
              id: `pos-${idx}`,
              order_id: orderId,
              menu_item_id: i.menuItemId,
              quantity: i.quantity,
              notes: i.notes || null,
              price_at_order: i.price,
              menu_item: {
                id: i.menuItemId,
                name: i.name,
                price: i.price,
                category_id: '',
                description: null,
                image_url: i.image_url,
                is_available: true,
                sort_order: 0,
              },
            })),
          },
        ],
      });
    }
  };

  const filteredHistoryOrders = useMemo(() => {
    if (historyFilter === 'paid') return paidOrdersHistory.filter((o) => o.status === 'paid');
    if (historyFilter === 'cancelled') return paidOrdersHistory.filter((o) => o.status === 'cancelled');
    return paidOrdersHistory;
  }, [paidOrdersHistory, historyFilter]);

  const handleOpenHistory = async () => {
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    const data = await fetchTodaysPaidOrders();
    setPaidOrdersHistory(data);
    setIsLoadingHistory(false);
  };

  const loadData = useCallback(async () => {
    const [ordersData, summaryData] = await Promise.all([
      fetchOrdersAwaitingPayment(),
      fetchTodaysCashierSummary(),
    ]);

    setOrders(ordersData);
    setSummary(summaryData);
    setIsLoading(false);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast.success('Cashier data refreshed');
  };

  useEffect(() => {
    loadData();

    // Setup Supabase Realtime subscription on orders table
    const supabase = createClient();
    const channel = supabase
      .channel('cashier-panel-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const tableGroups = useMemo(() => {
    const map = new Map<string, TableOrderGroup>();

    for (const order of orders) {
      const hasTakeawayTag = order.order_items?.some((item) => item.notes?.includes('[Takeaway'));
      const isTakeaway = !order.table_id || order.table?.table_number === 0 || (order.table?.table_number as unknown) === 'Takeaway' || hasTakeawayTag;
      const tableId = isTakeaway ? 'takeaway_counter' : (order.table?.id || order.table_id || 'unknown');
      const tableNumber = isTakeaway ? 'Takeaway' : (order.table?.table_number ?? 'Takeaway');

      if (!map.has(tableId)) {
        map.set(tableId, {
          tableId,
          tableNumber,
          orders: [],
          groupTotal: 0,
        });
      }

      const group = map.get(tableId)!;
      group.orders.push(order);
      if (order.status !== 'cancelled') {
        group.groupTotal += Number(order.total) || 0;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const numA = typeof a.tableNumber === 'number' ? a.tableNumber : 999;
      const numB = typeof b.tableNumber === 'number' ? b.tableNumber : 999;
      return numA - numB;
    });
  }, [orders]);

  const handleDismissCancelledOrder = async (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    toast.info('Cancelled order alert dismissed');
    await dismissCancelledOrder(orderId);
  };

  const handleMarkPaid = async (order: Order) => {
    if (processingOrderIds[order.id]) return;

    setProcessingOrderIds((prev) => ({ ...prev, [order.id]: true }));

    // Optimistic UI update
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    setSummary((prev) => ({
      totalCollected: prev.totalCollected + Number(order.total),
      paidOrderCount: prev.paidOrderCount + 1,
    }));

    toast.success(`Order #${order.id.slice(0, 6)} marked as paid! ✓`);

    const success = await markOrderAsPaid(order.id);

    if (!success) {
      toast.error('Failed to mark order as paid');
      // Revert optimistic update on failure
      loadData();
    }

    setProcessingOrderIds((prev) => {
      const next = { ...prev };
      delete next[order.id];
      return next;
    });
  };

  const handleMarkGroupPaid = async (group: TableOrderGroup) => {
    const activeOrders = group.orders.filter((o) => o.status !== 'cancelled');
    const cancelledOrders = group.orders.filter((o) => o.status === 'cancelled');
    const activeOrderIds = activeOrders.map((o) => o.id);
    const cancelledOrderIds = cancelledOrders.map((o) => o.id);
    const allOrderIds = group.orders.map((o) => o.id);

    const anyProcessing = allOrderIds.some((id) => processingOrderIds[id]);
    if (anyProcessing) return;

    setProcessingOrderIds((prev) => {
      const next = { ...prev };
      allOrderIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });

    // Optimistic UI update
    setOrders((prev) => prev.filter((o) => !allOrderIds.includes(o.id)));
    setSummary((prev) => ({
      totalCollected: prev.totalCollected + group.groupTotal,
      paidOrderCount: prev.paidOrderCount + activeOrders.length,
    }));

    toast.success(`Table ${group.tableNumber} bill settled (₹${group.groupTotal.toFixed(2)})! ✓`);

    // Mark active orders as paid in DB
    if (activeOrderIds.length > 0) {
      await Promise.all(activeOrderIds.map((id) => markOrderAsPaid(id)));
    }

    // Mark cancelled orders as dismissed in DB so Realtime re-fetches ignore them
    if (cancelledOrderIds.length > 0) {
      await Promise.all(cancelledOrderIds.map((id) => dismissCancelledOrder(id)));
    }

    setProcessingOrderIds((prev) => {
      const next = { ...prev };
      allOrderIds.forEach((id) => {
        delete next[id];
      });
      return next;
    });
  };

  const formatOrderTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return `${timeFormatted} (now)`;
    if (minutes < 30) return `${timeFormatted} (${minutes}m)`;
    return timeFormatted;
  };

  const renderCancelledByBadge = (order: Order) => {
    if (order.status !== 'cancelled') {
      return <OrderStatusBadge status={order.status} className="!py-0.5 text-[9px]" />;
    }

    const source = getOrderCancellationSource(order.id, order.cancelled_by);
    if (source === 'customer') {
      return (
        <span className="bg-red-500/20 text-red-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border border-red-500/30 font-display">
          Cancelled by Customer
        </span>
      );
    }
    return (
      <span className="bg-amber-500/20 text-amber-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border border-amber-500/30 font-display">
        Cancelled by Staff
      </span>
    );
  };

  return (
    <main className="flex-1 bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <Receipt size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold font-display text-slate-100">
                Cashier Panel
              </h1>
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border border-emerald-500/20 animate-pulse">
                Live Counter
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Collect payments for served orders and track daily counter totals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsTakeawayModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <ShoppingBag size={16} />
            + New Takeaway Order
          </button>

          <button
            onClick={handleManualRefresh}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          <Link
            href="/admin/analytics"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back to Analytics
          </Link>

          <AdminLogoutButton />
        </div>
      </header>

      {/* Summary Cards Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Total Collected */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Collected Today
              </span>
              <button
                onClick={() => setShowAmount(!showAmount)}
                className="text-slate-400 hover:text-amber-400 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title={showAmount ? "Hide collected cash total" : "Show collected cash total"}
              >
                {showAmount ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
            <div className="text-3xl font-extrabold font-display text-amber-400">
              {showAmount ? `₹${summary.totalCollected.toFixed(2)}` : '₹••••••'}
            </div>
            <p className="text-[11px] text-slate-400">Total settled sales for today</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <IndianRupee size={28} />
          </div>
        </div>

        {/* Today's Orders Paid Count (Interactive link to view history & re-print bills) */}
        <div
          onClick={handleOpenHistory}
          className="glass-panel rounded-3xl p-6 border border-slate-800 relative overflow-hidden flex items-center justify-between hover:border-emerald-500/40 transition-all cursor-pointer group shadow-lg"
          title="Click to view today's settled orders & re-print bills"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Orders Paid Today
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                History & Reprint
              </span>
            </div>
            <div className="text-3xl font-extrabold font-display text-emerald-400">
              {summary.paidOrderCount} <span className="text-sm text-slate-400 font-normal">orders</span>
            </div>
            <p className="text-[11px] text-slate-400 group-hover:text-emerald-300 transition-colors">
              Click to view settled orders & re-print bills →
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold group-hover:scale-105 transition-all">
            <History size={28} />
          </div>
        </div>
      </section>

      {/* Orders Awaiting Payment Section (Grouped by Table) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold font-display text-slate-200">
              Active Table Bills
            </h2>
            <span className="bg-amber-500/10 text-amber-400 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-amber-500/20">
              {tableGroups.length} {tableGroups.length === 1 ? 'Table' : 'Tables'} ({orders.length} orders)
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Orders grouped by table session for counter settlement
          </span>
        </div>

        {isLoading ? (
          <div className="h-48 glass-card rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={32} className="animate-spin text-amber-400 mb-2" />
            <span className="text-xs font-medium">Loading cashier orders...</span>
          </div>
        ) : tableGroups.length === 0 ? (
          <div className="h-48 glass-card rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center p-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-200 font-display">
              All Table Bills Settled!
            </h3>
            <p className="text-xs text-slate-400 max-w-sm">
              There are no pending table bills awaiting counter collection. New active orders will appear here automatically in real time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tableGroups.map((group) => {
              const isGroupProcessing = group.orders.every((o) => processingOrderIds[o.id]);
              const tableGuest = extractGuestInfoFromTableOrders(group.orders);

              return (
                <div
                  key={group.tableId}
                  className="glass-card rounded-3xl p-5 border border-slate-800 space-y-4 hover:border-amber-500/40 transition-all shadow-xl flex flex-col justify-between"
                >
                  {/* Table Group Header */}
                  <div className="flex flex-col gap-2 pb-3 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-500 text-slate-950 font-extrabold text-sm px-3 py-1 rounded-xl font-display shadow-md shadow-amber-500/20">
                          {group.tableNumber === 'Takeaway' || group.tableNumber === 0 ? 'Takeaway' : `Table ${group.tableNumber}`}
                        </span>
                        <span className="text-xs font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                          {group.orders.length} {group.orders.length === 1 ? 'order' : 'orders'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Combined Total</span>
                        <span className="text-lg font-extrabold text-amber-400 font-display">
                          ₹{group.groupTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Guest Information Badge if provided */}
                    {(tableGuest.name || tableGuest.phone) && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-amber-300 font-medium truncate">
                          <User size={13} className="text-amber-400 flex-shrink-0" />
                          <span className="font-bold">{tableGuest.name || 'Guest'}</span>
                        </div>
                        {tableGuest.phone && (
                          <div className="flex items-center gap-1 text-slate-300 text-[11px] font-mono flex-shrink-0">
                            <Phone size={11} className="text-amber-400" />
                            <span>{tableGuest.phone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sub-Orders List for this Table */}
                  <div className="space-y-3 flex-1 py-1">
                    {group.orders.map((order) => {
                      const isProcessing = !!processingOrderIds[order.id];
                      const isCancelled = order.status === 'cancelled';
                      const orderGuest = extractGuestInfoFromOrder(order);

                      return (
                        <div
                          key={order.id}
                          className={`rounded-2xl p-3.5 border space-y-2 transition-all ${
                            isCancelled
                              ? 'bg-red-950/20 border-red-800/40'
                              : 'bg-slate-900/90 border-slate-800/90'
                          }`}
                        >
                          {/* Sub-order Header */}
                          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/60">
                            <div className="flex items-center gap-1.5 font-mono text-slate-400">
                              <span>#{order.id.slice(0, 6)}</span>
                              <span>•</span>
                              <span className="text-[11px] text-slate-400">{formatOrderTime(order.created_at)}</span>
                            </div>
                            {order.status !== 'cancelled' && <OrderStatusBadge status={order.status} className="!py-0.5 text-[9px]" />}
                          </div>

                          {/* Sub-order Items */}
                          <div className="space-y-1.5 py-1">
                            {order.order_items?.map((item) => {
                              const cleanNotes = formatCleanItemNotes(item.notes);

                              return (
                                <div key={item.id} className="text-xs space-y-0.5">
                                  <div className="flex justify-between gap-2">
                                    <span className={isCancelled ? 'text-slate-400 line-through' : 'text-slate-300'}>
                                      <span className={`font-bold mr-1 ${isCancelled ? 'text-red-400/80' : 'text-amber-400'}`}>
                                        {item.quantity}x
                                      </span>
                                      {item.menu_item?.name || 'Item'}
                                    </span>
                                    <span className={`font-mono text-[11px] ${isCancelled ? 'text-red-400/80 line-through' : 'text-slate-400'}`}>
                                      ₹{(item.price_at_order * item.quantity).toFixed(2)}
                                    </span>
                                  </div>

                                  {/* Kitchen / Item Special Instructions */}
                                  {cleanNotes && (
                                    <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-0.5 italic">
                                      Note: {cleanNotes}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Sub-order Footer */}
                          <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
                            {isCancelled ? (
                              <>
                                <span className="text-xs font-bold font-mono flex items-center gap-1">
                                  <span className={getOrderCancellationSource(order.id, order.cancelled_by) === 'customer' ? 'text-red-400' : 'text-amber-400'}>
                                    {getOrderCancellationSource(order.id, order.cancelled_by) === 'customer'
                                      ? 'Cancelled by Customer'
                                      : 'Cancelled by Staff'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-normal">(Excluded)</span>
                                </span>
                                <button
                                  onClick={() => handleDismissCancelledOrder(order.id)}
                                  className="text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                  title="Dismiss cancelled order alert"
                                >
                                  <X size={11} /> Dismiss
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="text-xs font-bold text-slate-200 font-mono">
                                  Order Total: ₹{order.total.toFixed(2)}
                                </span>
                                {group.orders.length > 1 && (
                                  <button
                                    onClick={() => handleMarkPaid(order)}
                                    disabled={isProcessing}
                                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    title="Mark only this order as paid"
                                  >
                                    {isProcessing ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                                    Pay Order
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Table Settlement Action */}
                  <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => setReceiptToPrint(group)}
                      className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
                      title="Print Customer Bill Receipt"
                    >
                      <Printer size={15} />
                      Print Bill
                    </button>
                    <button
                      onClick={() => handleMarkGroupPaid(group)}
                      disabled={isGroupProcessing}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isGroupProcessing ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}
                      {isGroupProcessing
                        ? 'Processing…'
                        : `Settle Bill (₹${group.groupTotal.toFixed(2)})`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Printable Receipt Modal */}
      {receiptToPrint && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 print-receipt-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative print-dialog-box">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 no-print">
              <div className="flex items-center gap-2">
                <Printer className="text-amber-400" size={20} />
                <h3 className="font-extrabold text-slate-100 text-base font-display">
                  Print Customer Bill
                </h3>
              </div>
              <button
                onClick={() => setReceiptToPrint(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thermal POS Receipt Preview */}
            <div
              id="printable-receipt-area"
              className="bg-white text-slate-900 p-6 rounded-2xl shadow-inner font-mono text-xs space-y-4 border border-slate-200"
            >
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
                <h2 className="font-black text-base font-display tracking-tight text-slate-950">
                  ORDEREZZ RESTAURANT
                </h2>
                <p className="text-[10px] text-slate-600">Fine Dining & Express QR Ordering</p>
                <p className="text-[10px] text-slate-500 mt-1" suppressHydrationWarning>
                  Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </p>
                <p className="text-xs font-bold text-slate-900 mt-1 uppercase">
                  {receiptToPrint.tableNumber === 0 || receiptToPrint.tableNumber === 'Takeaway / Counter' || receiptToPrint.tableNumber === 'Takeaway'
                    ? 'TAKEAWAY'
                    : `TABLE ${receiptToPrint.tableNumber}`}
                </p>
                {(() => {
                  const receiptGuest = extractGuestInfoFromTableOrders(receiptToPrint.orders);
                  if (receiptGuest.name || receiptGuest.phone) {
                    return (
                      <div className="text-[10px] text-slate-700 pt-1 border-t border-dotted border-slate-300 font-bold">
                        {receiptGuest.name && <span>Customer: {receiptGuest.name}</span>}
                        {receiptGuest.name && receiptGuest.phone && <span> • </span>}
                        {receiptGuest.phone && <span>Ph: {receiptGuest.phone}</span>}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Items List */}
              <div className="space-y-2 py-1">
                <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-slate-300 text-slate-700">
                  <span>ITEM</span>
                  <span>PRICE</span>
                </div>

                {receiptToPrint.orders.flatMap((o) => o.order_items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-900 text-[11px]">
                    <span>
                      <span className="font-bold mr-1">{item.quantity}x</span>
                      {item.menu_item?.name || 'Item'}
                    </span>
                    <span>₹{(item.price_at_order * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="pt-3 border-t border-dashed border-slate-400 space-y-1.5 text-slate-900">
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-900">
                  <span>AMOUNT PAYABLE:</span>
                  <span>₹{receiptToPrint.groupTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-400 text-[10px] text-slate-600 space-y-0.5">
                <p className="font-bold text-slate-900">Thank you for dining with us!</p>
                <p>Please visit again</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 no-print">
              <button
                onClick={() => setReceiptToPrint(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={15} /> Print Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Order History Modal (Re-print Bills & Inspect Paid/Cancelled Orders) */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 print:hidden no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="text-emerald-400" size={22} />
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base font-display">
                    Today's Order History ({paidOrdersHistory.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Re-print bills, inspect paid settlements, and review cancelled orders
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 pb-1">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  historyFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All Orders ({paidOrdersHistory.length})
              </button>
              <button
                onClick={() => setHistoryFilter('paid')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  historyFilter === 'paid'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Paid ({paidOrdersHistory.filter((o) => o.status === 'paid').length})
              </button>
              <button
                onClick={() => setHistoryFilter('cancelled')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  historyFilter === 'cancelled'
                    ? 'bg-red-500 text-slate-950 shadow-md shadow-red-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Cancelled ({paidOrdersHistory.filter((o) => o.status === 'cancelled').length})
              </button>
            </div>

            {/* Orders List */}
            <div className="overflow-y-auto pr-1 flex-1 space-y-3">
              {isLoadingHistory ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Loader2 size={28} className="animate-spin text-emerald-400" />
                  <span className="text-xs">Loading order history…</span>
                </div>
              ) : filteredHistoryOrders.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-1">
                  <CheckCircle2 size={32} className="text-slate-600 mb-1" />
                  <span className="text-xs font-semibold">No {historyFilter !== 'all' ? historyFilter : ''} orders found for today</span>
                </div>
              ) : (
                filteredHistoryOrders.map((order) => {
                  const isCancelled = order.status === 'cancelled';

                  return (
                    <div
                      key={order.id}
                      className={`rounded-2xl p-4 border space-y-3 transition-all ${
                        isCancelled
                          ? 'bg-red-950/20 border-red-800/40'
                          : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-extrabold text-xs px-2.5 py-0.5 rounded-lg border font-display ${
                              isCancelled
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            Table {order.table?.table_number ?? '?'}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            #{order.id.slice(0, 6)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                            <Clock size={12} />
                            {formatOrderTime(order.created_at)}
                          </span>
                          {renderCancelledByBadge(order)}
                        </div>
                      </div>

                      {/* Itemized breakdown */}
                      <div className="space-y-1 py-1">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="text-xs flex justify-between gap-2">
                            <span className={isCancelled ? 'text-slate-400 line-through' : 'text-slate-300'}>
                              <span className={`font-bold mr-1.5 ${isCancelled ? 'text-red-400/80' : 'text-amber-400'}`}>
                                {item.quantity}x
                              </span>
                              {item.menu_item?.name || 'Item'}
                            </span>
                            <span className={`font-mono text-[11px] ${isCancelled ? 'text-red-400/80 line-through' : 'text-slate-400'}`}>
                              ₹{(item.price_at_order * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Footer: Amount & Re-print Bill Action */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs font-bold font-mono">
                          {isCancelled ? (
                            <span className="text-red-400 line-through">
                              Cancelled Total: ₹{order.total.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-200">
                              Settled Amount: ₹{order.total.toFixed(2)}
                            </span>
                          )}
                        </span>

                        {!isCancelled ? (
                          <button
                            onClick={() => {
                              setIsHistoryOpen(false);
                              setReceiptToPrint({
                                tableId: order.table_id || 'table',
                                tableNumber: order.table?.table_number ?? 'Counter',
                                orders: [order],
                                groupTotal: Number(order.total),
                              });
                            }}
                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Re-print customer receipt"
                          >
                            <Printer size={13} />
                            Re-print Bill
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-red-400/80 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">
                            Cancelled (No Bill)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Takeaway / Counter Order POS Billing Modal */}
      <TakeawayBillingModal
        isOpen={isTakeawayModalOpen}
        onClose={() => setIsTakeawayModalOpen(false)}
        onOrderCreated={handleTakeawayOrderCreated}
      />
    </main>
  );
}
