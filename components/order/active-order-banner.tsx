'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Order, OrderStatus } from '@/lib/types/database.types';
import { fetchOrderDetailsById } from '@/lib/queries/orders';
import { getActiveOrderIdsForTable, removeOrderFromLocalStorage } from '@/lib/utils/order-session';
import { OrderStatusBadge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ActiveOrderBannerProps {
  tableToken: string;
  hasCartItems?: boolean;
}

export const ActiveOrderBanner: React.FC<ActiveOrderBannerProps> = ({
  tableToken,
  hasCartItems = false,
}) => {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const syncActiveOrders = useCallback(async () => {
    if (!tableToken) return;

    const storedIds = getActiveOrderIdsForTable(tableToken);
    if (storedIds.length === 0) {
      setActiveOrders([]);
      return;
    }

    const fetchedOrders = await Promise.all(
      storedIds.map((id) => fetchOrderDetailsById(id))
    );

    const validActiveOrders: Order[] = [];

    for (let i = 0; i < storedIds.length; i++) {
      const orderId = storedIds[i];
      const order = fetchedOrders[i];

      if (!order || order.status === 'paid' || order.status === 'cancelled') {
        // Order is finished or cancelled — purge from table-scoped localStorage
        removeOrderFromLocalStorage(tableToken, orderId);
      } else {
        validActiveOrders.push(order);
      }
    }

    setActiveOrders(validActiveOrders);
  }, [tableToken]);

  useEffect(() => {
    syncActiveOrders();
  }, [syncActiveOrders]);

  // Realtime subscription for status updates on active orders
  useEffect(() => {
    if (!tableToken || activeOrders.length === 0) return;

    const supabase = createClient();
    const orderIds = activeOrders.map((o) => o.id);

    const channel = supabase
      .channel(`active-orders-banner-${tableToken}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          if (orderIds.includes(updatedOrder.id)) {
            syncActiveOrders();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableToken, activeOrders, syncActiveOrders]);

  if (activeOrders.length === 0) return null;

  const currentOrder = activeOrders[selectedIndex] || activeOrders[0];
  const tableNum = currentOrder.table?.table_number;

  // Stack above sticky cart bar (bottom-24) if cart has items, else bottom-4
  const bottomPosition = hasCartItems ? 'bottom-24' : 'bottom-4';

  return (
    <div
      className={`fixed ${bottomPosition} left-4 right-4 max-w-[448px] mx-auto z-35 bg-slate-900/95 backdrop-blur-xl rounded-2xl p-3.5 border border-amber-500/30 shadow-2xl transition-all duration-300 animate-slide-up`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Clock size={20} className="animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 truncate">
                {tableNum ? `Table ${tableNum}` : 'Active Order'}
              </span>
              <OrderStatusBadge status={currentOrder.status} className="flex-shrink-0 !py-0.5 text-[10px]" />
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {activeOrders.length > 1
                ? `Order ${selectedIndex + 1} of ${activeOrders.length} · ₹${currentOrder.total.toFixed(2)}`
                : `Total: ₹${currentOrder.total.toFixed(2)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {activeOrders.length > 1 && (
            <button
              onClick={() => setSelectedIndex((prev) => (prev + 1) % activeOrders.length)}
              className="text-[10px] text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-1.5 rounded-lg border border-amber-500/20 font-bold transition-all"
              title="Next Order"
            >
              Next ({activeOrders.length})
            </button>
          )}

          <Link
            href={`/order/status/${currentOrder.id}?t=${tableToken}`}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1"
          >
            Track <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};
