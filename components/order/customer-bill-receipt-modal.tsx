import React, { useEffect } from 'react';
import { Order } from '@/lib/types/database.types';
import { X, Printer, Download } from 'lucide-react';
import { extractGuestInfoFromOrder } from '@/lib/utils/guest-info';

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

  const guestInfo = extractGuestInfoFromOrder(order);
  const tableNum = order.table?.table_number ?? '?';
  const isTakeaway =
    !order.table_id ||
    tableNum === 0 ||
    tableNum === 999 ||
    String(tableNum) === '0' ||
    String(tableNum) === '999' ||
    String(tableNum) === 'Takeaway' ||
    order.order_items?.some((i) => i.notes?.includes('[Takeaway]'));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in print:p-0 print:bg-white print-receipt-modal">
      {/* Backdrop Click */}
      <div className="absolute inset-0 print:hidden" onClick={onClose} />

      {/* Dialog Card */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:bg-white print:text-black print-dialog-box p-5 space-y-4">
        {/* Top Control Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 print:hidden no-print">
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

        {/* Thermal POS Receipt Preview (Matching Cashier Panel POS Print Format) */}
        <div
          id="printable-receipt-area"
          className="bg-white text-slate-900 p-6 rounded-2xl shadow-inner font-mono text-xs space-y-4 border border-slate-200 overflow-y-auto max-h-[70vh] print:max-h-none print:p-0 print:shadow-none print:border-none"
        >
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
            <h2 className="font-black text-base font-display tracking-tight text-slate-950">
              ORDEREZZ RESTAURANT
            </h2>
            <p className="text-[10px] text-slate-600">Fine Dining & Express QR Ordering</p>
            <p className="text-[10px] text-slate-500 mt-1" suppressHydrationWarning>
              Date: {order.created_at ? new Date(order.created_at).toLocaleDateString() + ' ' + new Date(order.created_at).toLocaleTimeString() : new Date().toLocaleTimeString()}
            </p>
            <p className="text-xs font-bold text-slate-900 mt-1 uppercase">
              {isTakeaway ? 'TAKEAWAY' : `TABLE ${tableNum}`}
            </p>

            {(guestInfo.name || guestInfo.phone) && (
              <div className="text-[10px] text-slate-700 pt-1 border-t border-dotted border-slate-300 font-bold">
                {guestInfo.name && <span>Customer: {guestInfo.name}</span>}
                {guestInfo.name && guestInfo.phone && <span> • </span>}
                {guestInfo.phone && <span>Ph: {guestInfo.phone}</span>}
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="space-y-2 py-1">
            <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-slate-300 text-slate-700">
              <span>ITEM</span>
              <span>PRICE</span>
            </div>

            {(order.order_items || []).map((item, idx) => (
              <div key={idx} className="flex justify-between text-slate-900 text-[11px]">
                <span>
                  <span className="font-bold mr-1">{item.quantity}x</span>
                  {item.menu_item?.name || 'Item'}
                </span>
                <span>₹{(item.price_at_order * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <div className="pt-3 border-t border-dashed border-slate-400 space-y-1.5 text-slate-900">
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-900">
              <span>AMOUNT PAYABLE:</span>
              <span>₹{order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-3 border-t border-dashed border-slate-400 text-[10px] text-slate-600 space-y-0.5">
            <p className="font-bold text-slate-900">Thank you for dining with us!</p>
            <p>Please visit again</p>
          </div>
        </div>
      </div>
    </div>
  );
};
