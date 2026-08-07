'use client';

import React, { useEffect, useState } from 'react';
import { MenuCategory, MenuItem } from '@/lib/types/database.types';
import { fetchMenuCategories, fetchMenuItems, toggleMenuItemAvailability } from '@/lib/queries/menu';
import { UtensilsCrossed, Search, ArrowLeft, CheckCircle2, XCircle, RefreshCw, Power } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function StaffMenuAvailabilityPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [cats, items] = await Promise.all([
      fetchMenuCategories(),
      fetchMenuItems(),
    ]);
    setCategories(cats);
    setMenuItems(items);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleAvailability = async (id: string, name: string, currentStatus: boolean) => {
    if (updatingId === id) return; // prevent double-tap
    const newStatus = !currentStatus;

    // ⚡ Optimistic update — instant visual feedback
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_available: newStatus } : item))
    );
    setUpdatingId(id);
    if (newStatus) {
      toast.success(`"${name}" is now In Stock ✓`);
    } else {
      toast.success(`"${name}" marked as Sold Out ✓`);
    }

    // Sync to DB in background
    const success = await toggleMenuItemAvailability(id, newStatus);
    setUpdatingId(null);

    if (!success) {
      // Revert on failure
      setMenuItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_available: currentStatus } : item))
      );
      toast.error(`Failed to update "${name}" — reverted. Please try again.`);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="staff-dashboard-container space-y-6">
      {/* Navbar Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <UtensilsCrossed size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-display text-slate-100">
              Kitchen Menu Stock &amp; Availability
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly toggle dishes as In Stock or Sold Out for customer table ordering
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
          <Link
            href="/staff/orders"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <ArrowLeft size={16} /> Back to Kanban
          </Link>
        </div>
      </header>

      {/* Filter & Search Toolbar */}
      <section className="glass-panel rounded-3xl p-4 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              All Items ({menuItems.length})
            </button>

            {categories.map((cat) => {
              const count = menuItems.filter((i) => i.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Realtime Search Bar */}
          <div className="relative min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search dish by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input pl-9 !py-2 text-xs w-full"
            />
          </div>
        </div>
      </section>

      {/* Menu Stock Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map((item) => {
          const categoryName = categories.find((c) => c.id === item.category_id)?.name || 'General';
          const isUpdating = updatingId === item.id;

          return (
            <div
              key={item.id}
              className={`glass-card rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-4 ${
                item.is_available
                  ? 'border-slate-800 hover:border-slate-700'
                  : 'border-red-900/40 bg-red-950/10'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-amber-400">
                    {categoryName}
                  </span>
                  <span className="font-extrabold text-slate-100 font-display text-sm">
                    ₹{item.price.toFixed(2)}
                  </span>
                </div>

                <h3 className="font-bold text-slate-100 text-sm line-clamp-1">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Stock Availability Toggle Control */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {item.is_available ? (
                    <span className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-400">
                      <CheckCircle2 size={13} /> In Stock
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-extrabold text-red-400">
                      <XCircle size={13} /> Sold Out
                    </span>
                  )}
                </div>

                <button
                  disabled={isUpdating}
                  onClick={() => handleToggleAvailability(item.id, item.name, item.is_available)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    item.is_available
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                  }`}
                >
                  <Power size={13} className={isUpdating ? 'animate-spin' : ''} />
                  {item.is_available ? 'Mark Sold Out' : 'Mark In Stock'}
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {filteredItems.length === 0 && (
        <div className="p-12 text-center text-slate-500 glass-card rounded-3xl border border-slate-800 space-y-2">
          <UtensilsCrossed size={36} className="mx-auto text-slate-600" />
          <p className="font-bold text-slate-300 text-sm">No menu items found</p>
          <p className="text-xs">Try selecting another category or clearing your search filter.</p>
        </div>
      )}
    </main>
  );
}
