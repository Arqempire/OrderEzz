'use client';

import React from 'react';
import { Order, OrderStatus } from '@/lib/types/database.types';
import { OrderStatusBadge } from '@/components/ui/badge';
import { Clock, ArrowRight, XCircle, User, Phone } from 'lucide-react';
import { updateOrderStatus } from '@/lib/queries/orders';
import { markOrderCancelledByStaff, getOrderCancellationSource } from '@/lib/utils/order-cancellation';
import { extractGuestInfoFromOrder, formatCleanItemNotes } from '@/lib/utils/guest-info';
import { toast } from 'sonner';

interface OrderCardProps {
  order: Order;
  onStatusUpdated?: (orderId?: string, newStatus?: OrderStatus, cancelledBy?: string) => void;
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
    if (order.status === 'served' || order.status === 'paid') {
      toast.error('Served or completed orders cannot be cancelled.');
      return;
    }

    if (confirm(`Are you sure you want to cancel Order #${order.id.slice(0, 6)}?`)) {
      // Optimistic UI update & local tracking
      markOrderCancelledByStaff(order.id);
      onStatusUpdated?.(order.id, 'cancelled', 'staff');
      toast.info('Order cancelled');

      const success = await updateOrderStatus(order.id, 'cancelled', 'staff');
      if (!success) {
        toast.error('Failed to cancel order');
        onStatusUpdated?.();
      }
    }
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

  const cancellationSource = order.status === 'cancelled'
    ? getOrderCancellationSource(order.id, order.cancelled_by)
    : 'unknown';

  const guestInfo = extractGuestInfoFromOrder(order);

  return (
    <div
      className={`kanban-card group transition-all duration-300 relative overflow-hidden ${
        isCollapsing ? 'opacity-0 scale-95 max-h-0 overflow-hidden py-0 my-0 border-none' : ''
      }`}
    >
      {/* Top Header: Table Number, Order ID, Time & Cancel Action */}
      <div className="flex flex-col gap-1.5 pb-2 border-b border-slate-800 w-full">
        <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
          {/* Left Side: Table Badge & Order ID */}
          <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
            <span className="bg-amber-500 text-slate-950 font-extrabold text-xs px-2 py-0.5 rounded-lg font-display flex-shrink-0">
              Table {order.table?.table_number ?? '?'}
            </span>
            <span className="text-[11px] text-slate-300 font-mono font-bold truncate min-w-0">
              #{order.id.slice(0, 6)}
            </span>
          </div>

          {/* Right Side: Status / Time / Cancel Button */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto text-right">
            {order.status === 'served' && countdown > 0 ? (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Clearing {countdown}s
              </span>
            ) : (
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5 text-[10px] text-slate-400 font-mono whitespace-nowrap">
                  <Clock size={11} className="flex-shrink-0" />
                  <span>{formatOrderTime(order.created_at)}</span>
                </div>
                {/* Cancel Button ONLY shown for active non-served/non-cancelled orders */}
                {order.status !== 'served' && order.status !== 'paid' && order.status !== 'cancelled' && (
                  <button
                    onClick={handleCancelOrder}
                    className="text-slate-400 hover:text-red-400 p-0.5 rounded-md hover:bg-red-500/10 transition-colors cursor-pointer flex-shrink-0 ml-0.5"
                    title="Cancel Order"
                  >
                    <XCircle size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Guest Info Badge */}
        {(guestInfo.name || guestInfo.phone) && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 flex items-center justify-between text-[11px] gap-1.5">
            <div className="flex items-center gap-1 text-amber-300 font-bold truncate">
              <User size={12} className="text-amber-400 flex-shrink-0" />
              <span>{guestInfo.name || 'Guest'}</span>
            </div>
            {guestInfo.phone && (
              <div className="flex items-center gap-1 text-slate-300 font-mono text-[10px] flex-shrink-0">
                <Phone size={10} className="text-amber-400" />
                <span>{guestInfo.phone}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items list */}
      <div className="space-y-2 py-1">
        {order.order_items?.map((item) => {
          const cleanNotes = formatCleanItemNotes(item.notes);

          return (
            <div key={item.id} className="text-xs flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="font-bold text-amber-400 mr-1.5">{item.quantity}x</span>
                <span className="text-slate-200 font-medium">{item.menu_item?.name || 'Item'}</span>
                {cleanNotes && (
                  <p className="text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 mt-0.5 italic">
                    Note: {cleanNotes}
                  </p>
                )}
              </div>
              <span className="text-slate-400 font-mono flex-shrink-0">
                ₹{(item.price_at_order * item.quantity).toFixed(2)}
              </span>
            </div>
          );
        })}
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
                cancellationSource === 'customer'
                  ? 'text-red-400'
                  : 'text-amber-400'
              }`}
            >
              {cancellationSource === 'customer'
                ? 'Cancelled by Customer'
                : 'Cancelled by Staff'}
            </span>
          )}
        </div>

        {order.status === 'cancelled' ? null : order.status === 'served' ? (
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
