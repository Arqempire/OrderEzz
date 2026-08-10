'use client';

import React, { useEffect } from 'react';
import { Order } from '@/lib/types/database.types';
import { X, Printer, Download, CheckCircle2, UtensilsCrossed } from 'lucide-react';

interface CustomerBillReceiptModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerBillReceiptModal: React.FC<CustomerBillReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const tableNum = order.table?.table_number ?? '?';
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }) +
      ' ' +
      new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in print:p-0 print:bg-white">
      {/* Backdrop Click */}
      <div className="absolute inset-0 print:hidden" onClick={onClose} />

      {/* Dialog Card */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:bg-white print:text-black">
        {/* Top Control Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 font-display">
            <Printer size={16} className="text-amber-400" /> Customer Bill Receipt
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
            >
              <Download size={14} /> Download / Print PDF
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-100 print:text-black print:p-0 print:overflow-visible">
          {/* Receipt Header Branding */}
          <div className="text-center border-b border-slate-800/80 pb-4 print:border-black">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-bold mb-2 print:hidden">
              <UtensilsCrossed size={20} />
            </div>
            <h2 className="text-xl font-extrabold font-display uppercase tracking-wider text-slate-100 print:text-black">
              OrderEzz Restaurant
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5 print:text-black">
              Tax Invoice & Dine-In Settled Receipt
            </p>
          </div>

          {/* Table & Order Metadata */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 text-xs font-mono space-y-1.5 print:bg-white print:border-black print:text-black">
            <div className="flex justify-between">
              <span className="text-slate-400 print:text-black">Table:</span>
              <span className="font-bold text-amber-400 print:text-black">TABLE {tableNum}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 print:text-black">Order ID:</span>
              <span className="font-bold text-slate-200 print:text-black">#{order.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 print:text-black">Date & Time:</span>
              <span className="text-slate-300 print:text-black">{orderDate}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800/60 print:border-black">
              <span className="text-slate-400 print:text-black">Payment Status:</span>
              <span className="font-bold text-emerald-400 print:text-black flex items-center gap-1">
                <CheckCircle2 size={12} /> PAID & SETTLED
              </span>
            </div>
          </div>

          {/* Itemized Dishes List */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono border-b border-slate-800 pb-1.5 flex justify-between print:text-black print:border-black">
              <span>Item & Quantity</span>
              <span>Subtotal</span>
            </div>

            <div className="divide-y divide-slate-800/50 print:divide-black">
              {order.order_items?.map((item) => (
                <div key={item.id} className="py-2 flex justify-between items-start text-xs">
                  <div>
                    <div className="font-bold text-slate-200 print:text-black">
                      <span className="text-amber-400 font-extrabold mr-1.5 print:text-black">
                        {item.quantity}x
                      </span>
                      {item.menu_item?.name || 'Dish'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono print:text-black">
                      ₹{item.price_at_order.toFixed(2)} each
                    </div>
                    {item.notes && (
                      <div className="text-[10px] text-slate-400 italic mt-0.5 print:text-black">
                        Note: {item.notes}
                      </div>
                    )}
                  </div>
                  <span className="font-extrabold text-slate-100 font-mono print:text-black">
                    ₹{(item.price_at_order * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Grand Total */}
          <div className="pt-3 border-t-2 border-slate-800 flex justify-between items-center text-base print:border-black print:text-black">
            <span className="font-bold text-slate-300 font-display print:text-black">
              TOTAL AMOUNT PAID
            </span>
            <span className="text-xl font-black text-amber-400 font-display print:text-black">
              ₹{order.total.toFixed(2)}
            </span>
          </div>

          {/* Footer Receipt Note */}
          <div className="text-center text-[10px] text-slate-400 font-mono pt-4 border-t border-slate-800/60 space-y-1 print:text-black print:border-black">
            <p className="font-semibold text-slate-300 print:text-black">
              Thank you for dining with us!
            </p>
            <p>Powered by OrderEzz a ARQ technologies product</p>
          </div>
        </div>
      </div>
    </div>
  );
};
