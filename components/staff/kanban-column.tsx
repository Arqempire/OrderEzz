'use client';

import React, { useState } from 'react';
import { Order, OrderStatus } from '@/lib/types/database.types';
import { OrderCard } from './order-card';
import { OrderStatusBadge } from '@/components/ui/badge';
import { Trash2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface KanbanColumnProps {
  title: string;
  status: OrderStatus;
  orders: Order[];
  onOrderUpdated?: (orderId?: string, newStatus?: OrderStatus) => void;
  onClearAll?: () => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  orders,
  onOrderUpdated,
  onClearAll,
}) => {
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

  const activeOrders = status === 'served'
    ? orders.filter((o) => o.status === 'served')
    : orders;

  const completedPaidToday = status === 'served'
    ? orders.filter((o) => o.status === 'paid')
    : [];

  return (
    <div className="kanban-column">
      {/* Column Header */}
      <div className="pb-3 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-bold text-sm text-slate-200 font-display truncate">{title}</h3>
            {status === 'served' && completedPaidToday.length > 0 ? (
              <button
                onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-all cursor-pointer flex-shrink-0"
                title={isCompletedExpanded ? 'Hide completed orders' : 'Show completed orders today'}
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

        {status === 'cancelled' && orders.length > 0 && onClearAll && (
          <div className="pt-1 border-t border-slate-800/60">
            <button
              onClick={onClearAll}
              className="w-full text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Clear all cancelled orders from dashboard"
            >
              <Trash2 size={12} /> Clear All Cancelled ({orders.length})
            </button>
          </div>
        )}
      </div>

      {/* Cards List */}
      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {activeOrders.length === 0 && (!isCompletedExpanded || completedPaidToday.length === 0) ? (
          <div className="h-32 border border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-xs text-slate-600">
            No orders
          </div>
        ) : (
          <>
            {/* Active Served Orders */}
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} onStatusUpdated={onOrderUpdated} />
            ))}

            {/* Completed Orders List (Toggled by clicking count badge beside Served in header) */}
            {status === 'served' && isCompletedExpanded && completedPaidToday.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-emerald-500/20">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider px-1">
                  Completed Today ({completedPaidToday.length})
                </div>
                {completedPaidToday.map((order) => (
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
