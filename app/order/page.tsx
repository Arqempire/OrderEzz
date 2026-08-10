'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { resolveTableFromQrToken } from '@/lib/queries/tables';
import { fetchMenuCategories, fetchMenuItems } from '@/lib/queries/menu';
import { MenuCategory, MenuItem, TableRow } from '@/lib/types/database.types';
import { MenuCard } from '@/components/order/menu-card';
import { CategoryNav } from '@/components/order/category-nav';
import { StickyCartBar } from '@/components/order/sticky-cart-bar';
import { CartBottomSheet } from '@/components/order/cart-bottom-sheet';
import { ActiveOrderBanner } from '@/components/order/active-order-banner';
import { TableRequestButtons } from '@/components/order/table-request-buttons';
import { GuestIdentityScreen, GuestInfo } from '@/components/order/guest-identity-screen';
import { useCartStore } from '@/lib/store/cart-store';
import { createClient } from '@/lib/supabase/client';
import { Search, UtensilsCrossed, AlertTriangle, Loader2, RefreshCw, LayoutGrid, X } from 'lucide-react';
import { toast } from 'sonner';

/** Shows a personalized greeting in the header if the guest provided their name. */
function GuestGreeting() {
  const guestName = useCartStore((s) => s.guestName);
  return (
    <span className="text-[10px] text-amber-400 font-medium block -mt-0.5 whitespace-nowrap">
      {guestName ? `Hi, ${guestName}! 👋` : 'Table Menu'}
    </span>
  );
}

function CustomerOrderContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('t');

  const { setTableId, removeItem, setGuest } = useCartStore();

  const [tableId, setLocalTableId] = useState<string | null>(null);
  const [tableRow, setTableRow] = useState<TableRow | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [invalidError, setInvalidError] = useState<string | null>(null);
  const [showGuestScreen, setShowGuestScreen] = useState(false);

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Compute category item counts for sidebar badges (Top-level hook to satisfy React Rules of Hooks)
  const categoryItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    menuItems.forEach((item) => {
      if (item.category_id) {
        counts[item.category_id] = (counts[item.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [menuItems]);

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

      try {
        const FETCH_TIMEOUT_MS = 15000;
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error('Connection is slow or unstable. Please check your internet and try again.')
              ),
            FETCH_TIMEOUT_MS
          )
        );

        const dataPromise = Promise.all([
          resolveTableFromQrToken(token),
          fetchMenuCategories(),
          fetchMenuItems(),
        ]);

        const [resolved, fetchedCategories, fetchedItems] = await Promise.race([
          dataPromise,
          timeoutPromise,
        ]);

        if (!resolved || !resolved.is_active) {
          setInvalidError('This table QR code is invalid or inactive. Please ask a server for assistance.');
          return;
        }

        setLocalTableId(resolved.table_id);
        setTableId(resolved.table_id);
        setTableRow(resolved as unknown as TableRow);
        setCategories(fetchedCategories);
        setMenuItems(fetchedItems);

        if (fetchedCategories.length > 0) {
          setSelectedCategoryId(fetchedCategories[0].id);
        }

        // Show guest identity screen before revealing the menu
        setShowGuestScreen(true);
      } catch (err: any) {
        console.error('Error loading menu session:', err);
        setInvalidError(err.message || 'Failed to load menu. Please check your connection and try again.');
      } finally {
        setIsValidatingToken(false);
      }
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
        <h2 className="text-lg font-bold font-display">Connecting to your table...</h2>
        <p className="text-xs text-slate-400 mt-1">Loading kitchen menu</p>
      </div>
    );
  }

  if (showGuestScreen && tableRow && token) {
    return (
      <GuestIdentityScreen
        tableNumber={tableRow.table_number}
        tableToken={token}
        onContinue={(guest: GuestInfo) => {
          setGuest(guest.name, guest.phone);
          setShowGuestScreen(false);
        }}
      />
    );
  }

  if (invalidError || !tableId) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100 max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-bold font-display text-slate-100">Unable to Load Menu</h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{invalidError || 'Table session could not be established.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw size={14} /> Try Again
        </button>
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
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <UtensilsCrossed size={16} />
            </div>
            <div>
              <h1 className="text-sm font-extrabold font-display leading-tight text-slate-100">
                OrderEzz
              </h1>
              <GuestGreeting />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end">
            {/* Header Category Dropdown Menu */}
            {categories.length > 0 && (
              <CategoryNav
                categories={categories}
                activeCategoryId={selectedCategoryId}
                onSelectCategory={(id) => setSelectedCategoryId(id)}
                categoryItemCounts={categoryItemCounts}
              />
            )}

            {/* Search Input */}
            <div className="relative flex-1 max-w-[140px] sm:max-w-[180px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-7 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Table Quick Actions Bar ('Call Waiter' & 'Request Water') */}
        {tableId && (
          <div className="flex items-center justify-between bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl px-3.5 py-2">
            <span className="text-xs font-bold text-slate-300 font-display">Need Assistance?</span>
            <TableRequestButtons tableId={tableId} />
          </div>
        )}

        {/* Selected Category Active Filter Chip */}
        {selectedCategoryId && !searchQuery && (
          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2 text-xs">
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              Category: {categories.find((c) => c.id === selectedCategoryId)?.name || 'Filtered'}
            </span>
            <button
              onClick={() => setSelectedCategoryId(null)}
              className="text-slate-400 hover:text-amber-400 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              Show All Dishes <X size={12} />
            </button>
          </div>
        )}

        {/* Food Items List */}
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

      {/* Persistent Table-Scoped Active Order Tracking Banner */}
      {token && <ActiveOrderBanner tableToken={token} hasCartItems={useCartStore.getState().getTotalItems() > 0} />}

      {/* Sticky Bottom Cart Bar */}
      <StickyCartBar onOpenCart={() => setIsCartOpen(true)} />

      {/* Cart Bottom Sheet Modal */}
      <CartBottomSheet
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        tableId={tableId}
        tableToken={token || undefined}
      />
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
