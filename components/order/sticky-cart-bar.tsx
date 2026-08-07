'use client';

import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';

interface StickyCartBarProps {
  onOpenCart: () => void;
}

export const StickyCartBar: React.FC<StickyCartBarProps> = ({ onOpenCart }) => {
  const { getTotalItems, getTotalPrice } = useCartStore();

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  if (totalItems === 0) return null;

  return (
    <div className="sticky-cart-bar">
      <div className="flex items-center gap-3">
        <div className="relative bg-amber-500 text-slate-950 p-2.5 rounded-xl flex items-center justify-center font-bold">
          <ShoppingBag size={20} />
          <span className="absolute -top-1.5 -right-1.5 bg-slate-950 text-amber-400 text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-amber-500">
            {totalItems}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium block">Total Price</span>
          <span className="text-lg font-extrabold text-slate-100 font-display">
            ₹{totalPrice.toFixed(2)}
          </span>
        </div>
      </div>

      <button
        onClick={onOpenCart}
        className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
      >
        View Cart
        <ArrowRight size={16} />
      </button>
    </div>
  );
};
