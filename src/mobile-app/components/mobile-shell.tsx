'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import {
  Home,
  AlertTriangle,
  Menu,
  Search,
  Bell,
  FileText,
  QrCode,
  Receipt,
  ChevronRight,
  X,
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
  LogOut,
  FolderOpen,
  HelpCircle,
  Headphones,
  Shield,
  Smartphone,
  CreditCard,
  Globe,
  Info,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
} from 'lucide-react';
import { useAppStore, useAuthStore, canAccess } from '@/app-shell/store';
import { useNotificationStore } from '@/modules/notifications/services/store';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/shared/ui/sheet';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/core/utils/utils';
import { BrandLogo } from '@/shared/components/brand/brand-logo';
import { toast } from 'sonner';
import type { AppView, UserRole } from '@/core/types';
import { QrScannerModal } from './qr-scanner-modal';

// ─── More Menu Items ──────────────────────────────────────────
interface MoreMenuItem {
  label: string;
  icon: React.ElementType;
  view?: AppView;
  feature?: string;
  action?: 'logout';
  roles?: UserRole[];
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
      { label: 'Work Orders', icon: ClipboardList, view: 'work-orders', feature: 'work-orders' },
      { label: 'PM Schedules', icon: CalendarClock, view: 'pm', feature: 'pm' },
      { label: 'Inventory', icon: Warehouse, view: 'inventory', feature: 'inventory' },
    ],
  },
  {
    title: 'Business',
    items: [
      { label: 'Quotations', icon: Receipt, view: 'quotations', feature: 'quotations' },
      { label: 'Finance', icon: DollarSign, view: 'finance', feature: 'finance' },
      { label: 'Purchases', icon: ShoppingCart, view: 'purchases', feature: 'purchases' },
      { label: 'Customers', icon: Users, view: 'customers', feature: 'customers' },
    ],
  },
  {
    title: 'Team',
    items: [
      { label: 'Employees', icon: UserCog, view: 'employees', feature: 'employees', roles: ['super_admin', 'admin', 'manager'] },
      { label: 'Technicians', icon: Wrench, view: 'technicians', feature: 'technicians', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
      { label: 'Vehicles', icon: Car, view: 'vehicles', feature: 'vehicles', roles: ['super_admin', 'admin', 'manager'] },
      { label: 'Reports', icon: BarChart3, view: 'reports', feature: 'reports' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', icon: UserCircle, view: 'profile', feature: 'dashboard' },
      { label: 'My Documents', icon: FolderOpen, view: 'documents', feature: 'dashboard' },
      { label: 'Notifications', icon: Bell, view: 'notifications', feature: 'dashboard' },
      { label: 'Help & Support', icon: HelpCircle, view: 'help', feature: 'dashboard' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', icon: Settings, view: 'settings', feature: 'settings', roles: ['super_admin', 'admin'] },
      { label: 'User Mgmt', icon: Shield, view: 'user-management', feature: 'user-management', roles: ['super_admin', 'admin'] },
      { label: 'WhatsApp', icon: MessageSquare, view: 'whatsapp', feature: 'whatsapp', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
      { label: 'Email', icon: Smartphone, view: 'email-management', feature: 'email', roles: ['super_admin', 'admin'] },
    ],
  },
  {
    title: '',
    items: [
      { label: 'Logout', icon: LogOut, action: 'logout' },
    ],
  },
];

// ─── Role-based Bottom Nav Config ─────────────────────────────
interface NavTab {
  id: AppView;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
  feature?: string;
}

const LEFT_NAV_TABS: NavTab[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'complaints', label: 'Complaints', icon: AlertTriangle },
];

const RIGHT_NAV_TABS: NavTab[] = [
  { id: 'invoices', label: 'Invoices', icon: Receipt, roles: ['super_admin', 'admin', 'manager', 'finance', 'customer'] },
];

const TECHNICIAN_RIGHT_TABS: NavTab[] = [
  { id: 'work-orders', label: 'Tasks', icon: ClipboardList },
];

const ADMIN_RIGHT_TABS: NavTab[] = [
  { id: 'work-orders', label: 'W. Orders', icon: ClipboardList },
];

// ─── Mobile Header ─────────────────────────────────────────────
function MobileHeader() {
  const { setView, searchOpen, setSearchOpen } = useAppStore();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        setView('complaints', { search: searchQuery.trim() });
        setSearchOpen(false);
        setSearchQuery('');
      }
    },
    [searchQuery, setView, setSearchOpen],
  );

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <BrandLogo variant="icon-square" size="sm" />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-emerald-700">MOHD.HMS</span>
            <span className="text-[9px] font-medium uppercase tracking-widest text-gray-400">Enterprise</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-10" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search">
            {searchOpen ? <X className="size-5 text-gray-500" /> : <Search className="size-5 text-gray-500" />}
          </Button>
          <Button variant="ghost" size="icon" className="relative size-10" onClick={() => setView('notifications')} aria-label="Notifications">
            <Bell className="size-5 text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="size-10 rounded-full" onClick={() => setView('profile')} aria-label="Profile">
            <div className="relative flex size-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="size-8 rounded-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = initials; }} />
              ) : initials}
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-emerald-500" />
            </div>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden border-b border-gray-100 bg-white shadow-sm"
          >
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 px-4 py-2.5">
              <Search className="size-4 shrink-0 text-gray-400" />
              <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search complaints, equipment, invoices..." className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none" />
              {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600" aria-label="Clear"><X className="size-4" /></button>}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── More Menu Sheet (Role-filtered) ──────────────────────────
function MoreMenuSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { setView } = useAppStore();
  const { logout, user } = useAuthStore();

  const handleNavigate = useCallback((view: AppView) => { onOpenChange(false); setView(view); }, [setView, onOpenChange]);
  const handleLogout = useCallback(() => { onOpenChange(false); logout(); }, [logout, onOpenChange]);

  const role = user?.role;

  // Filter menu items by role
  const filteredGroups = useMemo(() => {
    if (!role) return moreMenuGroups;
    return moreMenuGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.feature) return true; // Always show (logout, profile, etc.)
        if (item.roles) return item.roles.includes(role);
        return canAccess(role, item.feature);
      }),
    })).filter((group) => group.items.length > 0 || group.title === '');
  }, [role]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl px-0 pb-8">
        <SheetHeader className="px-4 pb-0 pt-2">
          <SheetTitle className="text-base font-semibold text-gray-900">All Modules</SheetTitle>
          <SheetDescription className="text-xs text-gray-500">Navigate to any section</SheetDescription>
        </SheetHeader>
        <div className="mt-3 overflow-y-auto px-4 pb-2" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          {filteredGroups.map((group) => (
            <div key={group.title || 'logout'} className="mb-4">
              {group.title && <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group.title}</h3>}
              <div className="grid grid-cols-3 gap-2">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { if (item.action === 'logout') handleLogout(); else if (item.view) handleNavigate(item.view); }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors active:bg-gray-100 hover:bg-gray-50',
                      item.action === 'logout' && 'col-span-3 flex-row gap-3 rounded-xl px-3 py-3 mt-1',
                    )}
                  >
                    <div className={cn('flex size-10 items-center justify-center rounded-xl', item.action === 'logout' ? 'bg-red-50' : 'bg-gray-100')}>
                      <item.icon className={cn('size-5', item.action === 'logout' ? 'text-red-500' : 'text-gray-600')} />
                    </div>
                    <span className={cn('text-xs font-medium leading-tight', item.action === 'logout' ? 'text-red-600' : 'text-gray-700')}>{item.label}</span>
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

// ─── Floating Glassmorphism Bottom Navigation (Role-Adaptive) ─
// Views that render their own sticky bottom action bar — hide floating nav to avoid overlap
const VIEWS_WITH_OWN_BOTTOM_BAR: string[] = [
  'new-quotation',
  'quotation-edit',
  'new-work-order',
  'new-invoice',
  'invoice-edit',
];

function FloatingBottomNav() {
  const { currentView, setView } = useAppStore();
  const { user } = useAuthStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const { scrollY } = useScroll();
  const lastY = useRef(0);

  const role = user?.role || 'customer';

  // Hide nav entirely when the current view has its own bottom action bar
  const hiddenByView = VIEWS_WITH_OWN_BOTTOM_BAR.includes(currentView);

  // Auto-hide on scroll down, show on scroll up
  useMotionValueEvent(scrollY, 'change', (y) => {
    if (y > lastY.current && y > 80) setVisible(false);
    else setVisible(true);
    lastY.current = y;
  });

  // Pick right tabs based on role
  const rightTabs = useMemo(() => {
    if (role === 'technician') return TECHNICIAN_RIGHT_TABS;
    if (['super_admin', 'admin', 'manager', 'supervisor'].includes(role)) return ADMIN_RIGHT_TABS;
    return RIGHT_NAV_TABS;
  }, [role]);

  const isActive = (id: string) => currentView === id;

  const handleQrScan = useCallback((data: string) => {
    fetch('/api/qr/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrId: data }),
    }).catch(() => {});
    setView('equipment', { qrId: data });
    toast.success(`QR Scanned: ${data}`, { description: 'Navigating to details...' });
  }, [setView]);

  // Filter left tabs by role
  const visibleLeftTabs = useMemo(() => {
    return LEFT_NAV_TABS.filter((tab) => {
      if (!tab.feature) return true;
      if (tab.roles) return tab.roles.includes(role);
      return canAccess(role, tab.feature);
    });
  }, [role]);

  // Filter right tabs by role
  const visibleRightTabs = useMemo(() => {
    return rightTabs.filter((tab) => {
      if (!tab.feature) return true;
      if (tab.roles) return tab.roles.includes(role);
      return canAccess(role, tab.feature);
    });
  }, [role, rightTabs]);

  if (hiddenByView) return null;

  return (
    <>
      <motion.nav
        animate={{ y: visible ? 0 : 120, opacity: visible ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-4 right-4 z-40 flex items-center"
        style={{
          bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          height: 68,
          borderRadius: 34,
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.2)',
        }}
        role="tablist"
        aria-label="Main navigation"
      >
        {/* Left: Home, Complaints (or role-filtered) */}
        <div className="flex flex-1 items-center justify-around pl-5">
          {visibleLeftTabs.map((tab) => {
            const active = isActive(tab.id);
            const Icon = tab.icon;
            return (
              <motion.button key={tab.id} onClick={() => setView(tab.id)} role="tab" aria-selected={active} aria-label={tab.label}
                whileTap={{ scale: 0.88 }} className="relative flex min-h-[48px] min-w-[52px] flex-col items-center justify-center gap-0.5 py-1">
                {active && <motion.div layoutId="mob-nav-dot" className="absolute -top-0.5 size-1 rounded-full bg-emerald-600" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
                <Icon className={cn('size-[22px]', active ? 'text-emerald-600' : 'text-gray-400')} strokeWidth={active ? 2.2 : 1.7} />
                <span className={cn('text-[10px] font-medium leading-none', active ? 'text-emerald-600' : 'text-gray-400')}>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Center: QR Scanner Button */}
        <div className="relative flex w-[72px] shrink-0 items-center justify-center">
          <motion.button onClick={() => setQrOpen(true)} whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.05 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 translate-y-1/3 flex size-[56px] items-center justify-center rounded-full text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 6px 24px rgba(5,150,105,0.4)' }}
            aria-label="Scan QR Code">
            <QrCode className="size-6" strokeWidth={2.2} />
          </motion.button>
        </div>

        {/* Right: Role-specific tabs + More */}
        <div className="flex flex-1 items-center justify-around pr-5">
          {visibleRightTabs.map((tab) => {
            const active = isActive(tab.id);
            const Icon = tab.icon;
            return (
              <motion.button key={tab.id} onClick={() => setView(tab.id)} role="tab" aria-selected={active} aria-label={tab.label}
                whileTap={{ scale: 0.88 }} className="relative flex min-h-[48px] min-w-[52px] flex-col items-center justify-center gap-0.5 py-1">
                {active && <motion.div layoutId="mob-nav-dot" className="absolute -top-0.5 size-1 rounded-full bg-emerald-600" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
                <Icon className={cn('size-[22px]', active ? 'text-emerald-600' : 'text-gray-400')} strokeWidth={active ? 2.2 : 1.7} />
                <span className={cn('text-[10px] font-medium leading-none', active ? 'text-emerald-600' : 'text-gray-400')}>{tab.label}</span>
              </motion.button>
            );
          })}
          <motion.button onClick={() => setMoreOpen(true)} role="tab" aria-selected={false} aria-label="More"
            whileTap={{ scale: 0.88 }} className="relative flex min-h-[48px] min-w-[52px] flex-col items-center justify-center gap-0.5 py-1">
            <Menu className="size-[22px] text-gray-400" strokeWidth={1.7} />
            <span className="text-[10px] font-medium leading-none text-gray-400">More</span>
          </motion.button>
        </div>
      </motion.nav>

      <MoreMenuSheet open={moreOpen} onOpenChange={setMoreOpen} />
      <QrScannerModal open={qrOpen} onOpenChange={setQrOpen} onScan={handleQrScan} />
    </>
  );
}

// ─── Mobile Shell (Main Export) ────────────────────────────────
export function MobileShell({ children }: { children: React.ReactNode }) {
  const { currentView } = useAppStore();
  const navHidden = VIEWS_WITH_OWN_BOTTOM_BAR.includes(currentView);
  const paddingBottom = navHidden
    ? 'calc(16px + env(safe-area-inset-bottom, 0px))'
    : 'calc(100px + env(safe-area-inset-bottom, 0px))';

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50">
      <MobileHeader />
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom }}>
        {children}
      </main>
      <FloatingBottomNav />
    </div>
  );
}