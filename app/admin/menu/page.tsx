'use client';

import React, { useEffect, useState } from 'react';
import { MenuCategory, MenuItem } from '@/lib/types/database.types';
import {
  fetchMenuCategories,
  fetchMenuItems,
  createMenuCategory,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from '@/lib/queries/menu';
import { MenuItemModal } from '@/components/admin/menu-item-modal';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Power, Utensils, FolderPlus, ArrowLeft, Sparkles, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsCreatingCategory(true);
    const created = await createMenuCategory(newCategoryName, categories.length + 1);
    setIsCreatingCategory(false);

    if (created) {
      toast.success(`Category "${newCategoryName}" created!`);
      setNewCategoryName('');
      loadData();
    } else {
      toast.error('Failed to create category.');
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      const success = await deleteMenuItem(id);
      if (success) {
        toast.info(`Deleted "${name}"`);
        loadData();
      } else {
        toast.error('Failed to delete item.');
      }
    }
  };

  const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    // ⚡ Optimistic update — instant visual feedback
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_available: newStatus } : item))
    );
    toast.info(`Item status updated to ${newStatus ? 'Available' : 'Sold Out'}`);

    // Sync to DB in background
    const success = await toggleMenuItemAvailability(id, newStatus);
    if (!success) {
      // Revert on failure
      setMenuItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_available: currentStatus } : item))
      );
      toast.error('Failed to update item status — reverted. Please try again.');
    }
  };

  return (
    <main className="admin-container space-y-8">
      {/* Top Navbar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <Utensils size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-display text-slate-100">
              Menu Items & Category Management
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Create, update, toggle availability, and configure menu offerings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/admin/analytics"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <BarChart3 size={14} /> Analytics
          </Link>

          <Link
            href="/admin/menu/import"
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <Sparkles size={16} /> Import Menu via AI
          </Link>

          <Button
            variant="secondary"
            onClick={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}
          >
            <Plus size={16} /> Add Item
          </Button>

          <Link
            href="/admin/staff"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Users size={14} /> Staff Accounts
          </Link>

          <Link
            href="/admin/tables"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Tables Management
          </Link>
        </div>
      </header>

      {/* Add Category Form */}
      <section className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4 max-w-xl">
        <h2 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
          <FolderPlus size={18} className="text-amber-400" /> Create Menu Category
        </h2>

        <form onSubmit={handleCreateCategory} className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Category Name (e.g. Chef Specials)"
            required
            className="admin-input flex-1"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <Button type="submit" variant="secondary" isLoading={isCreatingCategory}>
            Add Category
          </Button>
        </form>
      </section>

      {/* Menu Categories & Items List */}
      <section className="space-y-6">
        {categories.map((category) => {
          const categoryItems = menuItems.filter((i) => i.category_id === category.id);

          return (
            <div key={category.id} className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-lg font-bold text-slate-100 font-display">
                  {category.name} ({categoryItems.length})
                </h3>
              </div>

              {categoryItems.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  No items in this category. Click "Add Menu Item" above to add one.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex gap-3 items-center"
                    >
                      {/* Image */}
                      <div className="relative w-16 h-16 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600">
                            No image
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-slate-100 font-display truncate">
                          {item.name}
                        </h4>
                        <span className="text-amber-400 font-bold text-xs">
                          ₹{item.price.toFixed(2)}
                        </span>

                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleToggleAvailability(item.id, item.is_available)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              item.is_available
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {item.is_available ? 'Available' : 'Sold Out'}
                          </button>

                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsItemModalOpen(true);
                            }}
                            className="text-slate-400 hover:text-amber-400 p-1"
                            title="Edit Item"
                          >
                            <Edit size={14} />
                          </button>

                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="text-slate-500 hover:text-red-400 p-1"
                            title="Delete Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Item Modal */}
      <MenuItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        categories={categories}
        initialItem={editingItem}
        onSaved={loadData}
      />
    </main>
  );
}
