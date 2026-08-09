'use client';

import React, { useState } from 'react';
import { Order, OrderStatus } from '@/lib/types/database.types';
import { OrderCard } from './order-card';
import { OrderStatusBadge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface KanbanColumnProps {
  title: string;
  status: OrderStatus;
  orders: Order[];
  onOrderUpdated?: (orderId?: string, newStatus?: OrderStatus, cancelledBy?: string) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  orders,
  onOrderUpdated,
}) => {
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

  // Active served orders (last 10 seconds)
  const activeServedOrders = status === 'served'
    ? orders.filter((o) => {
        if (o.status !== 'served') return false;
        const secondsAgo = Math.floor(
          (Date.now() - new Date(o.updated_at || o.created_at).getTime()) / 1000
        );
        return secondsAgo < 10;
      })
    : [];

  // Completed/paid served orders (>= 10 seconds ago or paid)
  const completedPaidToday = status === 'served'
    ? orders.filter((o) => {
        if (o.status === 'paid') return true;
        if (o.status === 'served') {
          const secondsAgo = Math.floor(
            (Date.now() - new Date(o.updated_at || o.created_at).getTime()) / 1000
          );
          return secondsAgo >= 10;
        }
        return false;
      })
    : [];

  // Active recent cancelled orders (last 10 seconds)
  const activeCancelledOrders = status === 'cancelled'
    ? orders.filter((o) => {
        const secondsAgo = Math.floor(
          (Date.now() - new Date(o.updated_at || o.created_at).getTime()) / 1000
        );
        return secondsAgo < 10;
      })
    : [];

  // Collapsed older cancelled orders (>= 10 seconds ago)
  const olderCancelledOrders = status === 'cancelled'
    ? orders.filter((o) => {
        const secondsAgo = Math.floor(
          (Date.now() - new Date(o.updated_at || o.created_at).getTime()) / 1000
        );
        return secondsAgo >= 10;
      })
    : [];

  const displayActiveOrders =
    status === 'served'
      ? activeServedOrders
      : status === 'cancelled'
      ? activeCancelledOrders
      : orders;

  const hasExpandableHistory =
    (status === 'served' && completedPaidToday.length > 0) ||
    (status === 'cancelled' && olderCancelledOrders.length > 0);

  return (
    <div className="kanban-column">
      {/* Column Header */}
      <div className="pb-3 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-bold text-sm text-slate-200 font-display truncate">{title}</h3>
            {hasExpandableHistory ? (
              <button
                onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-all cursor-pointer flex-shrink-0 ${
                  status === 'cancelled'
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
                title={
                  isCompletedExpanded
                    ? `Hide collapsed ${status} orders`
                    : `Show collapsed ${status} orders`
                }
              >
                <span>{orders.length}</span>
                {isCompletedExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            ) : (
              <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                {orders.length}
              </span>
            )}
          </div>
          <OrderStatusBadge status={status} className="flex-shrink-0" />
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pr-0.5">
        {displayActiveOrders.length === 0 && (!isCompletedExpanded || !hasExpandableHistory) ? (
          <div className="h-32 border border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-xs text-slate-600">
            No orders
          </div>
        ) : (
          <>
            {/* Active Orders */}
            {displayActiveOrders.map((order) => (
              <OrderCard key={order.id} order={order} onStatusUpdated={onOrderUpdated} />
            ))}

            {/* Collapsed Served Orders History */}
            {status === 'served' && isCompletedExpanded && completedPaidToday.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-emerald-500/20">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider px-1">
                  Served Today ({completedPaidToday.length})
                </div>
                {completedPaidToday.map((order) => (
                  <OrderCard key={order.id} order={order} onStatusUpdated={onOrderUpdated} />
                ))}
              </div>
            )}

            {/* Collapsed Cancelled Orders History */}
            {status === 'cancelled' && isCompletedExpanded && olderCancelledOrders.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-red-500/20">
                <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider px-1">
                  Cancelled History ({olderCancelledOrders.length})
                </div>
                {olderCancelledOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onStatusUpdated={onOrderUpdated} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
