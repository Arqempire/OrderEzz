'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { fetchOrderDetailsById } from '@/lib/queries/orders';
import { Order } from '@/lib/types/database.types';
import { OrderStatusTracker } from '@/components/order/order-status-tracker';
import { ActiveOrderBanner } from '@/components/order/active-order-banner';
import { TableRequestButtons } from '@/components/order/table-request-buttons';
import { Loader2, AlertCircle, UtensilsCrossed, PlusCircle, Table as TableIcon } from 'lucide-react';
import Link from 'next/link';
import { formatTableLabel } from '@/lib/utils/table-helper';

function OrderStatusContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params?.orderId as string;
  const tokenFromUrl = searchParams.get('t');

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) return;

      const data = await fetchOrderDetailsById(orderId);
      if (!data) {
        setError('Order not found. Please check your order ID.');
      } else {
        setOrder(data);
      }
      setIsLoading(false);
    }

    loadOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <Loader2 size={36} className="text-amber-400 animate-spin mb-4" />
        <h2 className="text-lg font-bold font-display">Loading Live Order Status...</h2>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100 max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold font-display">Order Not Found</h2>
        <p className="text-xs text-slate-400 mt-2">{error}</p>
      </div>
    );
  }

  const tableQrToken = tokenFromUrl || order.table?.qr_token;
  const tableLabel = formatTableLabel(order);

  return (
    <main className="menu-container px-4 py-6 pb-20">
      {/* Top Header with Navigation Buttons */}
      <header className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold font-display text-slate-100 tracking-tight">
                Order<span className="text-amber-400">Ezz</span>
              </h1>
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-extrabold px-2.5 py-0.5 rounded-xl flex items-center gap-1">
                <TableIcon size={12} /> {tableLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Live Realtime Order Status Tracking
            </p>
          </div>
        </div>

        {/* Quick Navigation Links */}
        <div className="flex items-center gap-2">
          {tableQrToken && order.status !== 'paid' && (
            <Link
              href={`/order?t=${tableQrToken}`}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              <PlusCircle size={14} /> Explore Menu
            </Link>
          )}
          {order.status === 'paid' && (
            <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl font-mono">
              ✓ Session Closed
            </span>
          )}
        </div>
      </header>

      {/* Table Quick Assistance Bar ('Call Waiter' & 'Request Water') */}
      {order.table_id && order.status !== 'paid' && (
        <div className="mb-6 flex items-center justify-between bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl px-3.5 py-2.5">
          <span className="text-xs font-bold text-slate-300 font-display">Need Assistance?</span>
          <TableRequestButtons tableId={order.table_id} tableNumber={order.table?.table_number} />
        </div>
      )}

      {/* Realtime Order Tracker Component */}
      <OrderStatusTracker
        initialOrder={order}
        onStatusUpdated={(updatedOrder) => {
          setOrder((prev) => (prev?.status !== updatedOrder.status ? updatedOrder : prev));
        }}
      />

      {/* Persistent Active Orders Banner */}
      {tableQrToken && order.status !== 'paid' && <ActiveOrderBanner tableToken={tableQrToken} />}
    </main>
  );
}

export function OrderStatusClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100">
          <Loader2 size={36} className="text-amber-400 animate-spin mb-4" />
          <h2 className="text-lg font-bold font-display">Loading Live Order Status...</h2>
        </div>
      }
    >
      <OrderStatusContent />
    </Suspense>
  );
}
