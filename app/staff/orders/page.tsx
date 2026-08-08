'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Order } from '@/lib/types/database.types';
import { fetchAllActiveOrders } from '@/lib/queries/orders';
import { KanbanColumn } from '@/components/staff/kanban-column';
import { TableRequestsPanel } from '@/components/staff/table-requests-panel';
import { createClient } from '@/lib/supabase/client';
import { UtensilsCrossed, RefreshCw, LogOut, Settings, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function StaffOrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
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
            <p className="text-xs text-slate-400 mt-0.5">
              Auto-updating via Supabase Realtime • Last sync: {lastRefreshed.toLocaleTimeString()}
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

          <Link
            href="/admin/tables"
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <Settings size={14} />
            Admin Panel
          </Link>

          <Link
            href="/staff/login"
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold px-3 py-2 rounded-xl border border-red-500/30 flex items-center gap-1.5 transition-colors"
          >
            <LogOut size={14} />
            Exit
          </Link>
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
          title="Served / Active"
          status="served"
          orders={getOrdersByStatus('served')}
          onOrderUpdated={handleOrderUpdated}
        />
      </div>
    </main>
  );
}
