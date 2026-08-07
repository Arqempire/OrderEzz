import { createClient } from '@/lib/supabase/client';
import { MenuCategory, MenuItem } from '@/lib/types/database.types';

/**
 * Fetches all active menu categories sorted by sort_order.
 */
export async function fetchMenuCategories(): Promise<MenuCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching menu categories:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetches all menu items sorted by category and sort_order.
 */
export async function fetchMenuItems(): Promise<MenuItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching menu items:', error);
    return [];
  }

  return data || [];
}

/**
 * Creates a new menu category (Admin).
 */
export async function createMenuCategory(name: string, sortOrder: number): Promise<MenuCategory | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_categories')
    .insert([{ name, sort_order: sortOrder }])
    .select()
    .single();

  if (error) {
    console.error('Error creating menu category:', error);
    return null;
  }

  return data;
}

/**
 * Creates a new menu item (Admin).
 */
export async function createMenuItem(item: Partial<MenuItem>): Promise<MenuItem | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_items')
    .insert([item])
    .select()
    .single();

  if (error) {
    console.error('Error creating menu item:', error);
    return null;
  }

  return data;
}

/**
 * Updates an existing menu item (Admin).
 */
export async function updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating menu item:', error);
    return null;
  }

  return data;
}

/**
 * Deletes a menu item (Admin).
 */
export async function deleteMenuItem(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting menu item:', error);
    return false;
  }

  return true;
}

/**
 * Toggles a menu item's availability (Admin/Staff quick action).
 * Calls server API route first; if that fails, falls back to direct client update.
 */
export async function toggleMenuItemAvailability(id: string, isAvailable: boolean): Promise<boolean> {
  try {
    const response = await fetch('/api/staff/menu/toggle-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: id, isAvailable }),
    });

    const resData = await response.json();
    if (response.ok && resData.success) {
      return true;
    }

    console.warn('API route failed, trying direct client update:', resData?.error);
    const supabase = createClient();
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: isAvailable })
      .eq('id', id);

    if (error) {
      console.error('Error toggling menu item availability:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Exception in toggleMenuItemAvailability:', err);
    return false;
  }
}
