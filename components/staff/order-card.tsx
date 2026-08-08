'use client';

import React from 'react';
import { Order, OrderStatus } from '@/lib/types/database.types';
import { OrderStatusBadge } from '@/components/ui/badge';
import { Clock, ArrowRight, XCircle } from 'lucide-react';
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
  served: 'paid',
  paid: null,
  cancelled: null,
};

const actionLabelMap: Record<OrderStatus, string> = {
  received: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark Served',
  served: 'Complete & Paid',
  paid: 'Finished',
  cancelled: 'Cancelled',
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, onStatusUpdated }) => {
  const nextStatus = nextStatusMap[order.status];

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
    if (confirm('Are you sure you want to cancel this order?')) {
      // Optimistic UI update
      onStatusUpdated?.(order.id, 'cancelled');
      toast.info('Order cancelled');

      const success = await updateOrderStatus(order.id, 'cancelled');
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
    <div className="kanban-card group">
      {/* Top Header: Table Number & Time */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="bg-amber-500 text-slate-950 font-extrabold text-sm px-2.5 py-0.5 rounded-lg font-display">
            Table {order.table?.table_number ?? '?'}
          </span>
          <span className="text-xs text-slate-400 font-mono">#{order.id.slice(0, 6)}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Clock size={12} />
          {timeAgo(order.created_at)}
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-2 py-1">
        {order.order_items?.map((item) => (
          <div key={item.id} className="text-xs flex items-start justify-between">
            <div>
              <span className="font-bold text-amber-400 mr-1.5">{item.quantity}x</span>
              <span className="text-slate-200 font-medium">{item.menu_item?.name || 'Item'}</span>
              {item.notes && (
                <p className="text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 mt-0.5 italic">
                  Note: {item.notes}
                </p>
              )}
            </div>
            <span className="text-slate-400 font-mono">
              ₹{(item.price_at_order * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer & Action Buttons */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 mt-auto">
        <span className="text-sm font-extrabold text-slate-100 font-display">
          ₹{order.total.toFixed(2)}
        </span>

        <div className="flex items-center gap-1.5">
          {order.status !== 'paid' && order.status !== 'cancelled' && (
            <button
              onClick={handleCancelOrder}
              className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="Cancel Order"
            >
              <XCircle size={16} />
            </button>
          )}

          {nextStatus && (
            <button
              onClick={handleAdvanceStatus}
              className="staff-action-btn bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/10"
            >
              {actionLabelMap[order.status]}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
