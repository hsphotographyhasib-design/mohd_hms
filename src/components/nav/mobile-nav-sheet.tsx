'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, useAuthStore, canAccess } from '@/store';
import type { AppView } from '@/types';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  ChevronDown,
  type LucideIcon,
  Receipt,
  FileText,
  MessageCircle,
} from 'lucide-react';

// ============================================================
// NAV CONFIG (mirrors floating-nav-bar.tsx)
// ============================================================

interface SubItem { id: string; label: string }
interface NavItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  feature: string;
  subItems?: SubItem[];
  isCms?: boolean;
}

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

// ============================================================
// COMPONENT
// ============================================================

export function MobileNavSheet() {
  const { mobileNavOpen, setMobileNavOpen, currentView, setView } = useAppStore();
  const { user } = useAuthStore();

  const filteredItems = useMemo(() => {
    if (!user) return { mainItems: [], showCms: false };
    const role = user.role;
    const mainItems = NAV_ITEMS.filter((item) => canAccess(role, item.feature));
    const showCms = canAccess(role, 'cms');
    return { mainItems, showCms };
  }, [user]);

  const isActive = (item: NavItemConfig) => {
    if (currentView === item.id) return true;
    if (item.subItems) return item.subItems.some((sub) => currentView === sub.id);
    return false;
  };

  const handleNav = (view: AppView) => {
    setView(view);
    setMobileNavOpen(false);
  };

  if (!user) return null;

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
        <SheetHeader className="px-4 pt-6 pb-4 border-b border-border/30">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold text-foreground tracking-tight">
              FacilityPro
            </span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto py-2 px-2" aria-label="Mobile navigation">
          {/* Main nav items */}
          {filteredItems.mainItems.map((item) => (
            <MobileNavItem
              key={item.id}
              item={item}
              isActive={isActive(item)}
              onNavigate={handleNav}
            />
          ))}

          {/* CMS section */}
          {filteredItems.showCms && (
            <>
              {filteredItems.mainItems.length > 0 && (
                <div className="my-2 mx-3 border-t border-border/30" />
              )}
              <MobileNavItem
                item={CMS_ITEM}
                isActive={isActive(CMS_ITEM)}
                onNavigate={handleNav}
              />
            </>
          )}
        </nav>

        {/* User info footer */}
        <div className="border-t border-border/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-sm">
              {user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// MOBILE NAV ITEM (with collapsible sub-items)
// ============================================================

function MobileNavItem({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItemConfig;
  isActive: boolean;
  onNavigate: (view: AppView) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const currentView = useAppStore((s) => s.currentView);
  const hasSub = !!item.subItems && item.subItems.length > 0;
  const Icon = item.icon;

  const handleClick = () => {
    if (hasSub) {
      setExpanded(!expanded);
    } else {
      onNavigate(item.id as AppView);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium',
          'transition-colors duration-150 min-h-[44px]',
          isActive && !hasSub
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
            : 'text-foreground hover:bg-muted/60'
        )}
      >
        <Icon className={cn(
          'h-5 w-5 shrink-0',
          isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
        )} />
        <span className="flex-1 text-left">{item.label}</span>
        {hasSub && (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        )}
      </button>

      {/* Sub-items */}
      <AnimatePresence>
        {expanded && hasSub && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-5 pl-4 border-l-2 border-border/30 space-y-0.5 py-1">
              {item.subItems!.map((sub, idx) => {
                const isSubActive = currentView === sub.id;
                return (
                  <button
                    key={`${sub.id}-${idx}`}
                    onClick={() => onNavigate(sub.id as AppView)}
                    className={cn(
                      'flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors duration-150 min-h-[40px]',
                      isSubActive
                        ? 'text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50/50 dark:bg-emerald-900/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    )}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}