'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  AlertTriangle,
  Plus,
  ClipboardList,
  Menu,
  Search,
  Bell,
  FileText,
  PlusCircle,
  QrCode,
  Receipt,
  ChevronRight,
  X,
  Package,
  CalendarClock,
  Warehouse,
  Users,
  FileBarChart,
  DollarSign,
  ShoppingCart,
  UserCog,
  Wrench,
  Car,
  BarChart3,
  Settings,
  UserCircle,
  MonitorSmartphone,
  Mail,
  Megaphone,
  MessageCircle,
  Briefcase,
} from 'lucide-react';
import { useAppStore, useAuthStore, useNotificationStore } from '@/store';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AppView } from '@/types';

// ─── Quick Action Items ────────────────────────────────────────
const quickActions = [
  { label: 'New Complaint', icon: FileText, view: 'new-complaint' as AppView },
  { label: 'New Work Order', icon: PlusCircle, view: 'new-work-order' as AppView },
  { label: 'Scan QR Code', icon: QrCode, view: null },
  { label: 'New Quotation', icon: Receipt, view: 'new-quotation' as AppView },
] as const;

// ─── More Menu Groups ──────────────────────────────────────────
interface MoreMenuItem {
  label: string;
  icon: React.ElementType;
  view: AppView;
  feature: string;
}

interface MoreMenuGroup {
  title: string;
  items: MoreMenuItem[];
}

const moreMenuGroups: MoreMenuGroup[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Equipment', icon: MonitorSmartphone, view: 'equipment', feature: 'equipment' },
      { label: 'PM Schedules', icon: CalendarClock, view: 'pm', feature: 'pm' },
      { label: 'Inventory', icon: Warehouse, view: 'inventory', feature: 'inventory' },
      { label: 'Customers', icon: Users, view: 'customers', feature: 'customers' },
    ],
  },
  {
    title: 'Business',
    items: [
      { label: 'Invoices', icon: FileBarChart, view: 'invoices', feature: 'invoices' },
      { label: 'Quotations', icon: Receipt, view: 'quotations', feature: 'quotations' },
      { label: 'Finance', icon: DollarSign, view: 'finance', feature: 'finance' },
      { label: 'Purchases', icon: ShoppingCart, view: 'purchases', feature: 'purchases' },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Employees', icon: UserCog, view: 'employees', feature: 'employees' },
      { label: 'Technicians', icon: Wrench, view: 'technicians', feature: 'technicians' },
    ],
  },
  {
    title: 'Fleet',
    items: [
      { label: 'Vehicles', icon: Car, view: 'vehicles', feature: 'vehicles' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Reports', icon: BarChart3, view: 'reports', feature: 'reports' },
      { label: 'Settings', icon: Settings, view: 'settings', feature: 'settings' },
    ],
  },
];

// ─── Mobile Header ─────────────────────────────────────────────
function MobileHeader() {
  const { setView, searchOpen, setSearchOpen } = useAppStore();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        toast.info(`Searching for "${searchQuery.trim()}"...`);
        // Future: implement global search
      }
    },
    [searchQuery],
  );

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-white px-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Logo */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-bold tracking-tight text-emerald-600">MOHD.HMS</span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1">
        {/* Search Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          onClick={() => setSearchOpen(!searchOpen)}
          aria-label="Toggle search"
        >
          {searchOpen ? <X className="size-5 text-gray-500" /> : <Search className="size-5 text-gray-500" />}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10"
          onClick={() => setView('notifications')}
          aria-label="Notifications"
        >
          <Bell className="size-5 text-gray-500" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        {/* Profile Avatar */}
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-full"
          onClick={() => setView('profile')}
          aria-label="Profile"
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="size-8 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.textContent = initials;
                }}
              />
            ) : (
              initials
            )}
          </div>
        </Button>
      </div>

      {/* Search Bar — Animated Slide Down */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="absolute left-0 right-0 top-14 overflow-hidden bg-white border-b border-gray-100 shadow-sm"
          >
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 px-4 py-2.5">
              <Search className="size-4 shrink-0 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search complaints, equipment, work orders..."
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="shrink-0 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── Quick Actions FAB Sheet ───────────────────────────────────
function QuickActionsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { setView } = useAppStore();

  const handleAction = useCallback(
    (view: AppView | null) => {
      onOpenChange(false);
      if (view) {
        setView(view);
      } else {
        toast.info('QR Code scanning will be available in a future update.');
      }
    },
    [setView, onOpenChange],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-6">
        <SheetHeader className="px-4 pb-0 pt-2">
          <SheetTitle className="text-base font-semibold text-gray-900">Quick Actions</SheetTitle>
          <SheetDescription className="text-xs text-gray-500">Create a new entry quickly</SheetDescription>
        </SheetHeader>
        <div className="mt-2 space-y-0.5 px-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleAction(action.view)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors active:bg-gray-100 hover:bg-gray-50"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50">
                <action.icon className="size-5 text-emerald-600" />
              </div>
              <span className="flex-1 text-sm font-medium text-gray-800">{action.label}</span>
              <ChevronRight className="size-4 text-gray-400" />
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── More Menu Sheet ───────────────────────────────────────────
function MoreMenuSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { setView } = useAppStore();
  const { user } = useAuthStore();

  const handleNavigate = useCallback(
    (view: AppView) => {
      onOpenChange(false);
      setView(view);
    },
    [setView, onOpenChange],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl px-0 pb-8">
        <SheetHeader className="px-4 pb-0 pt-2">
          <SheetTitle className="text-base font-semibold text-gray-900">All Modules</SheetTitle>
          <SheetDescription className="text-xs text-gray-500">Navigate to any section</SheetDescription>
        </SheetHeader>
        <div className="mt-3 overflow-y-auto px-4 pb-2" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          {moreMenuGroups.map((group) => (
            <div key={group.title} className="mb-4">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {group.title}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleNavigate(item.view)}
                    className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors active:bg-gray-100 hover:bg-gray-50"
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-gray-100">
                      <item.icon className="size-5 text-gray-600" />
                    </div>
                    <span className="text-xs font-medium leading-tight text-gray-700">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Bottom Navigation ─────────────────────────────────────────
function MobileBottomNav() {
  const { currentView, setView } = useAppStore();
  const [fabOpen, setFabOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs = [
    { id: 'dashboard' as AppView, label: 'Dashboard', icon: Home },
    { id: 'complaints' as AppView, label: 'Complaints', icon: AlertTriangle },
    { id: '__fab__' as const, label: '', icon: Plus },
    { id: 'work-orders' as AppView, label: 'Work Orders', icon: ClipboardList },
    { id: '__more__' as const, label: 'More', icon: Menu },
  ] as const;

  const handleTabPress = useCallback(
    (tab: (typeof tabs)[number]) => {
      if (tab.id === '__fab__') {
        setFabOpen(true);
        return;
      }
      if (tab.id === '__more__') {
        setMoreOpen(true);
        return;
      }
      setView(tab.id);
    },
    [setView],
  );

  const isActive = (id: string) => {
    if (id === '__fab__' || id === '__more__') return false;
    return currentView === id;
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-gray-200 bg-white"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        role="tablist"
        aria-label="Main navigation"
      >
        {tabs.map((tab) => {
          if (tab.id === '__fab__') {
            return (
              <div key="__fab__" className="relative -mt-6 flex items-center justify-center">
                <button
                  onClick={() => setFabOpen(true)}
                  className="flex size-14 items-center justify-center rounded-full bg-emerald-600 shadow-lg shadow-emerald-600/30 active:bg-emerald-700 transition-colors"
                  aria-label="Quick actions"
                >
                  <Plus className="size-6 text-white" strokeWidth={2.5} />
                </button>
              </div>
            );
          }

          const active = isActive(tab.id);
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab)}
              role="tab"
              aria-selected={active}
              aria-label={tab.label}
              className={cn(
                'relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors',
                active ? 'text-emerald-600' : 'text-gray-500',
              )}
            >
              {/* Active indicator dot */}
              {active && (
                <motion.div
                  layoutId="mobile-tab-dot"
                  className="absolute -top-0.5 size-1 rounded-full bg-emerald-600"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className={cn('size-5', active && 'text-emerald-600')} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <QuickActionsSheet open={fabOpen} onOpenChange={setFabOpen} />
      <MoreMenuSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}

// ─── Mobile Shell (Main Export) ────────────────────────────────
export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50">
      {/* Mobile Header — sticky top */}
      <MobileHeader />

      {/* Scrollable Content Area */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}