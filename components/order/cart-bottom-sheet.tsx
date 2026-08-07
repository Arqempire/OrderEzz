'use client';

import React, { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useCartStore } from '@/lib/store/cart-store';
import { Plus, Minus, Trash2, Edit3, ShoppingBag, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { placeCustomerOrder } from '@/lib/queries/orders';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface CartBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
}

export const CartBottomSheet: React.FC<CartBottomSheetProps> = ({
  isOpen,
  onClose,
  tableId,
}) => {
  const router = useRouter();
  const { items, updateQuantity, updateNotes, removeItem, clearCart, getTotalPrice } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeNoteItemId, setActiveNoteItemId] = useState<string | null>(null);

  const totalPrice = getTotalPrice();

  const handlePlaceOrder = async () => {
    if (!tableId) {
      toast.error('Table session invalid. Please rescan QR code.');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = items.map((item) => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        notes: item.notes,
      }));

      const orderId = await placeCustomerOrder(tableId, orderPayload);

      if (!orderId) {
        toast.error('Failed to place order. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Store order ID in customer local storage
      try {
        const storedOrders = JSON.parse(localStorage.getItem('orderezz_customer_orders') || '[]');
        storedOrders.unshift(orderId);
        localStorage.setItem('orderezz_customer_orders', JSON.stringify(storedOrders));
      } catch (err) {
        console.error('LocalStorage write error:', err);
      }

      clearCart();
      onClose();
      toast.success('Order placed successfully!');
      router.push(`/order/status/${orderId}`);
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('An error occurred while submitting your order.');
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Your Table Order">
      {items.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
            <ShoppingBag size={28} />
          </div>
          <p className="text-slate-400 text-sm">Your cart is currently empty.</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Cart Item List */}
          <div className="divide-y divide-slate-800/80">
            {items.map(({ menuItem, quantity, notes }) => (
              <div key={menuItem.id} className="py-3.5 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="text-slate-100 font-bold text-sm leading-snug">{menuItem.name}</h4>
                    <p className="text-amber-400 text-xs font-bold mt-0.5">
                      ₹{(menuItem.price * quantity).toFixed(2)}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-lg p-1">
                    <button
                      onClick={() => updateQuantity(menuItem.id, quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-xs font-bold text-slate-100 min-w-[16px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(menuItem.id, quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* Notes Input toggle */}
                <div className="mt-2">
                  {activeNoteItemId === menuItem.id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="E.g. No onions, extra crispy..."
                        value={notes || ''}
                        onChange={(e) => updateNotes(menuItem.id, e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        autoFocus
                      />
                      <button
                        onClick={() => setActiveNoteItemId(null)}
                        className="text-xs text-amber-400 font-semibold px-2 py-1"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span className="truncate max-w-[200px] italic">
                        {notes ? `Note: ${notes}` : 'No special requests'}
                      </span>
                      <button
                        onClick={() => setActiveNoteItemId(menuItem.id)}
                        className="text-amber-400/90 hover:text-amber-400 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 size={11} /> {notes ? 'Edit Note' : 'Add Note'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Payment Note */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3 flex items-start gap-2 text-xs text-slate-400">
            <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <span>Pay at the counter when you finish your meal. Order status updates in real time on the next page.</span>
          </div>

          {/* Subtotal & Action */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Subtotal</span>
              <span className="text-xl font-extrabold text-amber-400 font-display">
                ₹{totalPrice.toFixed(2)}
              </span>
            </div>

            <Button
              variant="amber"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
              onClick={handlePlaceOrder}
            >
              Confirm & Place Order (₹{totalPrice.toFixed(2)})
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
