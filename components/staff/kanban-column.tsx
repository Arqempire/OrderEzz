'use client';

import React from 'react';
import { Order, OrderStatus } from '@/lib/types/database.types';
import { OrderCard } from './order-card';
import { OrderStatusBadge } from '@/components/ui/badge';

interface KanbanColumnProps {
  title: string;
  status: OrderStatus;
  orders: Order[];
  onOrderUpdated?: (orderId?: string, newStatus?: OrderStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  orders,
  onOrderUpdated,
}) => {
  return (
    <div className="kanban-column">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-bold text-sm text-slate-200 font-display truncate">{title}</h3>
          <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
            {orders.length}
          </span>
        </div>
        <OrderStatusBadge status={status} className="flex-shrink-0" />
      </div>

      {/* Cards List */}
      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {orders.length === 0 ? (
          <div className="h-32 border border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-xs text-slate-600">
            No orders
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} onStatusUpdated={onOrderUpdated} />
          ))
        )}
      </div>
    </div>
  );
};
