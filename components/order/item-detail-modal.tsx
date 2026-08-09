'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { MenuItem } from '@/lib/types/database.types';
import { X, Plus, Minus, Check, Utensils, Sparkles } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';

interface ItemDetailModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, isOpen, onClose }) => {
  const { items, addItem, updateQuantity } = useCartStore();

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const cartItem = items.find((ci) => ci.menuItem.id === item.id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 animate-fade-in">
      {/* Backdrop Click */}
      <div className="absolute inset-0" onClick={onClose} aria-label="Close modal backdrop" />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh] animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 z-20 bg-slate-950/80 hover:bg-slate-950 text-slate-300 hover:text-white p-1.5 rounded-full backdrop-blur-md border border-slate-700/50 transition-all cursor-pointer shadow-lg"
          title="Close details"
        >
          <X size={16} />
        </button>

        {/* Proportional Image Header Container */}
        <div className="relative w-full h-44 sm:h-52 bg-slate-950 overflow-hidden flex-shrink-0">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              priority
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900">
              <Utensils size={48} className="mb-2 text-slate-700" />
              <span className="text-xs font-semibold">No Preview Image Available</span>
            </div>
          )}

          {/* Gradient Overlay for Text Visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />

          {/* Availability Badge */}
          {!item.is_available && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
              <span className="text-xs font-black text-red-400 uppercase tracking-wider px-3 py-1.5 bg-red-500/20 rounded-xl border border-red-500/40 shadow-lg">
                Sold Out / Unavailable
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Content Details */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Header Title & Price */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 font-display leading-tight">
                {item.name}
              </h2>
              {item.is_available && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full mt-1">
                  <Sparkles size={10} /> Freshly Prepared
                </span>
              )}
            </div>

            <div className="text-right flex-shrink-0">
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-display block">
                ₹{item.price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="pt-2 border-t border-slate-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display mb-1">
              Description
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line font-normal">
              {item.description || 'Delicious dish prepared with fresh ingredients.'}
            </p>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="text-xs text-slate-400">
            {quantityInCart > 0 ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Check size={14} /> Added to order
              </span>
            ) : (
              <span>Tap below to add to cart</span>
            )}
          </div>

          {/* Order Action Button */}
          {!item.is_available ? (
            <span className="text-sm font-semibold text-slate-500 italic">Currently Unavailable</span>
          ) : quantityInCart === 0 ? (
            <button
              onClick={() => addItem(item)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus size={16} /> Add to Order • ₹{item.price.toFixed(2)}
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-700/80 rounded-xl p-1.5 shadow-lg">
              <button
                onClick={() => updateQuantity(item.id, quantityInCart - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 transition-all touch-manipulation cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>
              <span className="text-sm font-black text-amber-400 min-w-[24px] text-center font-mono">
                {quantityInCart}
              </span>
              <button
                onClick={() => updateQuantity(item.id, quantityInCart + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all touch-manipulation cursor-pointer"
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
