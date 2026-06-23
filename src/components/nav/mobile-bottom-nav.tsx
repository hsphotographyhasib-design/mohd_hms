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
];

// ============================================================
// COMPONENT
// ============================================================

export function MobileBottomNav() {
  const { currentView, setView, setMobileNavOpen } = useAppStore();
  const { user } = useAuthStore();

  const visibleItems = useMemo(() => {
    if (!user) return [];
    return BOTTOM_NAV_ITEMS.filter((item) => canAccess(user.role, item.feature));
  }, [user]);

  if (!user || visibleItems.length === 0) return null;

  const isActive = (view: AppView) => currentView === view;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      aria-label="Mobile bottom navigation"
    >
      {/* Background with safe area */}
      <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-white/10">
        <div className="flex items-center justify-around px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {/* Key nav items */}
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.view);
            return (
              <button
                key={item.id}
                onClick={() => setView(item.view)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl',
                  'min-w-[56px] min-h-[44px]',
                  'transition-colors duration-200',
                  active
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="relative">
                  <Icon className={cn('h-5 w-5', active && 'drop-shadow-sm')} />
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                  )}
                </div>
                <span className={cn(
                  'text-[10px] leading-tight font-medium',
                  active ? 'text-emerald-600 dark:text-emerald-400' : ''
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px h-8 bg-border/40 self-center" />

          {/* More button — opens the sheet with all nav items */}
          <button
            onClick={() => setMobileNavOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl',
              'min-w-[56px] min-h-[44px]',
              'transition-colors duration-200',
              'text-muted-foreground hover:text-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] leading-tight font-medium">More</span>
          </button>
        </div>
      </div>
    </nav>
  );
}