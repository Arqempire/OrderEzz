'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Order, OrderStatus } from '@/lib/types/database.types';
import { createClient } from '@/lib/supabase/client';
import { OrderStatusBadge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Utensils, Sparkles, CheckCheck, RefreshCw, PlusCircle, Radio, XCircle } from 'lucide-react';
import { fetchOrderDetailsById, cancelCustomerOrder } from '@/lib/queries/orders';
import { getActiveOrderIdsForTable, removeOrderFromLocalStorage } from '@/lib/utils/order-session';
import { markOrderCancelledByCustomer } from '@/lib/utils/order-cancellation';
import { ThankYouFeedbackCard } from '@/components/order/thank-you-feedback-card';
import { toast } from 'sonner';
import Link from 'next/link';

interface OrderStatusTrackerProps {
  initialOrder: Order;
}

const statusSteps: Array<{ key: OrderStatus; title: string; desc: string; icon: React.ElementType }> = [
  { key: 'received', title: 'Order Received', desc: 'Sent to the kitchen staff', icon: Clock },
  { key: 'preparing', title: 'Preparing', desc: 'Chefs are crafting your dish', icon: Utensils },
  { key: 'ready', title: 'Ready', desc: 'Food is ready to be brought out', icon: Sparkles },
  { key: 'served', title: 'Served', desc: 'Enjoy your meal!', icon: CheckCircle2 },
  { key: 'paid', title: 'Completed', desc: 'Order settled at counter', icon: CheckCheck },
];

export const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({ initialOrder }) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [sessionOrders, setSessionOrders] = useState<Order[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const currentStatusRef = useRef<string>(initialOrder.status);

  // Keep ref synchronized to avoid unnecessary useEffect re-subscriptions
  useEffect(() => {
    currentStatusRef.current = order.status;
  }, [order.status]);

  const refreshOrder = useCallback(async () => {
    const updated = await fetchOrderDetailsById(order.id);
    if (updated) {
      setOrder(updated);
    }
  }, [order.id]);

  const syncSessionOrders = useCallback(async () => {
    const tableQrToken = order.table?.qr_token;
    if (!tableQrToken) return;

    const storedIds = getActiveOrderIdsForTable(tableQrToken);
    if (storedIds.length <= 1) {
      setSessionOrders([]);
      return;
    }

    const fetched = await Promise.all(
      storedIds.map((id) => fetchOrderDetailsById(id))
    );

    const valid = fetched.filter(
      (o): o is Order => o !== null && o.status !== 'cancelled' && o.status !== 'paid'
    );

    setSessionOrders(valid);
  }, [order.table?.qr_token]);

  useEffect(() => {
    syncSessionOrders();
  }, [syncSessionOrders]);

  useEffect(() => {
    const supabase = createClient();

    // 1. Subscribe to Supabase Realtime WebSocket changes for this order ID
    const channel = supabase
      .channel(`order-tracker-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        async () => {
          refreshOrder();
          syncSessionOrders();
        }
      )
      .subscribe();

    // 2. Lightweight background polling (every 8 seconds) as a silent fallback
    const pollTimer = setInterval(async () => {
      const updated = await fetchOrderDetailsById(order.id);
      if (updated && updated.status !== currentStatusRef.current) {
        setOrder(updated);
        syncSessionOrders();
      }
    }, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollTimer);
    };
  }, [order.id, refreshOrder, syncSessionOrders]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshOrder(), syncSessionOrders()]);
    setIsRefreshing(false);
  };

  const tableQrToken = order.table?.qr_token;

  const sessionTotal = sessionOrders.length > 0
    ? sessionOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    : order.total;

  const handleCancelOrder = async () => {
    if (!confirm(`Are you sure you want to cancel Order #${order.id.slice(0, 6)}?`)) return;

    setIsCancelling(true);
    const result = await cancelCustomerOrder(order.id);
    setIsCancelling(false);

    if (result.success) {
      toast.info('Your order has been cancelled.');
      if (tableQrToken) {
        removeOrderFromLocalStorage(tableQrToken, order.id);
      }
      markOrderCancelledByCustomer(order.id);
      setOrder((prev) => ({ ...prev, status: 'cancelled', cancelled_by: 'customer' }));
      syncSessionOrders();
    } else {
      toast.error(result.error || 'Failed to cancel order.');
    }
  };

  const getStepStatus = (stepKey: OrderStatus) => {
    const orderIndex = statusSteps.findIndex((s) => s.key === order.status);
    const stepIndex = statusSteps.findIndex((s) => s.key === stepKey);

    if (order.status === 'cancelled') return 'cancelled';
    if (stepIndex < orderIndex) return 'completed';
    if (stepIndex === orderIndex) return 'current';
    return 'upcoming';
  };

  // If the order has reached paid / completed status, show the Thank You & Feedback screen!
  if (order.status === 'paid') {
    return <ThankYouFeedbackCard order={order} />;
  }

  return (
    <div className="space-y-6">
      {/* Header status summary card */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 text-center relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <Radio size={12} className="animate-pulse text-emerald-400" />
            <span>Live Auto-Updating</span>
          </div>

          <button
            onClick={handleManualRefresh}
            className="text-slate-400 hover:text-amber-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="my-2">
          <OrderStatusBadge status={order.status} className="scale-110" />
        </div>

        <h2 className="text-2xl font-extrabold text-slate-100 font-display mt-4">
          {statusSteps.find((s) => s.key === order.status)?.title || 'Order Update'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {statusSteps.find((s) => s.key === order.status)?.desc || 'Status updated'}
        </p>

        {order.created_at && (
          <p className="text-[11px] text-amber-400/90 font-mono mt-2 flex items-center justify-center gap-1">
            <Clock size={12} />
            <span>Placed: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </p>
        )}

        {/* Customer Cancel Order Action (Allowed only when status === 'received') */}
        {order.status === 'received' && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <span className="text-xs text-slate-400 font-medium">
              Order can be cancelled before kitchen starts preparing
            </span>
            <button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 flex-shrink-0"
            >
              <XCircle size={14} className={isCancelling ? 'animate-spin' : ''} />
              {isCancelling ? 'Cancelling…' : 'Cancel Order'}
            </button>
          </div>
        )}

        {order.status !== 'received' && order.status !== 'cancelled' && (
          <div className="mt-4 pt-3 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-500 italic">
              Kitchen has started preparing your dish — cancellation is no longer available.
            </span>
          </div>
        )}
      </div>

      {/* Explore Menu Banner Action */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800 text-center space-y-3 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30">
        <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-sm font-display">
          <Utensils size={18} /> Want to add extra drinks or dessert?
        </div>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Your order is actively being processed! You can browse the menu anytime to order more items for Table {order.table?.table_number ?? ''}.
        </p>
        <div className="flex items-center justify-center gap-3 pt-1">
          {tableQrToken && (
            <Link
              href={`/order?t=${tableQrToken}`}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <PlusCircle size={15} /> Order More Items
            </Link>
          )}
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800">
        <h3 className="text-sm font-bold text-slate-200 mb-6 font-display">Live Order Status Timeline</h3>
        
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {statusSteps.map((step) => {
            const state = getStepStatus(step.key);
            const Icon = step.icon;

            return (
              <div key={step.key} className="relative flex items-start gap-4">
                {/* Timeline Dot */}
                <div
                  className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                    state === 'completed'
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                      : state === 'current'
                      ? 'bg-amber-500 border-amber-400 text-slate-950 scale-125 shadow-lg shadow-amber-500/30 animate-pulse'
                      : 'bg-slate-900 border-slate-700 text-slate-600'
                  }`}
                >
                  <Icon size={10} />
                </div>

                <div>
                  <h4
                    className={`text-sm font-bold leading-tight ${
                      state === 'current'
                        ? 'text-amber-400 font-display'
                        : state === 'completed'
                        ? 'text-slate-200'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Summary Items */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 font-display border-b border-slate-800 pb-3 flex justify-between items-center">
          <span>Order Items Summary</span>
          <span className="text-xs text-slate-400 font-mono">#{order.id.slice(0, 6)}</span>
        </h3>

        <div className="divide-y divide-slate-800/60">
          {order.order_items?.map((item) => (
            <div key={item.id} className="py-2.5 flex items-start justify-between text-xs">
              <div>
                <div className="font-semibold text-slate-200">
                  <span className="text-amber-400 font-bold mr-1.5">{item.quantity}x</span>
                  {item.menu_item?.name || 'Item'}
                </div>
                {item.notes && <p className="text-slate-400 italic text-[11px] mt-0.5">Note: {item.notes}</p>}
              </div>
              <span className="font-bold text-slate-300 font-display">
                ₹{(item.price_at_order * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {sessionOrders.length > 1 ? (
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>This Order Total (#{order.id.slice(0, 6)})</span>
              <span className="font-bold text-slate-200 font-mono">₹{order.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800/80">
              <span className="font-bold text-amber-400 font-display">
                Combined Table Session Bill ({sessionOrders.length} active orders)
              </span>
              <span className="text-xl font-extrabold text-amber-400 font-display">
                ₹{sessionTotal.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-400">Total Amount</span>
            <span className="text-lg font-extrabold text-amber-400 font-display">
              ₹{order.total.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
