'use client';

import React, { useMemo } from 'react';
import {
  ClipboardCheck,
  Menu,
  Sun,
  Moon,
  Bell,
  LayoutDashboard,
  FolderKanban,
  FileText,
  BarChart3,
  CalendarDays,
  Shield,
  Settings,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useIrmStore, ROLES, type ViewKey } from '@/modules/irms/lib';
import {
  DashboardView,
  ProjectsView,
  ProjectDetailView,
  ReportsView,
  ReportBuilderView,
  ReportView,
  AnalyticsView,
  CalendarView,
  AdminView,
  SettingsView,
} from '@/modules/irms/views';

const NAV_ITEMS: { key: ViewKey; label: string; icon: React.ElementType; permission?: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'reports', label: 'Reports', icon: FileText },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'admin', label: 'Admin', icon: Shield, permission: 'manage' },
  { key: 'settings', label: 'Settings', icon: Settings },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const view = useIrmStore((s) => s.view);
  const setView = useIrmStore((s) => s.setView);
  const goBack = useIrmStore((s) => s.goBack);
  const viewHistory = useIrmStore((s) => s.viewHistory);
  const hasPermission = useIrmStore((s) => s.hasPermission);
  const currentUser = useIrmStore((s) => s.currentUser);

  const visibleItems = useMemo(
    () =>
      NAV_ITEMS.filter(
        (item) => !item.permission || hasPermission(item.permission)
      ),
    [hasPermission]
  );

  const handleNav = (key: ViewKey) => {
    setView(key);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {viewHistory.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground mb-2"
              onClick={() => {
                goBack();
                onNavigate?.();
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}

          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = view === item.key;
            return (
              <Button
                key={item.key}
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                className={`w-full justify-start gap-2 transition-all duration-200 ${
                  isActive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => handleNav(item.key)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t border-border/50 p-3">
        <div className="flex items-center gap-2 px-2 py-1">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-green-600 text-white text-xs">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{currentUser.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {currentUser.role}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          IRMS v1.0
        </p>
      </div>
    </div>
  );
}

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const theme = useIrmStore((s) => s.theme);
  const toggleTheme = useIrmStore((s) => s.toggleTheme);
  const currentUser = useIrmStore((s) => s.currentUser);
  const setCurrentUser = useIrmStore((s) => s.setCurrentUser);

  const handleRoleSwitch = (role: string) => {
    setCurrentUser({ ...currentUser, role });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur-md bg-white/80 dark:bg-gray-900/80">
      <div className="flex items-center h-14 px-4 gap-3">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <ClipboardCheck className="h-6 w-6 text-green-600" />
          <span className="font-bold text-lg hidden sm:inline">IRMS</span>
        </div>

        {/* Search (optional) */}
        <div className="hidden md:flex flex-1 max-w-sm">
          <Input
            placeholder="Search reports, projects..."
            className="h-8 bg-gray-100 dark:bg-gray-800 border-0"
          />
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-8 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-green-600 text-white text-xs">
                    {currentUser.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm">
                  {currentUser.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{currentUser.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {currentUser.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Switch Role (Demo)
              </DropdownMenuLabel>
              {ROLES.map((role) => (
                <DropdownMenuItem
                  key={role}
                  onClick={() => handleRoleSwitch(role)}
                  className={
                    currentUser.role === role
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : ''
                  }
                >
                  {role}
                  {currentUser.role === role && (
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
                      Active
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function ViewRouter() {
  const view = useIrmStore((s) => s.view);
  switch (view) {
    case 'dashboard':
      return <DashboardView />;
    case 'projects':
      return <ProjectsView />;
    case 'project-detail':
      return <ProjectDetailView />;
    case 'reports':
      return <ReportsView />;
    case 'report-builder':
      return <ReportBuilderView />;
    case 'report-view':
      return <ReportView />;
    case 'analytics':
      return <AnalyticsView />;
    case 'calendar':
      return <CalendarView />;
    case 'admin':
      return <AdminView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <DashboardView />;
  }
}

export default function IrmsLayout() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-950 rounded-lg border border-border/40 overflow-hidden -m-4 md:-m-6">
      {/* IRMS title bar (replaces full Topbar since parent AppShell has its own header) */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <ClipboardCheck className="h-5 w-5 text-green-600" />
        <span className="font-bold text-sm">IRMS</span>
        <span className="text-xs text-muted-foreground">— Inspection Report Management System</span>
        <div className="flex-1" />
        {/* Mobile hamburger for IRMS sidebar only */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-7 w-7"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 border-r border-border/40 bg-white/80 dark:bg-gray-900/80">
          <SidebarNav />
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-56 p-0">
            <SheetTitle className="sr-only">IRMS Navigation</SheetTitle>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="p-4">
            <ViewRouter />
          </div>
        </main>
      </div>
    </div>
  );
}