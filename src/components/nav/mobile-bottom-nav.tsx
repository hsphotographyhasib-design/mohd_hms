'use client';

import { useState, useCallback, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, useAuthStore, canAccess } from '@/store';
import type { AppView } from '@/types';
import { cn } from '@/lib/utils';
import {
  useMenuPreferences,
  DEFAULT_PINNED,
  MAX_PINNED,
  type MobileNavItem,
} from '@/hooks/use-menu-preferences';
import {
  Grid3X3,
  Pencil,
  RotateCcw,
  Check,
  Plus,
  X,
  AlertTriangle,
  FileText,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================================
// QUICK ACTIONS (for FAB)
// ============================================================

interface QuickAction {
  label: string;
  icon: LucideIcon;
  view: AppView;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'New Complaint', icon: AlertTriangle, view: 'new-complaint', color: 'bg-amber-500' },
  { label: 'New Quotation', icon: FileText, view: 'new-quotation', color: 'bg-blue-500' },
  { label: 'New Work Order', icon: ClipboardList, view: 'work-orders', color: 'bg-purple-500' },
];

// ============================================================
// CUSTOMIZE SHEET
// ============================================================

interface CustomizeSheetProps {
  open: boolean;
  onClose: () => void;
  allItems: MobileNavItem[];
  currentPinned: MobileNavItem[];
  maxPinned: number;
  onSave: (ids: string[]) => void;
}

function CustomizeSheet({ open, onClose, allItems, currentPinned, maxPinned, onSave }: CustomizeSheetProps) {
  const [tempPinned, setTempPinned] = useState<string[]>(
    () => currentPinned.map((i) => i.id)
  );

  const handleToggle = useCallback(
    (itemId: string) => {
      setTempPinned((prev) => {
        if (prev.includes(itemId)) {
          return prev.filter((id) => id !== itemId);
        } else if (prev.length < maxPinned) {
          return [...prev, itemId];
        }
        return prev;
      });
    },
    [maxPinned]
  );

  const handleSave = useCallback(() => {
    onSave(tempPinned);
    onClose();
  }, [tempPinned, onSave, onClose]);

  const handleReset = useCallback(() => {
    const validDefaults = DEFAULT_PINNED.filter((id) =>
      allItems.some((item) => item.id === id)
    );
    const existingSet = new Set(validDefaults);
    for (const item of allItems) {
      if (!existingSet.has(item.id)) {
        validDefaults.push(item.id);
        if (validDefaults.length >= maxPinned) break;
      }
    }
    setTempPinned(validDefaults.slice(0, maxPinned));
  }, [allItems, maxPinned]);

  const pinnedCount = tempPinned.filter((id) =>
    allItems.some((item) => item.id === id)
  ).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 md:hidden"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-[60] md:hidden',
              'bg-white dark:bg-gray-900',
              'rounded-t-3xl',
              'max-h-[85vh] flex flex-col',
              'pb-[env(safe-area-inset-bottom)]'
            )}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Customize Menu
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Select up to {maxPinned} items for quick access
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Counter + Progress */}
            <div className="px-5 pt-3 pb-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Selected</span>
                <span
                  className={cn(
                    'text-sm font-semibold',
                    pinnedCount >= maxPinned
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  {pinnedCount} / {maxPinned}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  animate={{ width: `${(pinnedCount / maxPinned) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              </div>
            </div>

            {/* Pinned items preview */}
            <div className="px-5 pt-3 pb-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                Preview
              </p>
              <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2">
                {Array.from({ length: maxPinned }).map((_, i) => {
                  const itemId = tempPinned[i];
                  const item = allItems.find((a) => a.id === itemId);
                  if (!item) {
                    return (
                      <div
                        key={`empty-${i}`}
                        className="flex-1 h-10 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center"
                      >
                        <span className="text-gray-300 dark:text-gray-600 text-lg">+</span>
                      </div>
                    );
                  }
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20"
                    >
                      <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[8px] text-emerald-700 dark:text-emerald-400 font-medium leading-tight truncate w-full text-center">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
                <div className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <Grid3X3 className="h-4 w-4 text-gray-400" />
                  <span className="text-[8px] text-gray-400 font-medium">More</span>
                </div>
              </div>
            </div>

            {/* Menu items list */}
            <ScrollArea className="flex-1 px-3 py-1">
              <div className="space-y-0.5 pb-4">
                {allItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = tempPinned.includes(item.id);
                  const isFull = pinnedCount >= maxPinned;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleToggle(item.id)}
                      disabled={isFull && !isSelected}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
                        'transition-all duration-150 active:scale-[0.99]',
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-900/15'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                        isFull && !isSelected && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span
                        className={cn(
                          'flex-1 text-sm text-left',
                          isSelected
                            ? 'font-medium text-emerald-700 dark:text-emerald-400'
                            : 'text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {item.label}
                      </span>
                      <div
                        className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600'
                            : 'border-gray-300 dark:border-gray-600'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Save button */}
            <div className="px-5 pt-2 pb-3 border-t border-gray-100 dark:border-gray-800">
              <Button
                onClick={handleSave}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 rounded-xl"
                disabled={pinnedCount === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function MobileBottomNav() {
  const { currentView, setView } = useAppStore();
  const { user } = useAuthStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const {
    pinnedItems,
    moreItems,
    allItems,
    updatePinned,
    loaded,
  } = useMenuPreferences();

  // Quick actions filtered by role
  const visibleQuickActions = useMemo(() => {
    if (!user) return [];
    return QUICK_ACTIONS.filter((action) => {
      if (action.view === 'new-complaint') return canAccess(user.role, 'complaints');
      if (action.view === 'new-quotation') return canAccess(user.role, 'quotations');
      if (action.view === 'work-orders') return canAccess(user.role, 'work-orders');
      return true;
    });
  }, [user]);

  const handleNavClick = useCallback(
    (view: AppView) => setView(view),
    [setView]
  );

  const handleMoreClick = useCallback(
    (view: AppView) => {
      setMoreOpen(false);
      setView(view);
    },
    [setView]
  );

  const handleQuickAction = useCallback(
    (view: AppView) => {
      setFabOpen(false);
      setView(view);
    },
    [setView]
  );

  const handleOpenCustomize = useCallback(() => {
    setMoreOpen(false);
    // Wait for More sheet close animation, then open Customize
    setTimeout(() => setCustomizeOpen(true), 300);
  }, []);

  const isActive = useCallback(
    (view: AppView) => currentView === view,
    [currentView]
  );

  const isMoreActive = useMemo(() => {
    return moreItems.some((item) => currentView === item.view);
  }, [currentView, moreItems]);

  if (!user || !loaded) return null;

  // Split pinned items: 2 left of FAB, rest right of FAB
  const leftItems = pinnedItems.slice(0, 2);
  const rightItems = pinnedItems.slice(2);

  // Render a nav button
  const renderNavButton = (item: MobileNavItem) => {
    const Icon = item.icon;
    const active = isActive(item.view);
    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.view)}
        className={cn(
          'flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-xl',
          'transition-colors duration-200',
          active
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-gray-500 dark:text-gray-400'
        )}
      >
        <div className="relative">
          <Icon
            className={cn('h-5 w-5', active && 'stroke-[2.5]')}
            strokeWidth={active ? 2.5 : 1.8}
          />
          {active && (
            <motion.div
              layoutId="mobile-nav-indicator"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-5 bg-emerald-500 rounded-full"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </div>
        <span
          className={cn(
            'text-[10px] mt-0.5 leading-tight truncate max-w-[64px]',
            active && 'font-semibold'
          )}
        >
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* ===== BOTTOM NAVIGATION BAR ===== */}
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 md:hidden',
          'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl',
          'border-t border-gray-200/80 dark:border-white/10',
          'pb-[env(safe-area-inset-bottom)]'
        )}
        aria-label="Mobile navigation"
      >
        <div className="flex items-end justify-around px-1 pt-1.5 pb-1.5">
          {/* Left side: first 2 pinned items */}
          {leftItems.map(renderNavButton)}

          {/* ===== CENTER FAB BUTTON ===== */}
          <div className="relative flex flex-col items-center -mt-4">
            <button
              onClick={() => setFabOpen(!fabOpen)}
              className={cn(
                'relative z-10 flex items-center justify-center',
                'w-12 h-12 rounded-full',
                'bg-emerald-600 text-white shadow-lg',
                'shadow-emerald-600/30',
                'active:scale-95 transition-transform duration-150'
              )}
              aria-label="Quick actions"
              aria-expanded={fabOpen}
            >
              <AnimatePresence mode="wait">
                {fabOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="plus"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Plus className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Right side: remaining pinned items */}
          {rightItems.map(renderNavButton)}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-xl',
              'transition-colors duration-200',
              isMoreActive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            <div className="relative">
              <Grid3X3
                className={cn('h-5 w-5', isMoreActive && 'stroke-[2.5]')}
                strokeWidth={isMoreActive ? 2.5 : 1.8}
              />
              {isMoreActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-5 bg-emerald-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </div>
            <span
              className={cn(
                'text-[10px] mt-0.5 leading-tight',
                isMoreActive && 'font-semibold'
              )}
            >
              More
            </span>
          </button>
        </div>
      </nav>

      {/* ===== FAB QUICK ACTIONS OVERLAY ===== */}
      <AnimatePresence>
        {fabOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFabOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'fixed bottom-24 left-4 right-4 z-50 md:hidden',
                'bg-white dark:bg-gray-900 rounded-2xl',
                'border border-gray-200/80 dark:border-white/10',
                'shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
                'p-4'
              )}
            >
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Quick Actions
              </p>
              <div className="space-y-2">
                {visibleQuickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action.view)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.98] transition-all duration-150 text-left"
                    >
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white', action.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {action.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== MORE MENU (BOTTOM SHEET) ===== */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 md:hidden"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                'fixed bottom-0 left-0 right-0 z-50 md:hidden',
                'bg-white dark:bg-gray-900',
                'rounded-t-3xl',
                'max-h-[75vh] flex flex-col',
                'pb-[env(safe-area-inset-bottom)]'
              )}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  More Options
                </h3>
                <button
                  onClick={handleOpenCustomize}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors duration-150"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              {/* Scrollable item grid */}
              <ScrollArea className="flex-1 py-2">
                <div className="grid grid-cols-4 gap-2 px-4 pb-4">
                  {moreItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.view);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMoreClick(item.view)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl',
                          'transition-all duration-150 active:scale-95',
                          active
                            ? 'bg-emerald-50 dark:bg-emerald-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        )}
                      >
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center',
                            active
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span
                          className={cn(
                            'text-[10px] leading-tight text-center',
                            active
                              ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                              : 'text-gray-600 dark:text-gray-400'
                          )}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== CUSTOMIZE SHEET ===== */}
      <CustomizeSheet
        key={customizeOpen ? 'open' : 'closed'}
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        allItems={allItems}
        currentPinned={pinnedItems}
        maxPinned={MAX_PINNED}
        onSave={updatePinned}
      />
    </>
  );
}