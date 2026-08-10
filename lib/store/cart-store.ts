import { create } from 'zustand';
import { MenuItem, CartItem } from '@/lib/types/database.types';

interface CartState {
  tableId: string | null;
  items: CartItem[];
  guestName: string;
  guestPhone: string;
  setTableId: (tableId: string) => void;
  setGuest: (name: string, phone: string) => void;
  addItem: (menuItem: MenuItem, quantity?: number, notes?: string) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNotes: (menuItemId: string, notes: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  tableId: null,
  items: [],
  guestName: '',
  guestPhone: '',

  setTableId: (tableId: string) => set({ tableId }),
  setGuest: (name: string, phone: string) => set({ guestName: name, guestPhone: phone }),

  addItem: (menuItem: MenuItem, quantity = 1, notes = '') => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) => item.menuItem.id === menuItem.id
      );

      if (existingIndex > -1) {
        const updatedItems = [...state.items];
        const existingItem = updatedItems[existingIndex];
        updatedItems[existingIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + quantity,
          notes: notes !== undefined ? notes : existingItem.notes,
        };
        return { items: updatedItems };
      }

      return {
        items: [...state.items, { menuItem, quantity, notes }],
      };
    });
  },

  removeItem: (menuItemId: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.menuItem.id !== menuItemId),
    }));
  },

  updateQuantity: (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(menuItemId);
      return;
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, quantity } : item
      ),
    }));
  },

  updateNotes: (menuItemId: string, notes: string) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, notes } : item
      ),
    }));
  },

  clearCart: () => set({ items: [] }),

  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },

  getTotalPrice: () => {
    return get().items.reduce(
      (total, item) => total + item.menuItem.price * item.quantity,
      0
    );
  },
}));
