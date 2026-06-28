'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, useAuthStore, canAccess } from '@/store';
import type { AppView } from '@/types';
import { cn } from '@/lib/utils';
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
  ChevronLeft,
  ChevronRight,
  Shield,
  type LucideIcon,
  Receipt,
  FileText,
  MessageCircle,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface SubItem {
  id: string;
  label: string;
}

interface NavItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  feature: string;
  subItems?: SubItem[];
  isCms?: boolean;
}

// ============================================================
// NAVIGATION CONFIGURATION
// ============================================================

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, feature: 'dashboard' },
  {
    id: 'equipment',
    label: 'Equipment',
    icon: Wrench,
    feature: 'equipment',
    subItems: [
      { id: 'equipment', label: 'Equipment Registry' },
      { id: 'equipment', label: 'Asset Categories' },
      { id: 'equipment', label: 'QR Codes' },
    ],
  },
  {
    id: 'complaints',
    label: 'Complaints',
    icon: AlertTriangle,
    feature: 'complaints',
    subItems: [
      { id: 'complaints', label: 'All Complaints' },
      { id: 'new-complaint', label: 'New Complaint' },
    ],
  },
  { id: 'work-orders', label: 'Work Orders', icon: ClipboardList, feature: 'work-orders' },
  { id: 'pm', label: 'Preventive Maint.', icon: CalendarClock, feature: 'pm' },
  { id: 'inventory', label: 'Inventory', icon: Package, feature: 'inventory' },
  { id: 'customers', label: 'Customers', icon: Users, feature: 'customers' },
  { id: 'invoices', label: 'Invoices', icon: Receipt, feature: 'invoices' },
  { id: 'quotations', label: 'Quotations', icon: FileText, feature: 'quotations' },
  { id: 'finance', label: 'Finance', icon: DollarSign, feature: 'finance' },
  { id: 'employees', label: 'Employees', icon: UserCog, feature: 'employees' },
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart, feature: 'purchases' },
  { id: 'vehicles', label: 'Vehicles', icon: Truck, feature: 'vehicles' },
  { id: 'reports', label: 'Reports', icon: BarChart3, feature: 'reports' },
  { id: 'user-management', label: 'Users', icon: Shield, feature: 'user-management' },
  { id: 'notifications', label: 'Notifications', icon: Bell, feature: 'notifications' },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    feature: 'whatsapp',
    subItems: [
      { id: 'whatsapp', label: 'WhatsApp Dashboard' },
      { id: 'whatsapp-chats', label: 'Live Chats' },
      { id: 'whatsapp-templates', label: 'Templates' },
      { id: 'whatsapp-campaigns', label: 'Campaigns' },
      { id: 'whatsapp-settings', label: 'Settings' },
    ],
  },
  { id: 'settings', label: 'Settings', icon: Settings, feature: 'settings' },
];

const CMS_ITEM: NavItemConfig = {
  id: 'cms-dashboard',
  label: 'CMS',
  icon: Globe,
  feature: 'cms',
  isCms: true,
  subItems: [
    { id: 'cms-dashboard', label: 'CMS Dashboard' },
    { id: 'cms-hero', label: 'Hero Section' },
    { id: 'cms-about', label: 'About Us' },
    { id: 'cms-services', label: 'Services' },
    { id: 'cms-industries', label: 'Industries' },
    { id: 'cms-projects', label: 'Projects' },
    { id: 'cms-blogs', label: 'Blog' },
    { id: 'cms-testimonials', label: 'Testimonials' },
    { id: 'cms-careers', label: 'Careers' },
    { id: 'cms-contact', label: 'Contact Inbox' },
    { id: 'cms-media', label: 'Media Library' },
    { id: 'cms-seo', label: 'SEO' },
    { id: 'cms-header', label: 'Header' },
    { id: 'cms-footer', label: 'Footer' },
    { id: 'cms-announcements', label: 'Announcements' },
    { id: 'cms-popups', label: 'Popups' },
    { id: 'cms-forms', label: 'Form Builder' },
    { id: 'cms-activity', label: 'Activity Log' },
  ],
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
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number } | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [focusedSubIndex, setFocusedSubIndex] = useState(-1);

  // ---- Refs ----
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navItemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================================
  // FILTERED NAV ITEMS BY ROLE
  // ============================================================

  const filteredItems = useMemo(() => {
    if (!user) return [];
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
    // Small delay to ensure DOM is ready
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
    e.preventDefault();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollLeft += e.deltaY;
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -SCROLL_AMOUNT : SCROLL_AMOUNT;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }, []);

  // Attach/detach wheel listener with passive:false
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel as unknown as EventListener, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel as unknown as EventListener);
  }, [handleWheel]);

  // ============================================================
  // DROPDOWN LOGIC
  // ============================================================

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  // Calculate dropdown position from button rect (declared early for dependency order)
  const updateDropdownPosition = useCallback((itemId: string) => {
    const btn = navItemRefs.current.get(itemId);
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setDropdownRect({ top: rect.bottom + 4, left: rect.left + rect.width / 2 - 90 });
    }
  }, []);

  // Update dropdown position when nav scrolls
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || !openDropdownId) return;
    const onScroll = () => updateDropdownPosition(openDropdownId);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [openDropdownId, updateDropdownPosition]);

  const closeDropdown = useCallback(() => {
    clearCloseTimeout();
    setOpenDropdownId(null);
    setDropdownRect(null);
    setFocusedSubIndex(-1);
  }, [clearCloseTimeout]);

  const handleItemMouseEnter = useCallback(
    (itemId: string) => {
      clearHoverTimeout();
      clearCloseTimeout();
      hoverTimeoutRef.current = setTimeout(() => {
        setOpenDropdownId(itemId);
        setFocusedSubIndex(-1);
        updateDropdownPosition(itemId);
      }, 200);
    },
    [clearHoverTimeout, clearCloseTimeout, updateDropdownPosition]
  );

  const handleItemMouseLeave = useCallback(() => {
    clearHoverTimeout();
  }, [clearHoverTimeout]);

  const handleDropdownMouseEnter = useCallback(() => {
    clearCloseTimeout();
  }, [clearCloseTimeout]);

  const handleDropdownMouseLeave = useCallback(() => {
    clearHoverTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setOpenDropdownId(null);
      setDropdownRect(null);
      setFocusedSubIndex(-1);
    }, 500);
  }, [clearHoverTimeout]);

  const handleItemClick = useCallback(
    (item: NavItemConfig) => {
      if (item.subItems && item.subItems.length > 0) {
        // Toggle dropdown
        if (openDropdownId === item.id) {
          closeDropdown();
        } else {
          clearHoverTimeout();
          clearCloseTimeout();
          setOpenDropdownId(item.id);
          setFocusedSubIndex(-1);
          updateDropdownPosition(item.id);
        }
      } else {
        closeDropdown();
        setView(item.id as AppView);
      }
    },
    [openDropdownId, closeDropdown, clearHoverTimeout, clearCloseTimeout, setView, updateDropdownPosition]
  );

  const handleSubItemClick = useCallback(
    (subId: string) => {
      closeDropdown();
      setView(subId as AppView);
    },
    [closeDropdown, setView]
  );

  // ============================================================
  // KEYBOARD NAVIGATION
  // ============================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openDropdownId) {
        e.preventDefault();
        closeDropdown();
        // Return focus to the nav item that opened the dropdown
        const btn = navItemRefs.current.get(openDropdownId);
        btn?.focus();
        return;
      }

      // Arrow key navigation within dropdown
      if (!openDropdownId) return;
      const allItems = [
        ...filteredItems.mainItems,
        ...(filteredItems.showCms ? [CMS_ITEM] : []),
      ];
      const activeItem = allItems.find((i) => i.id === openDropdownId);
      if (!activeItem?.subItems) return;
      const subCount = activeItem.subItems.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedSubIndex((prev) => (prev < subCount - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedSubIndex((prev) => (prev > 0 ? prev - 1 : subCount - 1));
      } else if (e.key === 'Enter' && focusedSubIndex >= 0) {
        e.preventDefault();
        const sub = activeItem.subItems[focusedSubIndex];
        if (sub) {
          handleSubItemClick(sub.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openDropdownId, focusedSubIndex, filteredItems, closeDropdown, handleSubItemClick]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // ============================================================
  // HELPER: CHECK IF NAV ITEM IS ACTIVE
  // ============================================================

  const isActive = useCallback(
    (item: NavItemConfig) => {
      if (currentView === item.id) return true;
      if (item.subItems) {
        return item.subItems.some((sub) => currentView === sub.id);
      }
      return false;
    },
    [currentView]
  );



  // ============================================================
  // RENDER: DROPDOWN SUBMENU (fixed position to escape overflow)
  // ============================================================

  const renderDropdown = (item: NavItemConfig) => {
    if (!item.subItems || openDropdownId !== item.id || !dropdownRect) return null;

    return (
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        onMouseEnter={handleDropdownMouseEnter}
        onMouseLeave={handleDropdownMouseLeave}
        className={cn(
          'fixed z-[100]',
          'bg-white dark:bg-gray-900/95 backdrop-blur-xl rounded-xl',
          'border border-gray-200/80 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.08)]',
          'py-1 min-w-[180px] max-h-80 overflow-y-auto',
          'scrollbar-thin'
        )}
        style={{ top: dropdownRect.top, left: dropdownRect.left }}
        role="menu"
        aria-label={`${item.label} submenu`}
      >
          {item.subItems.map((sub, idx) => {
            const isSubActive = currentView === sub.id;
            return (
              <button
                key={`${sub.id}-${idx}`}
                role="menuitem"
                tabIndex={focusedSubIndex === idx ? 0 : -1}
                ref={(el) => {
                  if (focusedSubIndex === idx && el) {
                    el.focus();
                  }
                }}
                onClick={() => handleSubItemClick(sub.id)}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm transition-colors duration-150',
                  'flex items-center gap-2',
                  'hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
                  'text-gray-700 dark:text-gray-300',
                  isSubActive &&
                    'bg-emerald-50 dark:bg-emerald-900/20 border-l-2 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-medium'
                )}
              >
                {sub.label}
              </button>
            );
          })}
        </motion.div>
    );
  };

  // ============================================================
  // RENDER: NAV ITEM BUTTON
  // ============================================================

  const renderNavItem = (item: NavItemConfig) => {
    const Icon = item.icon;
    const active = isActive(item);
    const hasSub = !!item.subItems && item.subItems.length > 0;
    const isOpen = openDropdownId === item.id;

    return (
      <motion.button
        key={item.id}
        ref={(el) => {
          if (el) navItemRefs.current.set(item.id, el);
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onMouseEnter={() => hasSub && handleItemMouseEnter(item.id)}
        onMouseLeave={() => hasSub && handleItemMouseLeave()}
        onClick={() => handleItemClick(item)}
        aria-expanded={hasSub ? isOpen : undefined}
        aria-haspopup={hasSub ? 'true' : undefined}
        className={cn(
          'relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap',
          'transition-colors duration-200 select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1',
          active
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
          isOpen && 'bg-emerald-50/80 dark:bg-emerald-900/20'
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

        {/* Dropdown arrow for items with subItems */}
        {hasSub && (
          <svg
            className={cn(
              'h-3 w-3 ml-0.5 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
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
    <>
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-[68px] z-40 w-full max-w-5xl mx-auto px-4 mt-2"
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
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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

    {/* Portal dropdown - rendered outside overflow container */}
    {openDropdownId && (() => {
      const allItems = [
        ...filteredItems.mainItems,
        ...(filteredItems.showCms ? [CMS_ITEM] : []),
      ];
      const activeItem = allItems.find((i) => i.id === openDropdownId);
      return activeItem ? renderDropdown(activeItem) : null;
    })()}
    </>
  );
}