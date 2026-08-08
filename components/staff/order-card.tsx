'use client';

import React from 'react';
import { Order, OrderStatus } from '@/lib/types/database.types';
import { OrderStatusBadge } from '@/components/ui/badge';
import { Clock, ArrowRight, XCircle, Trash2 } from 'lucide-react';
import { updateOrderStatus } from '@/lib/queries/orders';
import { toast } from 'sonner';

interface OrderCardProps {
  order: Order;
  onStatusUpdated?: (orderId?: string, newStatus?: OrderStatus) => void;
}

const nextStatusMap: Record<OrderStatus, OrderStatus | null> = {
  received: 'preparing',
  preparing: 'ready',
  ready: 'served',
  served: null,
  paid: null,
  cancelled: null,
};

const actionLabelMap: Record<OrderStatus, string> = {
  received: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark Served',
  served: 'Served',
  paid: 'Finished',
  cancelled: 'Cancelled',
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, onStatusUpdated }) => {
  const nextStatus = nextStatusMap[order.status];
  const [countdown, setCountdown] = React.useState<number>(10);
  const [isCollapsing, setIsCollapsing] = React.useState<boolean>(false);

  const handleDismissOrder = React.useCallback(async () => {
    setIsCollapsing(true);
    setTimeout(() => {
      onStatusUpdated?.(order.id, 'paid');
    }, 300);
  }, [order.id, onStatusUpdated]);

  React.useEffect(() => {
    if (order.status !== 'served') return;

    const secondsAgo = Math.floor(
      (Date.now() - new Date(order.updated_at || order.created_at).getTime()) / 1000
    );
    const initialRemaining = Math.max(0, 10 - secondsAgo);

    if (initialRemaining <= 0) {
      onStatusUpdated?.(order.id, 'paid');
      return;
    }

    setCountdown(initialRemaining);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleDismissOrder();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [order.id, order.status, order.updated_at, order.created_at, handleDismissOrder, onStatusUpdated]);

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;
    // Optimistic UI update
    onStatusUpdated?.(order.id, nextStatus);
    toast.success(`Order #${order.id.slice(0, 5)} updated to ${nextStatus}`);

    const success = await updateOrderStatus(order.id, nextStatus);
    if (!success) {
      toast.error('Failed to update order status');
      onStatusUpdated?.();
    }
  };

  const handleCancelOrder = async () => {
    if (order.status === 'served') {
      toast.error('Served orders cannot be cancelled.');
      return;
    }

    if (confirm('Are you sure you want to cancel this order?')) {
      // Optimistic UI update
      onStatusUpdated?.(order.id, 'cancelled');
      toast.info('Order cancelled');

      const success = await updateOrderStatus(order.id, 'cancelled', 'staff');
      if (!success) {
        toast.error('Failed to cancel order');
        onStatusUpdated?.();
      }
    }
  };

  const timeAgo = (dateStr: string) => {
    const minutes = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    return `${minutes} mins ago`;
  };

  return (
    <div
      className={`kanban-card group transition-all duration-300 ${isCollapsing ? 'opacity-0 scale-95 max-h-0 overflow-hidden py-0 my-0 border-none' : ''
        }`}
    >
      {/* Top Header: Table Number, Time & Cancel Action */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 gap-1.5 min-w-0 w-full">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="bg-amber-500 text-slate-950 font-extrabold text-xs px-2 py-0.5 rounded-lg font-display flex-shrink-0">
            Table {order.table?.table_number ?? '?'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono truncate">#{order.id.slice(0, 6)}</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {order.status === 'cancelled' ? (
            <span
              className={`border text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                order.cancelled_by === 'customer'
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : order.cancelled_by === 'staff'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  order.cancelled_by === 'customer'
                    ? 'bg-red-400 animate-pulse'
                    : order.cancelled_by === 'staff'
                    ? 'bg-amber-400'
                    : 'bg-red-400'
                }`}
              />
              {order.cancelled_by === 'customer'
                ? 'Cancelled by Customer'
                : order.cancelled_by === 'staff'
                ? 'Cancelled by Staff'
                : 'Cancelled'}
            </span>
          ) : order.status === 'served' ? (
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Clearing {countdown}s
            </span>
          ) : (
            <>
              <div className="flex items-center gap-0.5 text-[10px] text-slate-400">
                <Clock size={11} />
                {timeAgo(order.created_at)}
              </div>
              <button
                onClick={handleCancelOrder}
                className="text-slate-500 hover:text-red-400 p-0.5 rounded-md hover:bg-red-500/10 transition-colors cursor-pointer flex-shrink-0"
                title="Cancel Order"
              >
                <XCircle size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-2 py-1">
        {order.order_items?.map((item) => (
          <div key={item.id} className="text-xs flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="font-bold text-amber-400 mr-1.5">{item.quantity}x</span>
              <span className="text-slate-200 font-medium">{item.menu_item?.name || 'Item'}</span>
              {item.notes && (
                <p className="text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 mt-0.5 italic">
                  Note: {item.notes}
                </p>
              )}
            </div>
            <span className="text-slate-400 font-mono flex-shrink-0">
              ₹{(item.price_at_order * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer & Primary Action Button */}
      <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2 mt-auto">
        <div className="flex-shrink-0">
          <span className="text-sm font-extrabold text-slate-100 font-display block whitespace-nowrap">
            ₹{order.total.toFixed(2)}
          </span>
          {order.status === 'cancelled' && (
            <span
              className={`text-[10px] font-bold italic block ${
                order.cancelled_by === 'customer' ? 'text-red-400' : 'text-amber-400'
              }`}
            >
              {order.cancelled_by === 'customer'
                ? 'Cancelled by Customer'
                : order.cancelled_by === 'staff'
                ? 'Cancelled by Staff'
                : 'Cancelled order'}
            </span>
          )}
        </div>

        {order.status === 'cancelled' ? (
          <button
            onClick={handleDismissOrder}
            className="text-xs font-bold text-slate-300 hover:text-red-400 bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/30 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 shadow-sm"
            title="Clear this cancelled order from dashboard"
          >
            <Trash2 size={13} />
            Clear
          </button>
        ) : order.status === 'served' ? (
          <button
            onClick={handleDismissOrder}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
            title="Clear served order immediately"
          >
            Clear Now
          </button>
        ) : (
          nextStatus && (
            <button
              onClick={handleAdvanceStatus}
              className="staff-action-btn bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/10 flex-shrink-0 text-xs px-2.5 py-1.5 rounded-lg"
            >
              <span className="truncate">{actionLabelMap[order.status]}</span>
              <ArrowRight size={13} className="flex-shrink-0" />
            </button>
          )
        )}
      </div>
    </div>
  );
};
