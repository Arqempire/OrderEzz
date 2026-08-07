import React from 'react';
import { OrderStatus } from '@/lib/types/database.types';
import { clsx } from 'clsx';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig: Record<OrderStatus, { label: string; styleClass: string }> = {
  received: { label: 'Received', styleClass: 'status-badge-received' },
  preparing: { label: 'Preparing', styleClass: 'status-badge-preparing' },
  ready: { label: 'Ready', styleClass: 'status-badge-ready' },
  served: { label: 'Served', styleClass: 'status-badge-served' },
  paid: { label: 'Paid', styleClass: 'status-badge-paid' },
  cancelled: { label: 'Cancelled', styleClass: 'status-badge-cancelled' },
};

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status] || { label: status, styleClass: 'bg-slate-800 text-slate-300' };

  return (
    <span className={clsx('px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5', config.styleClass, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
};
