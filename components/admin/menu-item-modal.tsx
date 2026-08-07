'use client';

import React, { useState, useEffect } from 'react';
import { MenuCategory, MenuItem } from '@/lib/types/database.types';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { createMenuItem, updateMenuItem } from '@/lib/queries/menu';
import { toast } from 'sonner';

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: MenuCategory[];
  initialItem?: MenuItem | null;
  onSaved: () => void;
}

export const MenuItemModal: React.FC<MenuItemModalProps> = ({
  isOpen,
  onClose,
  categories,
  initialItem,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name);
      setCategoryId(initialItem.category_id);
      setDescription(initialItem.description || '');
      setPrice(initialItem.price.toString());
      setImageUrl(initialItem.image_url || '');
      setIsAvailable(initialItem.is_available);
    } else {
      setName('');
      setCategoryId(categories[0]?.id || '');
      setDescription('');
      setPrice('');
      setImageUrl('');
      setIsAvailable(true);
    }
  }, [initialItem, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !categoryId || !price) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('Please enter a valid price.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name,
      category_id: categoryId,
      description: description || null,
      price: priceNum,
      image_url: imageUrl || null,
      is_available: isAvailable,
    };

    let result = null;
    if (initialItem) {
      result = await updateMenuItem(initialItem.id, payload);
    } else {
      result = await createMenuItem(payload);
    }

    setIsSubmitting(false);

    if (result) {
      toast.success(initialItem ? 'Menu item updated!' : 'Menu item created!');
      onSaved();
      onClose();
    } else {
      toast.error('Failed to save menu item.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-lg font-bold text-slate-100 font-display">
            {initialItem ? 'Edit Menu Item' : 'Create New Menu Item'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Item Name *</label>
            <input
              type="text"
              required
              className="admin-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g. Wagyu Burger"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Category *</label>
              <select
                required
                className="admin-input bg-slate-950 text-slate-100"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                className="admin-input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="220.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Description</label>
            <textarea
              rows={3}
              className="admin-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of ingredients..."
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Image URL</label>
            <input
              type="url"
              className="admin-input"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isAvailable"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="isAvailable" className="text-slate-200 font-semibold cursor-pointer">
              Available for Ordering
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="amber" isLoading={isSubmitting}>
              {initialItem ? 'Save Changes' : 'Create Item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
