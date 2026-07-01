'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, useAuthStore, useNotificationStore } from '@/store';
import type { AppView } from '@/types';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  Building2,
  Search,
  QrCode,
  Bell,
  Sun,
  Moon,
  Globe,
  User,
  Settings,
  LogOut,
  Plus,
  LayoutDashboard,
  Wrench,
  AlertTriangle,
  ClipboardList,
  Receipt,
  FileText,
  Package,
  Users,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ============================================================
// CONSTANTS
// ============================================================

const SEARCH_QUICK_LINKS: { label: string; icon: React.ReactNode; view: AppView }[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, view: 'dashboard' },
  { label: 'Equipment', icon: <Wrench className="h-4 w-4" />, view: 'equipment' },
  { label: 'Complaints', icon: <AlertTriangle className="h-4 w-4" />, view: 'complaints' },
  { label: 'Work Orders', icon: <ClipboardList className="h-4 w-4" />, view: 'work-orders' },
  { label: 'Customers', icon: <Users className="h-4 w-4" />, view: 'customers' },
  { label: 'Invoices', icon: <Receipt className="h-4 w-4" />, view: 'invoices' },
];

const QUICK_ACTIONS: { label: string; icon: React.ReactNode; view: AppView }[] = [
  { label: 'Create Complaint', icon: <AlertTriangle className="h-4 w-4" />, view: 'complaints' },
  { label: 'Create Work Order', icon: <ClipboardList className="h-4 w-4" />, view: 'work-orders' },
  { label: 'Create Invoice', icon: <Receipt className="h-4 w-4" />, view: 'invoices' },
  { label: 'Create Quotation', icon: <FileText className="h-4 w-4" />, view: 'quotations' },
  { label: 'Add Equipment', icon: <Package className="h-4 w-4" />, view: 'equipment' },
];

// ============================================================
// GLASS DROPDOWN ANIMATION VARIANTS
// ============================================================

const glassDropdownVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: { duration: 0.15 },
  },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.9, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 350, damping: 28 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -4,
    transition: { duration: 0.15 },
  },
};

const fabVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
  exit: {
    opacity: 0,
    scale: 0,
    transition: { duration: 0.12 },
  },
};

const iconTransition = { type: 'spring', stiffness: 500, damping: 30 };

// ============================================================
// GLASS DROPDOWN STYLES
// ============================================================

const glassStyles =
  'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl border border-white/20 dark:border-white/10 shadow-xl';

// ============================================================
// MAIN COMPONENT
// ============================================================

export function AppHeader() {
  // ---- State & Stores ----
  const { setView } = useAppStore();
  const { user, secureLogout } = useAuthStore();
  const { unreadCount, notifications, markAllAsRead } = useNotificationStore();
  const { theme, setTheme } = useTheme();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [lang, setLang] = useState<'EN' | 'MS'>('EN');

  // Hydration-safe mounted check
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // ---- Keyboard: Cmd/Ctrl+K opens search, Esc closes all ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        setProfileOpen(false);
        setNotifPanelOpen(false);
        setQuickActionsOpen(false);
      }
      // Esc closes all panels
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setProfileOpen(false);
        setNotifPanelOpen(false);
        setQuickActionsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ---- Click outside: close open panels ----
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifPanelOpen(false);
      }
      if (quickActionsRef.current && !quickActionsRef.current.contains(target)) {
        setQuickActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---- Auto-focus search input when search panel opens ----
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  // ---- Helpers ----
  const getUserInitials = useCallback(() => {
    if (!user?.name) return '??';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [user]);

  const handleSearchLinkClick = useCallback(
    (view: AppView) => {
      setView(view);
      setSearchOpen(false);
      setSearchQuery('');
    },
    [setView]
  );

  const handleQuickActionClick = useCallback(
    (view: AppView) => {
      setView(view);
      setQuickActionsOpen(false);
    },
    [setView]
  );

  const handleLanguageToggle = useCallback(() => {
    const next = lang === 'EN' ? 'MS' : 'EN';
    setLang(next);
    toast.info(`Language switched to ${next === 'EN' ? 'English' : 'Bahasa Melayu'}`);
  }, [lang]);

  // ---- Don't render if no user ----
  if (!user) return null;

  return (
    <>
      {/* ============================================================ */}
      {/* HEADER BAR                                                    */}
      {/* ============================================================ */}
      <header
        ref={headerRef}
        className="hidden md:block sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b border-gray-200/80 dark:bg-gray-950/70 dark:border-white/10"
      >
        <div className="flex items-center justify-between h-16 px-4 lg:px-6 gap-4">
          {/* ---- LEFT: Logo + Company Name ---- */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="font-semibold text-lg text-foreground tracking-tight">
              FacilityPro
            </span>
          </div>

          {/* ---- CENTER: Search Bar ---- */}
          <div className="flex-1 flex justify-center max-w-xl mx-auto">
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => {
                  setSearchOpen((prev) => !prev);
                  setProfileOpen(false);
                  setNotifPanelOpen(false);
                  setQuickActionsOpen(false);
                }}
                className={cn(
                  'flex items-center w-full h-10 rounded-full bg-muted/50 border-0',
                  'px-4 text-sm text-muted-foreground',
                  'hover:bg-muted/70 focus:bg-muted/80',
                  'transition-all duration-200 cursor-pointer',
                  'ring-0 focus:ring-2 focus:ring-emerald-500/30',
                  searchOpen && 'ring-2 ring-emerald-500/30 bg-muted/70'
                )}
              >
                <Search className="h-4 w-4 mr-2.5 shrink-0 text-muted-foreground/70" />
                <span className="hidden sm:inline truncate">
                  Search equipment, customers, work orders...
                </span>
                <span className="sm:hidden truncate">Search...</span>
                <kbd className="hidden md:flex items-center ml-auto gap-0.5 shrink-0 rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>

              {/* ---- SEARCH DROPDOWN PANEL ---- */}
              <AnimatePresence>
                {searchOpen && (
                  <motion.div
                    variants={glassDropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className={cn(
                      'absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[480px] max-w-[calc(100vw-2rem)]',
                      glassStyles,
                      'p-4 z-50'
                    )}
                    style={{ originY: 'top' }}
                  >
                    {/* Close button */}
                    <button
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* Search input */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Type to search..."
                        className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/50 border border-border/40 text-base outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-emerald-500/30 transition-all"
                      />
                    </div>

                    {/* Quick links */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider px-2 mb-2">
                        Quick Navigation
                      </p>
                      {SEARCH_QUICK_LINKS.map((link) => (
                        <button
                          key={link.view}
                          onClick={() => handleSearchLinkClick(link.view)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors group"
                        >
                          <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/60 text-muted-foreground group-hover:bg-emerald-100 group-hover:text-emerald-600 dark:group-hover:bg-emerald-900/50 dark:group-hover:text-emerald-400 transition-colors">
                            {link.icon}
                          </span>
                          {link.label}
                          <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ---- RIGHT: Action Buttons ---- */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* QR Scanner */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
              onClick={() => toast.info('QR Scanner opened')}
              aria-label="QR Scanner"
            >
              <QrCode className="h-[18px] w-[18px]" />
            </Button>

            {/* ---- Notification Bell ---- */}
            <div ref={notifRef} className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                onClick={() => {
                  setNotifPanelOpen((prev) => !prev);
                  setProfileOpen(false);
                  setQuickActionsOpen(false);
                  setSearchOpen(false);
                }}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
              >
                <Bell className="h-[18px] w-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>

              {/* ---- NOTIFICATION PANEL ---- */}
              <AnimatePresence>
                {notifPanelOpen && (
                  <motion.div
                    variants={glassDropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className={cn(
                      'absolute top-full right-0 mt-2 w-80',
                      glassStyles,
                      'overflow-hidden z-50'
                    )}
                    style={{ originY: 'top' }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                      <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4">
                          <Bell className="h-8 w-8 text-muted-foreground/30 mb-3" />
                          <p className="text-sm text-muted-foreground/60">No new notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/20">
                          {notifications.slice(0, 10).map((notif) => (
                            <div
                              key={notif.id}
                              className={cn(
                                'px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer',
                                !notif.isRead && 'bg-emerald-50/30 dark:bg-emerald-950/10'
                              )}
                            >
                              <div className="flex items-start gap-2">
                                {!notif.isRead && (
                                  <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                )}
                                <div className={cn('flex-1 min-w-0', notif.isRead && 'ml-4')}>
                                  <p className="text-sm font-medium text-foreground truncate">{notif.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ---- Dark Mode Toggle ---- */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400 overflow-hidden"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mounted && theme === 'dark' ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, scale: 0, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 90, scale: 0, opacity: 0 }}
                    transition={iconTransition}
                  >
                    <Sun className="h-[18px] w-[18px]" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, scale: 0, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: -90, scale: 0, opacity: 0 }}
                    transition={iconTransition}
                  >
                    <Moon className="h-[18px] w-[18px]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>

            {/* ---- Language Switcher ---- */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400 relative"
              onClick={handleLanguageToggle}
              aria-label="Switch language"
            >
              <Globe className="h-[18px] w-[18px]" />
              <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-muted-foreground/80">
                {lang}
              </span>
            </Button>

            {/* ---- Profile Dropdown ---- */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((prev) => !prev);
                  setNotifPanelOpen(false);
                  setQuickActionsOpen(false);
                  setSearchOpen(false);
                }}
                className={cn(
                  'flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-full',
                  'hover:bg-muted/50 transition-all duration-200',
                  profileOpen && 'bg-muted/60'
                )}
                aria-label="User menu"
                aria-expanded={profileOpen}
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-emerald-500 text-white text-xs font-semibold shadow-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline-block text-sm font-medium text-foreground max-w-[100px] truncate">
                  {user.name}
                </span>
              </button>

              {/* ---- PROFILE DROPDOWN ---- */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    variants={glassDropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className={cn(
                      'absolute top-full right-0 mt-2 w-64',
                      glassStyles,
                      'overflow-hidden z-50'
                    )}
                    style={{ originY: 'top' }}
                  >
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-border/20">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-emerald-500 text-white text-sm font-semibold shadow-sm">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-0 text-[10px] font-semibold uppercase tracking-wider">
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-1.5 space-y-0.5">
                      {/* Profile */}
                      <button
                        onClick={() => {
                          setView('profile');
                          setProfileOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors"
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        Profile
                      </button>

                      {/* Settings */}
                      <button
                        onClick={() => {
                          setView('settings');
                          setProfileOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors"
                      >
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        Settings
                      </button>

                      {/* Theme */}
                      <button
                        onClick={() => {
                          setTheme(theme === 'dark' ? 'light' : 'dark');
                          setProfileOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors"
                      >
                        {mounted && theme === 'dark' ? (
                          <Sun className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Moon className="h-4 w-4 text-muted-foreground" />
                        )}
                        {mounted && theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                      </button>

                      {/* Language */}
                      <button
                        onClick={() => {
                          handleLanguageToggle();
                          setProfileOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors"
                      >
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        Language
                      </button>
                    </div>

                    {/* Separator + Logout */}
                    <div className="border-t border-border/20 p-1.5">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          secureLogout('You have been logged out.');
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* QUICK ACTIONS FAB (Floating Action Button)                    */}
      {/* ============================================================ */}
      <div ref={quickActionsRef} className="fixed bottom-6 right-6 z-40">
        <AnimatePresence>
          {quickActionsOpen && (
            <motion.div
              variants={fabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn('absolute bottom-16 right-0 w-56 mb-2', glassStyles, 'overflow-hidden p-2')}
              style={{ origin: 'bottom right' }}
            >
              <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider px-2 py-1.5">
                Quick Actions
              </p>
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.view}
                  onClick={() => handleQuickActionClick(action.view)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors group"
                >
                  <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/60 text-muted-foreground group-hover:bg-emerald-100 group-hover:text-emerald-600 dark:group-hover:bg-emerald-900/50 dark:group-hover:text-emerald-400 transition-colors">
                    {action.icon}
                  </span>
                  {action.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB Button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setQuickActionsOpen((prev) => !prev);
            setSearchOpen(false);
            setProfileOpen(false);
            setNotifPanelOpen(false);
          }}
          className={cn(
            'relative h-14 w-14 rounded-full shadow-lg shadow-emerald-500/30',
            'flex items-center justify-center',
            'bg-emerald-500 hover:bg-emerald-600 text-white',
            'transition-colors duration-200'
          )}
          aria-label="Quick Actions"
          aria-expanded={quickActionsOpen}
        >
          <AnimatePresence mode="wait">
            {quickActionsOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: 0 }}
                animate={{ rotate: 90 }}
                exit={{ rotate: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-6 w-6" />
              </motion.div>
            ) : (
              <motion.div
                key="plus"
                initial={{ rotate: 90 }}
                animate={{ rotate: 0 }}
                exit={{ rotate: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Plus className="h-6 w-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
}
