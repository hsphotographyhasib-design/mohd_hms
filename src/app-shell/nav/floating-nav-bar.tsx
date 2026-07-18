'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, useAuthStore, canAccess } from '@/app-shell/store';
import type { AppView } from '@/core/types';
import { cn } from '@/core/utils/utils';
import {
  LayoutDashboard,
  Wrench,
  AlertTriangle,
  ClipboardList,
  CalendarClock,
  Package,
  Users,
  UserCog,
  HardHat,
  ShoppingCart,
  Truck,
  DollarSign,
  BarChart3,
  Bell,
  Settings,
  Globe,
  HeartHandshake,
  ChevronLeft,
  ChevronRight,
  Shield,
  type LucideIcon,
  Receipt,
  FileText,
  MessageCircle,
  Mail,
  ClipboardCheck,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface NavItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  feature: string;
  isCms?: boolean;
}

// ============================================================
// NAVIGATION CONFIGURATION (all flat — no sub-menus)
// ============================================================

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, feature: 'dashboard' },
  { id: 'equipment', label: 'Equipment', icon: Wrench, feature: 'equipment' },
  { id: 'complaints', label: 'Complaints', icon: AlertTriangle, feature: 'complaints' },
  { id: 'work-orders', label: 'Work Orders', icon: ClipboardList, feature: 'work-orders' },
  { id: 'pm', label: 'Preventive Maint.', icon: CalendarClock, feature: 'pm' },
  { id: 'inventory', label: 'Inventory', icon: Package, feature: 'inventory' },
  { id: 'customers', label: 'Customers', icon: Users, feature: 'customers' },
  { id: 'invoices', label: 'Invoices', icon: Receipt, feature: 'invoices' },
  { id: 'quotations', label: 'Quotations', icon: FileText, feature: 'quotations' },
  { id: 'finance', label: 'Finance', icon: DollarSign, feature: 'finance' },
  { id: 'employees', label: 'Employees', icon: UserCog, feature: 'employees' },
  { id: 'technicians', label: 'Technicians', icon: HardHat, feature: 'technicians' },
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart, feature: 'purchases' },
  { id: 'vehicles', label: 'Vehicles', icon: Truck, feature: 'vehicles' },
  { id: 'reports', label: 'Reports', icon: BarChart3, feature: 'reports' },
  { id: 'hr-dashboard', label: 'HR', icon: HeartHandshake, feature: 'hr' },
  { id: 'user-management', label: 'Users', icon: Shield, feature: 'user-management' },
  { id: 'notifications', label: 'Notifications', icon: Bell, feature: 'notifications' },
  { id: 'email-management', label: 'Email', icon: Mail, feature: 'email' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, feature: 'whatsapp' },
  { id: 'irms', label: 'Inspection', icon: ClipboardCheck, feature: 'irms' },
  { id: 'settings', label: 'Settings', icon: Settings, feature: 'settings' },
];

const CMS_ITEM: NavItemConfig = {
  id: 'cms-dashboard',
  label: 'CMS',
  icon: Globe,
  feature: 'cms',
  isCms: true,
};

const SCROLL_AMOUNT = 200;

// ============================================================
// ARROW BUTTON SUB-COMPONENT
// ============================================================

function ArrowButton({
  direction,
  visible,
  onScroll,
}: {
  direction: 'left' | 'right';
  visible: boolean;
  onScroll: (direction: 'left' | 'right') => void;
}) {
  if (!visible) return null;
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => onScroll(direction)}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center',
        'bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-full p-1.5 shadow-md',
        'border border-white/30 dark:border-white/10',
        'text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400',
        'transition-colors duration-150',
        direction === 'left' ? 'left-1' : 'right-1'
      )}
      aria-label={direction === 'left' ? 'Scroll left' : 'Scroll right'}
    >
      <Icon className="h-3.5 w-3.5" />
    </motion.button>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function FloatingNavBar() {
  // ---- Stores ----
  const { currentView, setView } = useAppStore();
  const { user } = useAuthStore();

  // ---- Local State ----
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // ---- Refs ----
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navItemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // ============================================================
  // FILTERED NAV ITEMS BY ROLE
  // ============================================================

  const filteredItems = useMemo(() => {
    if (!user) return { mainItems: [], showCms: false };
    const role = user.role;
    const mainItems = NAV_ITEMS.filter((item) => canAccess(role, item.feature));
    const showCms = canAccess(role, 'cms');
    return { mainItems, showCms };
  }, [user]);

  // ============================================================
  // SCROLL OVERFLOW DETECTION
  // ============================================================

  const checkOverflow = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    checkOverflow();
    const el = scrollContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkOverflow, filteredItems]);

  // ============================================================
  // AUTO-SCROLL ACTIVE ITEM INTO VIEW
  // ============================================================

  useEffect(() => {
    if (!currentView || currentView === 'login') return;
    const timer = setTimeout(() => {
      const btn = navItemRefs.current.get(currentView);
      if (btn) {
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentView]);

  // ============================================================
  // SCROLL HANDLING
  // ============================================================

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const hasOverflow = el.scrollWidth > el.clientWidth;
    if (!hasOverflow) return;

    // Horizontal trackpad swipe: let the browser handle it natively for momentum
    if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) {
      return; // Don't prevent default — browser's native horizontal scroll is smoother
    }

    // Vertical scroll: convert to horizontal, but only when there's room
    const { scrollLeft, scrollWidth, clientWidth } = el;
    if (e.deltaY > 0 && scrollLeft >= scrollWidth - clientWidth - 1) return;
    if (e.deltaY < 0 && scrollLeft <= 1) return;

    e.preventDefault();
    el.scrollLeft += e.deltaY;
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -SCROLL_AMOUNT : SCROLL_AMOUNT;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel as unknown as EventListener, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel as unknown as EventListener);
  }, [handleWheel]);

  // ============================================================
  // NAV ITEM CLICK
  // ============================================================

  const handleItemClick = useCallback(
    (item: NavItemConfig) => {
      setView(item.id as AppView);
    },
    [setView]
  );

  // ============================================================
  // HELPER: CHECK IF NAV ITEM IS ACTIVE
  // ============================================================

  const isActive = useCallback(
    (item: NavItemConfig) => {
      if (currentView === item.id) return true;
      // HR sub-views should highlight the HR nav item
      if (item.id === 'hr-dashboard' && currentView?.startsWith('hr-')) return true;
      // CMS sub-views should highlight the CMS nav item
      if (item.id === 'cms-dashboard' && currentView?.startsWith('cms-')) return true;
      // WhatsApp sub-views should highlight the WhatsApp nav item
      if (item.id === 'whatsapp' && currentView?.startsWith('whatsapp')) return true;
      return false;
    },
    [currentView]
  );

  // ============================================================
  // RENDER: NAV ITEM BUTTON
  // ============================================================

  const renderNavItem = (item: NavItemConfig) => {
    const Icon = item.icon;
    const active = isActive(item);

    return (
      <motion.button
        key={item.id}
        ref={(el) => {
          if (el) navItemRefs.current.set(item.id, el);
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleItemClick(item)}
        className={cn(
          'relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap',
          'transition-colors duration-200 select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1',
          active
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">{item.label}</span>

        {/* Active indicator */}
        {active && (
          <motion.div
            layoutId="nav-active-underline"
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-emerald-500 rounded-full shadow-[0_2px_8px_rgba(16,185,129,0.4)]"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
      </motion.button>
    );
  };

  // ============================================================
  // EARLY RETURN IF NO USER
  // ============================================================

  if (!user) return null;

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="hidden md:block sticky top-[68px] z-40 w-full max-w-5xl mx-auto px-4 mt-2"
      aria-label="Main navigation"
    >
      <div
        className={cn(
          'relative flex items-center',
          'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl',
          'border border-gray-200/80 dark:border-white/10 rounded-2xl',
          'shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-black/20',
          'px-2 py-1.5'
        )}
      >
        {/* Left scroll arrow */}
        <AnimatePresence>
          <ArrowButton direction="left" visible={canScrollLeft} onScroll={scroll} />
        </AnimatePresence>

        {/* Scrollable nav items */}
        <div
          ref={scrollContainerRef}
          onScroll={checkOverflow}
          className="flex items-center gap-0.5 overflow-x-auto scrollbar-none px-1"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Main nav items */}
          {filteredItems.mainItems.map(renderNavItem)}

          {/* CMS divider + item */}
          {filteredItems.mainItems.length > 0 && filteredItems.showCms && (
            <div
              className="flex items-center gap-0.5 mx-1.5"
              role="separator"
            >
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
              {renderNavItem(CMS_ITEM)}
            </div>
          )}
          {filteredItems.mainItems.length === 0 && filteredItems.showCms && (
            renderNavItem(CMS_ITEM)
          )}
        </div>

        {/* Right scroll arrow */}
        <AnimatePresence>
          <ArrowButton direction="right" visible={canScrollRight} onScroll={scroll} />
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
