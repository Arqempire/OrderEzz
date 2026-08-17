'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MenuCategory, MenuItem } from '@/lib/types/database.types';
import { fetchMenuCategories, fetchMenuItems } from '@/lib/queries/menu';
import { createTakeawayOrder } from '@/lib/queries/cashier';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  Zap,
  ChefHat,
  Loader2,
  UtensilsCrossed,
  RotateCcw,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export interface PosCartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
  image_url: string | null;
}

interface TakeawayBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (
    orderId: string,
    settledImmediately: boolean,
    total: number,
    items: PosCartItem[]
  ) => void;
}

export const TakeawayBillingModal: React.FC<TakeawayBillingModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
}) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerName, setCustomerName] = useState('');

  // Discount state
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('percent');
  const [discountValue, setDiscountValue] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingType, setSubmittingType] = useState<'paid' | 'kitchen' | null>(null);

  // Load menu categories and items on modal open
  useEffect(() => {
    if (!isOpen) return;

    const loadMenu = async () => {
      setIsLoadingMenu(true);
      const [cats, items] = await Promise.all([
        fetchMenuCategories(),
        fetchMenuItems(),
      ]);
      setCategories(cats);
      setMenuItems(items.filter((i) => i.is_available));
      setIsLoadingMenu(false);
    };

    loadMenu();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const discountAmount = (() => {
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) return 0;
    if (discountType === 'percent') {
      const pct = Math.min(val, 100);
      return Math.round((cartTotal * pct) / 100 * 100) / 100;
    }
    return Math.min(val, cartTotal);
  })();

  const finalTotal = Math.max(0, cartTotal - discountAmount);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          notes: '',
          image_url: item.image_url,
        },
      ];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItemId === menuItemId
            ? { ...c, quantity: c.quantity + delta }
            : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  };

  const updateNotes = (menuItemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((c) => (c.menuItemId === menuItemId ? { ...c, notes } : c))
    );
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountValue('');
  };

  const handleCreateOrder = async (settleImmediately: boolean) => {
    if (cart.length === 0) {
      toast.error('Please add at least one dish to the takeaway bill.');
      return;
    }

    setIsSubmitting(true);
    setSubmittingType(settleImmediately ? 'paid' : 'kitchen');

    const formattedCartItems = cart.map((c) => ({
      menuItemId: c.menuItemId,
      quantity: c.quantity,
      notes: customerName.trim()
        ? `[Takeaway: ${customerName.trim()}] ${c.notes}`.trim()
        : `[Takeaway] ${c.notes}`.trim(),
    }));

    const { orderId, error } = await createTakeawayOrder(
      formattedCartItems,
      settleImmediately
    );

    setIsSubmitting(false);
    setSubmittingType(null);

    if (error || !orderId) {
      toast.error(error || 'Failed to generate takeaway order.');
      return;
    }

    toast.success(
      settleImmediately
        ? `Takeaway Bill (₹${finalTotal.toFixed(2)}) Settled! ✓`
        : 'Takeaway Order Sent to Kitchen! 🍳'
    );

    const currentCart = [...cart];
    setCart([]);
    setCustomerName('');
    setDiscountValue('');
    onClose();

    onOrderCreated(orderId, settleImmediately, finalTotal, currentCart);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full h-[90vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden">
        {/* Top POS Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold font-display text-slate-100 flex items-center gap-2">
                <span>Takeaway Counter Billing</span>
                <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30 uppercase">
                  Desktop POS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Walk-in counter order creation & instant payment settlement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center cursor-pointer"
            title="Close POS Billing (ESC)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main POS Split Interface */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Panel: Menu Browser (60% width) */}
          <div className="lg:w-[60%] border-r border-slate-800 flex flex-col p-4 md:p-6 space-y-4 bg-slate-950/40">
            {/* Search & Category Filter Header */}
            <div className="space-y-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search menu dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                    selectedCategory === 'all'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  All Items ({menuItems.length})
                </button>
                {categories.map((cat) => {
                  const count = menuItems.filter(
                    (i) => i.category_id === cat.id
                  ).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                        selectedCategory === cat.id
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                          : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
              {isLoadingMenu ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Loader2 size={32} className="animate-spin text-amber-400" />
                  <span className="text-xs font-medium">Loading POS Menu...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 p-6 text-center space-y-2">
                  <UtensilsCrossed size={32} className="opacity-40 text-amber-400" />
                  <p className="text-xs font-semibold text-slate-300">
                    No matching menu items found
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Try another search term or select "All Items"
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredItems.map((item) => {
                    const inCart = cart.find((c) => c.menuItemId === item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 group ${
                          inCart
                            ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                            : 'bg-slate-900 border-slate-800 hover:border-amber-500/30'
                        }`}
                      >
                        <div className="flex gap-2.5 items-start">
                          <div className="w-14 h-14 rounded-xl bg-slate-800 relative overflow-hidden flex-shrink-0">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.name}
                                fill
                                sizes="56px"
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">
                                No img
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-100 text-xs leading-snug truncate font-display">
                              {item.name}
                            </h4>
                            <span className="text-amber-400 font-extrabold text-xs block font-display mt-0.5">
                              ₹{item.price.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                          <span className="text-[10px] text-slate-500 truncate">
                            {categories.find((c) => c.id === item.category_id)?.name || ''}
                          </span>

                          {inCart ? (
                            <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-lg font-mono">
                              {inCart.quantity} in bill
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-0.5">
                              <Plus size={12} /> Add
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: POS Cart & Checkout (40% width) */}
          <div className="lg:w-[40%] flex flex-col p-4 md:p-6 space-y-4 bg-slate-900">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-100 font-display">
                  Current Order Bill
                </h3>
                <span className="bg-slate-800 text-amber-400 text-xs font-mono font-bold px-2 py-0.5 rounded-lg border border-slate-700">
                  {cartCount} {cartCount === 1 ? 'item' : 'items'}
                </span>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-[11px] font-bold text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Clear all cart items"
                >
                  <RotateCcw size={12} /> Clear Bill
                </button>
              )}
            </div>

            {/* Optional Customer Name Note */}
            <div>
              <input
                type="text"
                placeholder="Customer Name / Mobile (Optional)..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Scrollable Cart Items List */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-0.5">
              {cart.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-center p-4 space-y-2">
                  <ShoppingBag size={32} className="opacity-30 text-amber-400" />
                  <p className="text-xs font-semibold text-slate-300">
                    Takeaway bill is currently empty
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Click dishes from the menu panel on the left to add them to the customer's bill.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-200 text-xs truncate">
                          {item.name}
                        </h4>
                        <span className="text-[11px] text-amber-400 font-mono font-bold">
                          ₹{item.price.toFixed(2)} each
                        </span>
                      </div>

                      <span className="text-xs font-extrabold text-slate-100 font-display">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>

                    {/* Item Notes Input */}
                    <input
                      type="text"
                      placeholder="Item preference (e.g. Less spicy)..."
                      value={item.notes}
                      onChange={(e) => updateNotes(item.menuItemId, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                    />

                    {/* Quantity controls & Remove */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(item.menuItemId, -1)}
                          className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-xs font-bold text-amber-400 min-w-[20px] text-center font-mono">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.menuItemId, 1)}
                          className="w-6 h-6 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.menuItemId)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded-md transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total Summary & Settlement Buttons */}
            <div className="pt-3 border-t border-slate-800 space-y-3">

              {/* Discount Input */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Tag size={13} className="text-amber-400" />
                  <span className="text-xs font-bold text-slate-300">Apply Discount</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Toggle: Flat vs Percent */}
                  <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex-shrink-0">
                    <button
                      onClick={() => { setDiscountType('percent'); setDiscountValue(''); }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        discountType === 'percent'
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      %
                    </button>
                    <button
                      onClick={() => { setDiscountType('flat'); setDiscountValue(''); }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        discountType === 'flat'
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ₹
                    </button>
                  </div>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={discountType === 'percent' ? 'e.g. 10 (%)' : 'e.g. 50 (₹)'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-mono"
                  />

                  {discountValue && (
                    <button
                      onClick={() => setDiscountValue('')}
                      className="text-slate-500 hover:text-red-400 p-1 rounded-md transition-colors cursor-pointer flex-shrink-0"
                      title="Clear discount"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {discountAmount > 0 && (
                  <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Tag size={11} />
                    Discount applied: –₹{discountAmount.toFixed(2)}
                    {discountType === 'percent' && ` (${parseFloat(discountValue)}%)`}
                  </p>
                )}
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Subtotal ({cartCount} items)</span>
                  <span className="font-mono">₹{cartTotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Tag size={11} /> Discount
                      {discountType === 'percent' && ` (${parseFloat(discountValue)}%)`}
                    </span>
                    <span className="font-mono">–₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm pt-1.5 border-t border-slate-800">
                  <span className="font-extrabold text-slate-200 font-display">
                    Grand Total
                  </span>
                  <span className="text-xl font-extrabold text-amber-400 font-display">
                    ₹{finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleCreateOrder(true)}
                  disabled={isSubmitting || cart.length === 0}
                  className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-extrabold text-xs py-3 px-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Settle bill immediately & generate receipt"
                >
                  {isSubmitting && submittingType === 'paid' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Zap size={14} />
                      Settle & Print Receipt
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleCreateOrder(false)}
                  disabled={isSubmitting || cart.length === 0}
                  className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-xs py-3 px-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send order to kitchen for pre-preparation"
                >
                  {isSubmitting && submittingType === 'kitchen' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <ChefHat size={14} />
                      Send to Kitchen
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
