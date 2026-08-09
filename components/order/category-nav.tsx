'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MenuCategory } from '@/lib/types/database.types';
import { clsx } from 'clsx';
import { ChevronDown, Check, LayoutGrid, Layers } from 'lucide-react';

interface CategoryNavProps {
  categories: MenuCategory[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  categoryItemCounts?: Record<string, number>;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  categoryItemCounts = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const totalItemCount = Object.values(categoryItemCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={clsx(
          'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95 flex-shrink-0 border shadow-sm',
          activeCategoryId || isOpen
            ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md shadow-amber-500/20'
            : 'bg-slate-900 text-slate-200 border-slate-800 hover:bg-slate-800'
        )}
        aria-expanded={isOpen}
        title="Filter by category"
      >
        <LayoutGrid size={14} />
        <span className="max-w-[110px] sm:max-w-[150px] truncate">
          {activeCategory ? activeCategory.name : 'Categories'}
        </span>
        <ChevronDown
          size={14}
          className={clsx('transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      {/* Floating Category Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-60 sm:w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black z-[100] p-2 space-y-1 opacity-100">
          <div className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-300 font-display border-b border-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-200">
              <Layers size={13} className="text-amber-400" /> Select Category
            </span>
            <span className="font-mono text-slate-400">{categories.length} Categories</span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1 no-scrollbar pt-1">
            {/* All Categories Reset Option */}
            <button
              onClick={() => {
                onSelectCategory(null);
                setIsOpen(false);
              }}
              className={clsx(
                'w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer touch-manipulation',
                !activeCategoryId
                  ? 'bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/40'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white bg-slate-900'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {!activeCategoryId && <Check size={14} className="text-amber-400 flex-shrink-0" />}
                <span className="truncate font-display">All Dishes</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded-md">
                {totalItemCount}
              </span>
            </button>

            {/* Category Options */}
            {categories.map((cat) => {
              const isActive = activeCategoryId === cat.id;
              const count = categoryItemCounts[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelectCategory(cat.id);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    'w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer touch-manipulation',
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white bg-slate-900'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isActive && <Check size={14} className="text-slate-950 flex-shrink-0" />}
                    <span className="truncate font-display">{cat.name}</span>
                  </div>
                  <span
                    className={clsx(
                      'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 border',
                      isActive
                        ? 'bg-slate-950/20 text-slate-950 border-slate-950/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
