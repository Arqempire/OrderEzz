'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { resolveTableFromQrToken } from '@/lib/queries/tables';
import { fetchMenuCategories, fetchMenuItems } from '@/lib/queries/menu';
import { MenuCategory, MenuItem } from '@/lib/types/database.types';
import { MenuCard } from '@/components/order/menu-card';
import { CategoryNav } from '@/components/order/category-nav';
import { StickyCartBar } from '@/components/order/sticky-cart-bar';
import { CartBottomSheet } from '@/components/order/cart-bottom-sheet';
import { useCartStore } from '@/lib/store/cart-store';
import { createClient } from '@/lib/supabase/client';
import { Search, UtensilsCrossed, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function CustomerOrderContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('t');

  const { setTableId, removeItem } = useCartStore();

  const [tableId, setLocalTableId] = useState<string | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [invalidError, setInvalidError] = useState<string | null>(null);

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Helper function to reload fresh menu items and notify if an item went out of stock
  const reloadMenuItems = useCallback(async () => {
    const freshItems = await fetchMenuItems();
    if (freshItems) {
      setMenuItems((prevItems) => {
        freshItems.forEach((fresh) => {
          const prev = prevItems.find((p) => p.id === fresh.id);
          if (prev) {
            if (prev.is_available && !fresh.is_available) {
              toast.warning(`"${fresh.name}" is now Sold Out`);
              removeItem(fresh.id);
            } else if (!prev.is_available && fresh.is_available) {
              toast.success(`"${fresh.name}" is back In Stock!`);
            }
          }
        });
        return freshItems;
      });
    }
  }, [removeItem]);

  useEffect(() => {
    async function initSession() {
      if (!token) {
        setInvalidError('No table QR token provided. Please scan your table QR code.');
        setIsValidatingToken(false);
        return;
      }

      // Resolve table via security definer RPC
      const resolved = await resolveTableFromQrToken(token);

      if (!resolved || !resolved.is_active) {
        setInvalidError('This table QR code is invalid or inactive. Please ask a server for assistance.');
        setIsValidatingToken(false);
        return;
      }

      setLocalTableId(resolved.table_id);
      setTableId(resolved.table_id);

      // Load Menu Categories & Items
      const [fetchedCategories, fetchedItems] = await Promise.all([
        fetchMenuCategories(),
        fetchMenuItems(),
      ]);

      setCategories(fetchedCategories);
      setMenuItems(fetchedItems);

      if (fetchedCategories.length > 0) {
        setSelectedCategoryId(fetchedCategories[0].id);
      }

      setIsValidatingToken(false);
    }

    initSession();
  }, [token, setTableId]);

  // Realtime subscription for menu item availability, prices, and changes
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('customer-menu-realtime-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
        },
        (payload) => {
          console.log('Realtime menu_items event received on customer ordering page:', payload);
          reloadMenuItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reloadMenuItems]);

  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <Loader2 size={36} className="text-amber-400 animate-spin mb-4" />
        <h2 className="text-lg font-bold font-display">Resolving Table Session...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to kitchen menu</p>
      </div>
    );
  }

  if (invalidError || !tableId) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100 max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-bold font-display text-slate-100">Invalid Table Token</h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{invalidError}</p>
      </div>
    );
  }

  // Filter menu items by active category or search query
  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (searchQuery.trim().length > 0) {
      return matchesSearch;
    }

    return selectedCategoryId ? item.category_id === selectedCategoryId : true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Top Banner Header */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <UtensilsCrossed size={18} />
            </div>
            <div>
              <h1 className="text-base font-extrabold font-display leading-tight text-slate-100">
                OrderEzz Menu
              </h1>
              <span className="text-[11px] text-amber-400 font-medium">Dine-In Table Ordering</span>
            </div>
          </div>

          <div className="relative flex-1 max-w-[180px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Category Navigation Bar (when not searching) */}
        {!searchQuery && categories.length > 0 && (
          <CategoryNav
            categories={categories}
            activeCategoryId={selectedCategoryId}
            onSelectCategory={(id) => setSelectedCategoryId(id)}
          />
        )}

        {/* Menu Items List */}
        <section className="space-y-3">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => <MenuCard key={item.id} item={item} />)
          ) : (
            <div className="text-center py-12 text-slate-500 glass-card rounded-2xl p-6">
              <UtensilsCrossed size={36} className="mx-auto mb-2 opacity-40 text-amber-400" />
              <p className="text-sm font-semibold text-slate-300">No items found</p>
              <p className="text-xs text-slate-500 mt-1">Try selecting another category or clearing your search.</p>
            </div>
          )}
        </section>
      </main>

      {/* Sticky Bottom Cart Bar */}
      <StickyCartBar onOpenCart={() => setIsCartOpen(true)} />

      {/* Cart Bottom Sheet Modal */}
      <CartBottomSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} tableId={tableId} />
    </div>
  );
}

export default function CustomerOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100">
          <Loader2 size={36} className="text-amber-400 animate-spin mb-4" />
          <h2 className="text-lg font-bold font-display">Loading Menu...</h2>
        </div>
      }
    >
      <CustomerOrderContent />
    </Suspense>
  );
}
