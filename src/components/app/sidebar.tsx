'use client';

import React, { useState, useEffect } from 'react';

import { useAuthStore, useAppStore, useNotificationStore, canAccess } from '@/store';
import type { AppView, UserRole, NavItem } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Wrench,
  AlertTriangle,
  ClipboardList,
  Receipt,
  CalendarClock,
  FileText,
  Package,
  Users,
  UserCog,
  ShoppingCart,
  Truck,
  DollarSign,
  BarChart3,
  Bell,
  Settings,
  Building2,
  LogOut,
  ChevronLeft,
  Globe,
  PenSquare,
  FileImage,
  Megaphone,
  MessageSquare,
  Star,
  Briefcase,
  Layout,
  Search,
  Paintbrush,
  Footprints,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItemConfig {
  id: AppView;
  label: string;
  icon: LucideIcon;
  feature: string;
  badge?: 'notifications';
}

const navItems: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, feature: 'dashboard' },
  { id: 'equipment', label: 'Equipment', icon: Wrench, feature: 'equipment' },
  { id: 'complaints', label: 'Complaints', icon: AlertTriangle, feature: 'complaints' },
  { id: 'work-orders', label: 'Work Orders', icon: ClipboardList, feature: 'work-orders' },
  { id: 'invoices', label: 'Invoices', icon: Receipt, feature: 'invoices' },
  { id: 'pm', label: 'PM Schedules', icon: CalendarClock, feature: 'pm' },
  { id: 'quotations', label: 'Quotations', icon: FileText, feature: 'quotations' },
  { id: 'inventory', label: 'Inventory', icon: Package, feature: 'inventory' },
  { id: 'customers', label: 'Customers', icon: Users, feature: 'customers' },
  { id: 'employees', label: 'Employees', icon: UserCog, feature: 'employees' },
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart, feature: 'purchases' },
  { id: 'vehicles', label: 'Vehicles', icon: Truck, feature: 'vehicles' },
  { id: 'finance', label: 'Finance', icon: DollarSign, feature: 'finance' },
  { id: 'reports', label: 'Reports', icon: BarChart3, feature: 'reports' },
  { id: 'notifications', label: 'Notifications', icon: Bell, feature: 'notifications', badge: 'notifications' },
  { id: 'user-management', label: 'User Management', icon: Shield, feature: 'user-management' },
  { id: 'settings', label: 'Settings', icon: Settings, feature: 'settings' },
];

const cmsNavItems: NavItemConfig[] = [
  { id: 'cms-dashboard', label: 'CMS Dashboard', icon: Globe, feature: 'cms' },
  { id: 'cms-hero', label: 'Hero Section', icon: Paintbrush, feature: 'cms' },
  { id: 'cms-about', label: 'About Us', icon: Building2, feature: 'cms' },
  { id: 'cms-services', label: 'Services', icon: Wrench, feature: 'cms' },
  { id: 'cms-industries', label: 'Industries', icon: Layout, feature: 'cms' },
  { id: 'cms-projects', label: 'Projects', icon: FileImage, feature: 'cms' },
  { id: 'cms-blogs', label: 'Blog', icon: PenSquare, feature: 'cms' },
  { id: 'cms-testimonials', label: 'Testimonials', icon: Star, feature: 'cms' },
  { id: 'cms-careers', label: 'Careers', icon: Briefcase, feature: 'cms' },
  { id: 'cms-contact', label: 'Contact Inbox', icon: MessageSquare, feature: 'cms' },
  { id: 'cms-media', label: 'Media Library', icon: FileImage, feature: 'cms' },
  { id: 'cms-seo', label: 'SEO', icon: Search, feature: 'cms' },
  { id: 'cms-header', label: 'Header', icon: Layout, feature: 'cms' },
  { id: 'cms-footer', label: 'Footer', icon: Footprints, feature: 'cms' },
  { id: 'cms-announcements', label: 'Announcements', icon: Megaphone, feature: 'cms' },
  { id: 'cms-popups', label: 'Popups', icon: MessageSquare, feature: 'cms' },
  { id: 'cms-forms', label: 'Form Builder', icon: FileText, feature: 'cms' },
  { id: 'cms-activity', label: 'Activity Log', icon: BarChart3, feature: 'cms' },
];

function SidebarContent({ collapsed, onClose }: { collapsed: boolean; onClose?: () => void }) {
  const { user, logout } = useAuthStore();
  const { currentView, setView, sidebarOpen, setSidebarOpen } = useAppStore();
  const { unreadCount } = useNotificationStore();

  if (!user) return null;

  const role = user.role;
  const filteredCmsItems = cmsNavItems.filter((item) => canAccess(role, item.feature));
  const filteredItems = navItems.filter((item) => canAccess(role, item.feature));

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleNavClick = (view: AppView) => {
    setView(view);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border shrink-0',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600 text-white shrink-0">
          <Building2 className="h-5 w-5" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="font-semibold text-lg whitespace-nowrap overflow-hidden"
            >
              FacilityPro
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <nav className="p-3 space-y-1">
          {filteredItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            const showBadge = item.badge === 'notifications' && unreadCount > 0;

            const button = (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-white')} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!collapsed && showBadge && (
                  <Badge className="ml-auto bg-rose-500 text-white text-[10px] px-1.5 py-0.5 min-w-[20px] text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
                {collapsed && showBadge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full" />
                )}
              </button>
            );

            if (collapsed) {
              return (
                <TooltipProvider key={item.id} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">{button}</div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                      {showBadge && ` (${unreadCount} unread)`}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }

            return button;
          })}

          {filteredCmsItems.length > 0 && (
            <>
              {!collapsed && (
                <div className="flex items-center gap-2 px-3 pt-4 pb-1">
                  <Globe className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Website CMS
                  </span>
                </div>
              )}
              {collapsed && <div className="my-2 mx-3 border-t border-sidebar-border" />}
              {filteredCmsItems.map((item) => {
                const isActive = currentView === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                      collapsed && 'justify-center px-2',
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-white')} />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </>
          )}
        </nav>
      </ScrollArea>

      {/* Collapse Toggle (Desktop only) */}
      {!onClose && (
        <div className="px-3 py-2 border-t border-sidebar-border">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <ChevronLeft className={cn('h-5 w-5 shrink-0 transition-transform duration-200', sidebarOpen && 'rotate-180')} />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap"
                >
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      )}

      {/* User Info */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <div className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2',
          collapsed && 'justify-center px-2'
        )}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold dark:bg-emerald-900 dark:text-emerald-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize truncate">{role.replace('_', ' ')}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={logout}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors shrink-0"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Logout</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1023px)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 256 : 68 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden lg:block fixed left-0 top-0 bottom-0 z-40"
      >
        <SidebarContent collapsed={!sidebarOpen} />
      </motion.aside>

      {/* Mobile Sidebar */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-72">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <SidebarContent collapsed={false} onClose={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}