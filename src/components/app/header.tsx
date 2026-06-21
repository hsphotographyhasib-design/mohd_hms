'use client';

import { useAppStore, useAuthStore, useNotificationStore } from '@/store';
import type { AppView } from '@/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Menu,
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';

const viewLabels: Record<AppView, string> = {
  login: 'Login',
  dashboard: 'Dashboard',
  equipment: 'Equipment',
  'equipment-detail': 'Equipment Detail',
  complaints: 'Complaints',
  'complaint-detail': 'Complaint Detail',
  'work-orders': 'Work Orders',
  'work-order-detail': 'Work Order Detail',
  invoices: 'Invoices',
  'invoice-detail': 'Invoice Detail',
  pm: 'PM Schedules',
  quotations: 'Quotations',
  inventory: 'Inventory',
  customers: 'Customers',
  employees: 'Employees',
  purchases: 'Purchases',
  vehicles: 'Vehicles',
  finance: 'Finance',
  reports: 'Reports',
  notifications: 'Notifications',
  settings: 'Settings',
  profile: 'Profile',
};

function getBreadcrumbPath(view: AppView): { label: string; view?: AppView }[] {
  const base = { label: 'Dashboard', view: 'dashboard' as AppView };
  const current = { label: viewLabels[view] || view };

  if (view === 'dashboard') return [current];
  if (view.includes('-detail')) {
    const parentView = view.replace('-detail', '') as AppView;
    return [base, { label: viewLabels[parentView] || parentView, view: parentView }, current];
  }
  return [base, current];
}

export function Header() {
  const { currentView, setView, toggleSidebar, sidebarOpen } = useAppStore();
  const { user, logout } = useAuthStore();
  const { unreadCount, setView: setNotifView } = useNotificationStore();

  const breadcrumbs = getBreadcrumbPath(currentView);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left: Hamburger + Breadcrumb */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>

          <nav className="hidden sm:flex items-center gap-1 text-sm" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />}
                {crumb.view && i < breadcrumbs.length - 1 ? (
                  <button
                    onClick={() => setView(crumb.view as AppView)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="font-medium text-foreground">{crumb.label}</span>
                )}
              </div>
            ))}
          </nav>

          {/* Mobile: just show current view */}
          <span className="sm:hidden text-sm font-medium">{viewLabels[currentView]}</span>
        </div>

        {/* Right: Search, Notifications, User */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="w-56 lg:w-72 h-9 pl-9 text-sm bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
                readOnly
              />
            </div>
          </div>

          {/* Notification Bell */}
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9"
                  onClick={() => setView('notifications')}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications {unreadCount > 0 && `(${unreadCount})`}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 gap-2 pl-2 pr-3">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold dark:bg-emerald-900 dark:text-emerald-300">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:block text-sm font-medium max-w-[120px] truncate">
                  {user.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 capitalize font-medium mt-0.5">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setView('profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView('settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-rose-600 focus:text-rose-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}