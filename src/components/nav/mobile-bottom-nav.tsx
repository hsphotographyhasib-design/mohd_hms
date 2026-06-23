'use client';

import { useMemo } from 'react';
import { useAppStore, useAuthStore, canAccess } from '@/store';
import type { AppView } from '@/types';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  AlertTriangle,
  ClipboardList,
  MoreHorizontal,
  Plus,
  type LucideIcon,
} from 'lucide-react';

// ============================================================
// BOTTOM NAV CONFIG
// ============================================================

interface BottomNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  feature: string;
  view: AppView;
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, feature: 'dashboard', view: 'dashboard' },
  { id: 'complaints', label: 'Complaints', icon: AlertTriangle, feature: 'complaints', view: 'complaints' },
  { id: 'work-orders', label: 'Work Orders', icon: ClipboardList, feature: 'work-orders', view: 'work-orders' },
  { id: 'more', label: 'More', icon: MoreHorizontal, feature: '', view: 'dashboard' as AppView },
];

// ============================================================
// COMPONENT
// ============================================================

export function MobileBottomNav() {
  const { currentView, setView, setMobileNavOpen } = useAppStore();
  const { user } = useAuthStore();

  const visibleItems = useMemo(() => {
    if (!user) return [];
    return BOTTOM_NAV_ITEMS.filter((item) => !item.feature || canAccess(user.role, item.feature));
  }, [user]);

  if (!user || visibleItems.length === 0) return null;

  const isActive = (view: AppView) => currentView === view;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      aria-label="Mobile bottom navigation"
    >
      {/* Background with safe area */}
      <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-gray-200/60 dark:border-white/10">
        <div className="relative flex items-end justify-around px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {/* Left nav items (Home, Complaints) */}
          {visibleItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.view);
            return (
              <button
                key={item.id}
                onClick={() => setView(item.view)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1 px-4',
                  'min-w-[56px] min-h-[48px]',
                  'transition-colors duration-200',
                  active
                    ? 'text-[#0A6E4A]'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'drop-shadow-sm')} />
                <span className={cn(
                  'text-[10px] leading-tight font-medium',
                  active ? 'text-[#0A6E4A] font-semibold' : ''
                )}>
                  {item.label}
                </span>
                {active && (
                  <div className="w-1 h-1 rounded-full bg-[#0A6E4A]" />
                )}
              </button>
            );
          })}

          {/* Center FAB Button */}
          <div className="flex flex-col items-center -mt-5">
            <button
              onClick={() => setView('new-complaint')}
              className={cn(
                'w-14 h-14 rounded-full bg-[#0A6E4A] shadow-[0_4px_14px_rgba(10,110,74,0.4)]',
                'flex items-center justify-center',
                'active:scale-95 transition-transform duration-150',
                'border-4 border-white dark:border-gray-950'
              )}
              aria-label="New Complaint"
            >
              <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right nav items (Work Orders, More) */}
          {visibleItems.slice(2).map((item) => {
            const Icon = item.icon;
            const active = item.id !== 'more' && isActive(item.view);
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'more') {
                    setMobileNavOpen(true);
                  } else {
                    setView(item.view);
                  }
                }}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1 px-4',
                  'min-w-[56px] min-h-[48px]',
                  'transition-colors duration-200',
                  active
                    ? 'text-[#0A6E4A]'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'drop-shadow-sm')} />
                <span className={cn(
                  'text-[10px] leading-tight font-medium',
                  active ? 'text-[#0A6E4A] font-semibold' : ''
                )}>
                  {item.label}
                </span>
                {active && (
                  <div className="w-1 h-1 rounded-full bg-[#0A6E4A]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}