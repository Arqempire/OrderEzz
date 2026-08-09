'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Order } from '@/lib/types/database.types';
import { fetchAllActiveOrders, updateOrderStatus } from '@/lib/queries/orders';
import { KanbanColumn } from '@/components/staff/kanban-column';
import { StaffLogoutButton } from '@/components/staff/staff-logout-button';
import { TableRequestsPanel } from '@/components/staff/table-requests-panel';
import { createClient } from '@/lib/supabase/client';
import { UtensilsCrossed, RefreshCw, LogOut, MessageSquare } from 'lucide-react';
import Link from 'next/link';

import { toast } from 'sonner';

export default function StaffOrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [formattedSyncTime, setFormattedSyncTime] = useState<string>('');

  useEffect(() => {
    setFormattedSyncTime(lastRefreshed.toLocaleTimeString());
  }, [lastRefreshed]);

  const loadOrders = useCallback(async () => {
    const data = await fetchAllActiveOrders();
    setOrders(data);
    setLastRefreshed(new Date());
    setIsLoading(false);
  }, []);

  const handleOrderUpdated = useCallback(
    (orderId?: string, newStatus?: Order['status']) => {
      if (orderId && newStatus) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      } else {
        loadOrders();
      }
    },
    [loadOrders]
  );

  const handleClearAllCancelled = async () => {
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled');
    if (cancelledOrders.length === 0) return;

    if (confirm(`Are you sure you want to clear all ${cancelledOrders.length} cancelled orders?`)) {
      setOrders((prev) => prev.filter((o) => o.status !== 'cancelled'));
      toast.info(`Cleared ${cancelledOrders.length} cancelled orders`);

      await Promise.all(
        cancelledOrders.map((o) => updateOrderStatus(o.id, 'paid'))
      );
    }
  };

  useEffect(() => {
    loadOrders();

    // Setup single Supabase Realtime subscription for orders
    const supabase = createClient();
    const channel = supabase
      .channel('staff-kanban-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  const getOrdersByStatus = (status: Order['status']) => {
    return orders.filter((o) => o.status === status);
  };

  return (
    <main className="staff-dashboard-container">
      {/* Top Navbar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <UtensilsCrossed size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold font-display text-slate-100">
                Kitchen & Server Dashboard
              </h1>
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border border-emerald-500/20 animate-pulse">
                Live Realtime
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5" suppressHydrationWarning>
              Auto-updating via Supabase Realtime • Last sync: {formattedSyncTime}
            </p>
          </div>
        </div>

        {/* Quick Navbar Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadOrders}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <Link
            href="/staff/menu"
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-2 rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-colors"
          >
            <UtensilsCrossed size={14} />
            Menu Stock
          </Link>

          <Link
            href="/staff/feedback"
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <MessageSquare size={14} />
            Reviews & Feedback
          </Link>

          <StaffLogoutButton />
        </div>
      </header>

      {/* Live Table Requests Panel ('Call Waiter' & 'Request Water') */}
      <TableRequestsPanel />

      {/* Kanban Board Columns */}
      <div className="kanban-board">
        <KanbanColumn
          title="Received"
          status="received"
          orders={getOrdersByStatus('received')}
          onOrderUpdated={handleOrderUpdated}
        />
        <KanbanColumn
          title="Preparing"
          status="preparing"
          orders={getOrdersByStatus('preparing')}
          onOrderUpdated={handleOrderUpdated}
        />
        <KanbanColumn
          title="Ready for Pickup"
          status="ready"
          orders={getOrdersByStatus('ready')}
          onOrderUpdated={handleOrderUpdated}
        />
        <KanbanColumn
          title="Served"
          status="served"
          orders={orders.filter((o) => o.status === 'served' || o.status === 'paid')}
          onOrderUpdated={handleOrderUpdated}
        />
        <KanbanColumn
          title="Cancelled"
          status="cancelled"
          orders={getOrdersByStatus('cancelled')}
          onOrderUpdated={handleOrderUpdated}
        />
      </div>
    </main>
  );
}
