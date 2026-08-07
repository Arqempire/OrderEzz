'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { TableRow, MenuCategory, MenuItem } from '@/lib/types/database.types';
import { fetchAllTables } from '@/lib/queries/tables';
import { fetchMenuCategories, fetchMenuItems } from '@/lib/queries/menu';
import { placeCustomerOrder } from '@/lib/queries/orders';
import {
  ShoppingCart, Plus, Minus, Trash2, ArrowLeft, ChefHat,
  Search, Utensils, CheckCircle2, ReceiptText, Table2,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
  image_url: string | null;
}

export default function AdminPlaceOrderPage() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [t, cats, items] = await Promise.all([
        fetchAllTables(),
        fetchMenuCategories(),
        fetchMenuItems(),
      ]);
      setTables(t.filter((t) => t.is_active));
      setCategories(cats);
      setMenuItems(items.filter((i) => i.is_available));
      setIsLoading(false);
    };
    load();
  }, []);

  const filteredItems = menuItems.filter((item) => {
    const matchCat = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

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
        { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, notes: '', image_url: item.image_url },
      ];
    });
  };

  const updateQty = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  };

  const updateNotes = (menuItemId: string, notes: string) => {
    setCart((prev) => prev.map((c) => (c.menuItemId === menuItemId ? { ...c, notes } : c)));
  };

  const handlePlaceOrder = async () => {
    if (!selectedTableId) {
      toast.error('Please select a table first.');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty. Add items first.');
      return;
    }

    setIsPlacing(true);
    const orderId = await placeCustomerOrder(
      selectedTableId,
      cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity, notes: c.notes }))
    );
    setIsPlacing(false);

    if (orderId) {
      setPlacedOrderId(orderId);
      setCart([]);
      const tableName = tables.find((t) => t.id === selectedTableId)?.table_number;
      toast.success(`Order placed for Table ${tableName}!`);
    } else {
      toast.error('Failed to place order. Please try again.');
    }
  };

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  if (placedOrderId) {
    return (
      <main className="admin-container flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold font-display text-slate-100">Order Placed!</h1>
          <p className="text-slate-400 text-sm mt-2">
            The kitchen has received the order for{' '}
            <span className="text-amber-400 font-bold">
              Table {selectedTable?.table_number ?? ''}
            </span>
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link
            href={`/order/status/${placedOrderId}`}
            target="_blank"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all"
          >
            <ReceiptText size={16} /> View Order Status
          </Link>
          <button
            onClick={() => { setPlacedOrderId(null); setSelectedTableId(''); }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm px-5 py-2.5 rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
          >
            <Plus size={16} /> Place Another Order
          </button>
          <Link
            href="/admin/analytics"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm px-5 py-2.5 rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-container space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <ChefHat size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-display text-slate-100">Place Order on Behalf</h1>
            <p className="text-xs text-slate-400 mt-0.5">Select a table, build the cart, and place the order directly</p>
          </div>
        </div>
        <Link
          href="/admin/analytics"
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-1.5 transition-colors self-start"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </header>

      {/* Table Selector */}
      <section className="glass-panel rounded-3xl p-5 border border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Table2 size={16} className="text-amber-400" />
          <h2 className="text-sm font-bold text-slate-200">Select Table</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {isLoading ? (
            <p className="text-slate-500 text-xs">Loading tables…</p>
          ) : tables.length === 0 ? (
            <p className="text-slate-500 text-xs">No active tables found.</p>
          ) : (
            tables
              .sort((a, b) => a.table_number - b.table_number)
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTableId(t.id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    selectedTableId === t.id
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/50 hover:text-amber-400'
                  }`}
                >
                  Table {t.table_number}
                </button>
              ))
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Browser */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="glass-panel rounded-3xl p-4 border border-slate-800 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-slate-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search menu…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-input pl-9 !py-2 text-xs w-full"
              />
            </div>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const inCart = cart.find((c) => c.menuItemId === item.id);
              return (
                <div
                  key={item.id}
                  className="glass-card rounded-2xl border border-slate-800 hover:border-amber-500/30 transition-all overflow-hidden flex gap-3 p-3 items-center"
                >
                  {item.image_url ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 relative">
                      <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="64px" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-slate-800 flex items-center justify-center">
                      <Utensils size={20} className="text-slate-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-100 line-clamp-1">{item.name}</p>
                    <p className="text-xs text-amber-400 font-extrabold mt-0.5">₹{item.price.toFixed(2)}</p>
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200 transition-colors"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-extrabold text-slate-100">{inCart.quantity}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-slate-950 transition-colors"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="flex-shrink-0 w-8 h-8 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 flex items-center justify-center transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart */}
        <div className="lg:col-span-1">
          <div className="glass-panel rounded-3xl border border-slate-800 p-5 sticky top-4 space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingCart size={17} className="text-amber-400" />
              <h2 className="text-sm font-bold text-slate-200">
                Order Cart
                {cartCount > 0 && (
                  <span className="ml-2 bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </h2>
            </div>

            {cart.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Add items from the menu to build the order.
              </p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {cart.map((c) => (
                  <div key={c.menuItemId} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-200 line-clamp-1">{c.name}</p>
                        <p className="text-[11px] text-amber-400 font-bold">
                          ₹{(c.price * c.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(c.menuItemId, -1)} className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-colors">
                          <Minus size={11} />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-slate-100">{c.quantity}</span>
                        <button onClick={() => updateQty(c.menuItemId, 1)} className="w-6 h-6 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-slate-950 flex items-center justify-center transition-colors">
                          <Plus size={11} />
                        </button>
                        <button onClick={() => removeFromCart(c.menuItemId)} className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors ml-1">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={c.notes}
                      onChange={(e) => updateNotes(c.menuItemId, e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="border-t border-slate-700 pt-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-300">Total</span>
                  <span className="text-lg font-extrabold text-amber-400 font-display">₹{cartTotal.toFixed(2)}</span>
                </div>

                {!selectedTableId && (
                  <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">
                    ⚠ Select a table above before placing the order
                  </p>
                )}

                <button
                  onClick={handlePlaceOrder}
                  disabled={isPlacing || !selectedTableId}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold text-sm px-4 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isPlacing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      Placing Order…
                    </>
                  ) : (
                    <>
                      <ChefHat size={16} />
                      Place Order{selectedTable ? ` · Table ${selectedTable.table_number}` : ''}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
