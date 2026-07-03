'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuthStore, canAccess } from '@/store';
import type { AppView } from '@/types';
import {
  LayoutDashboard,
  Wrench,
  AlertTriangle,
  ClipboardList,
  CalendarClock,
  Package,
  Users,
  UserCog,
  ShoppingCart,
  Truck,
  DollarSign,
  BarChart3,
  Bell,
  Settings,
  Globe,
  FileText,
  MessageCircle,
  Receipt,
  type LucideIcon,
} from 'lucide-react';

// ============================================================
// MASTER NAV ITEM DEFINITIONS
// ============================================================

export interface MobileNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  feature: string;
  view: AppView;
}

const ALL_NAV_ITEMS: MobileNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, feature: 'dashboard', view: 'dashboard' },
  { id: 'equipment', label: 'Equipment', icon: Wrench, feature: 'equipment', view: 'equipment' },
  { id: 'complaints', label: 'Complaints', icon: AlertTriangle, feature: 'complaints', view: 'complaints' },
  { id: 'work-orders', label: 'Work Orders', icon: ClipboardList, feature: 'work-orders', view: 'work-orders' },
  { id: 'invoices', label: 'Invoices', icon: Receipt, feature: 'invoices', view: 'invoices' },
  { id: 'quotations', label: 'Quotations', icon: FileText, feature: 'quotations', view: 'quotations' },
  { id: 'pm', label: 'Preventive Maint.', icon: CalendarClock, feature: 'pm', view: 'pm' },
  { id: 'inventory', label: 'Inventory', icon: Package, feature: 'inventory', view: 'inventory' },
  { id: 'customers', label: 'Customers', icon: Users, feature: 'customers', view: 'customers' },
  { id: 'finance', label: 'Finance', icon: DollarSign, feature: 'finance', view: 'finance' },
  { id: 'employees', label: 'Employees', icon: UserCog, feature: 'employees', view: 'employees' },
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart, feature: 'purchases', view: 'purchases' },
  { id: 'vehicles', label: 'Vehicles', icon: Truck, feature: 'vehicles', view: 'vehicles' },
  { id: 'reports', label: 'Reports', icon: BarChart3, feature: 'reports', view: 'reports' },
  { id: 'notifications', label: 'Notifications', icon: Bell, feature: 'notifications', view: 'notifications' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, feature: 'whatsapp', view: 'whatsapp' },
  { id: 'settings', label: 'Settings', icon: Settings, feature: 'settings', view: 'settings' },
  { id: 'cms', label: 'CMS', icon: Globe, feature: 'cms', view: 'cms-dashboard' },
];

export const MAX_PINNED = 4;
const STORAGE_KEY = 'cmms_mobile_nav_pinned';
export const DEFAULT_PINNED = ['dashboard', 'complaints', 'work-orders', 'invoices'];

// ============================================================
// LOAD FROM LOCAL STORAGE (pure function, no hooks)
// ============================================================

function loadPinnedFromStorage(): string[] {
  if (typeof window === 'undefined') return DEFAULT_PINNED;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, MAX_PINNED);
      }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_PINNED;
}

function savePinnedToStorage(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================
// HOOK
// ============================================================

export function useMenuPreferences() {
  const { user } = useAuthStore();

  // Lazy initialize from localStorage
  const [pinnedIds, setPinnedIds] = useState<string[]>(loadPinnedFromStorage);

  // All items the user can access (role-filtered)
  const accessibleItems = useMemo(() => {
    if (!user) return [];
    return ALL_NAV_ITEMS.filter((item) => canAccess(user.role, item.feature));
  }, [user]);

  // Pinned items (user's 4 selected, in order, filtered by accessibility)
  const pinnedItems = useMemo(() => {
    return pinnedIds
      .map((id) => accessibleItems.find((item) => item.id === id))
      .filter((item): item is MobileNavItem => !!item)
      .slice(0, MAX_PINNED);
  }, [pinnedIds, accessibleItems]);

  // More items (everything not pinned, in master order)
  const moreItems = useMemo(() => {
    const pinnedSet = new Set(pinnedItems.map((i) => i.id));
    return accessibleItems.filter((item) => !pinnedSet.has(item.id));
  }, [pinnedItems, accessibleItems]);

  // Update pinned selection
  const updatePinned = useCallback(
    (newPinnedIds: string[]) => {
      const valid = newPinnedIds.filter((id) =>
        accessibleItems.some((item) => item.id === id)
      );
      // Pad with first accessible non-pinned items if needed
      if (valid.length < MAX_PINNED) {
        const existingSet = new Set(valid);
        for (const item of accessibleItems) {
          if (!existingSet.has(item.id)) {
            valid.push(item.id);
            if (valid.length >= MAX_PINNED) break;
          }
        }
      }
      const final = valid.slice(0, MAX_PINNED);
      setPinnedIds(final);
      savePinnedToStorage(final);
    },
    [accessibleItems]
  );

  // Check if an item can be toggled
  const canToggle = useCallback(
    (itemId: string): { canPin: boolean; canUnpin: boolean } => {
      const isPinned = pinnedIds.includes(itemId);
      const isAccessible = accessibleItems.some((item) => item.id === itemId);
      if (!isAccessible) return { canPin: false, canUnpin: false };
      return {
        canPin: !isPinned && pinnedIds.length < MAX_PINNED,
        canUnpin: isPinned,
      };
    },
    [pinnedIds, accessibleItems]
  );

  // Toggle a single item
  const toggleItem = useCallback(
    (itemId: string) => {
      if (pinnedIds.includes(itemId)) {
        updatePinned(pinnedIds.filter((id) => id !== itemId));
      } else if (pinnedIds.length < MAX_PINNED) {
        updatePinned([...pinnedIds, itemId]);
      }
    },
    [pinnedIds, updatePinned]
  );

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const validDefaults = DEFAULT_PINNED.filter((id) =>
      accessibleItems.some((item) => item.id === id)
    );
    const existingSet = new Set(validDefaults);
    for (const item of accessibleItems) {
      if (!existingSet.has(item.id)) {
        validDefaults.push(item.id);
        if (validDefaults.length >= MAX_PINNED) break;
      }
    }
    updatePinned(validDefaults.slice(0, MAX_PINNED));
  }, [accessibleItems, updatePinned]);

  return {
    pinnedItems,
    moreItems,
    allItems: accessibleItems,
    updatePinned,
    canToggle,
    toggleItem,
    resetToDefaults,
    maxPinned: MAX_PINNED,
    loaded: true, // Always true since we lazy-init
  };
}