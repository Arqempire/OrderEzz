'use client';

import React from 'react';
import { MenuCategory } from '@/lib/types/database.types';
import { clsx } from 'clsx';

interface CategoryNavProps {
  categories: MenuCategory[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
}) => {
  return (
    <div className="sticky top-[52px] z-25 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 py-2 px-4 -mx-4 mb-4">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={clsx(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer flex-shrink-0 touch-manipulation',
                isActive ? 'category-tab-active' : 'category-tab-inactive'
              )}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
