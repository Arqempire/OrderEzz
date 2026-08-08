'use client';

import React from 'react';
import Image from 'next/image';
import { MenuItem } from '@/lib/types/database.types';
import { Plus, Minus, Check } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';

interface MenuCardProps {
  item: MenuItem;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item }) => {
  const { items, addItem, updateQuantity } = useCartStore();

  const cartItem = items.find((ci) => ci.menuItem.id === item.id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  return (
    <div className="menu-card group !p-3 sm:!p-4">
      {/* Image Thumbnail */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 80px, 96px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-[11px]">
            No image
          </div>
        )}
        {!item.is_available && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex items-center justify-center">
            <span className="text-[9px] font-extrabold text-red-400 uppercase tracking-wider px-1.5 py-0.5 bg-red-500/20 rounded border border-red-500/30">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Item Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
        <div>
          <div className="flex items-start justify-between gap-1.5">
            <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-snug font-display truncate">
              {item.name}
            </h3>
            <span className="text-amber-400 font-extrabold text-sm sm:text-base font-display flex-shrink-0">
              ₹{item.price.toFixed(2)}
            </span>
          </div>
          {item.description && (
            <p className="text-slate-400 text-[11px] sm:text-xs mt-0.5 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end mt-2">
          {!item.is_available ? (
            <span className="text-xs text-slate-500 italic">Unavailable</span>
          ) : quantityInCart === 0 ? (
            <button
              onClick={() => addItem(item)}
              className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg border border-amber-500/30 transition-all flex items-center gap-1 cursor-pointer touch-manipulation active:scale-95"
            >
              <Plus size={14} /> Add
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-lg p-1">
              <button
                onClick={() => updateQuantity(item.id, quantityInCart - 1)}
                className="w-7 h-7 flex items-center justify-center rounded bg-slate-700 text-slate-200 hover:bg-slate-600 active:scale-95 transition-all touch-manipulation"
                aria-label="Decrease quantity"
              >
                <Minus size={12} />
              </button>
              <span className="text-xs font-bold text-amber-400 min-w-[18px] text-center">
                {quantityInCart}
              </span>
              <button
                onClick={() => updateQuantity(item.id, quantityInCart + 1)}
                className="w-7 h-7 flex items-center justify-center rounded bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all touch-manipulation"
                aria-label="Increase quantity"
              >
                <Plus size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
