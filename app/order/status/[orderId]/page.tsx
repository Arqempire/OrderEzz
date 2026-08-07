'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchOrderDetailsById } from '@/lib/queries/orders';
import { Order } from '@/lib/types/database.types';
import { OrderStatusTracker } from '@/components/order/order-status-tracker';
import { Loader2, AlertCircle, UtensilsCrossed, ArrowLeft, Home, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function OrderStatusPage() {
  const params = useParams();
  const orderId = params.orderId as string;

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
        <Link
          href="/"
          className="mt-6 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 inline-flex items-center gap-2"
        >
          <ArrowLeft size={14} /> Return Home
        </Link>
      </div>
    );
  }

  const tableQrToken = order.table?.qr_token;

  return (
    <main className="menu-container px-4 py-6">
      {/* Top Header with Navigation Buttons */}
      <header className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold font-display text-slate-100 tracking-tight">
              Order<span className="text-amber-400">Ezz</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Table {order.table?.table_number ?? 'Order'} Live Tracking
            </p>
          </div>
        </div>

        {/* Quick Navigation Links */}
        <div className="flex items-center gap-2">
          {tableQrToken && (
            <Link
              href={`/order?t=${tableQrToken}`}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              <PlusCircle size={14} /> Explore Menu
            </Link>
          )}
          <Link
            href="/"
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1"
          >
            <Home size={14} /> Home
          </Link>
        </div>
      </header>

      {/* Realtime Order Tracker Component */}
      <OrderStatusTracker initialOrder={order} />
    </main>
  );
}
