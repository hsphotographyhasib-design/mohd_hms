'use client';

import React from 'react';
import {
  ArrowLeft,
  Pencil,
  Building2,
  CreditCard,
  Shield,
  Bell,
  Globe,
  Info,
  HelpCircle,
  LogOut,
  ChevronRight,
  LogIn,
} from 'lucide-react';
import { cn } from '@/core/utils/utils';
import { useAppStore, useAuthStore } from '@/app-shell/store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Separator } from '@/shared/ui/separator';
import { toast } from 'sonner';
import type { AppView } from '@/core/types';

// ─── Settings Menu Items ────────────────────────────────────

interface SettingsMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  view?: AppView;
  action?: string;
  danger?: boolean;
}

const SETTINGS_MENU: SettingsMenuItem[] = [
  { id: 'buildings', label: 'My Buildings', icon: Building2, iconColor: 'text-blue-600', iconBg: 'bg-blue-100', view: 'dashboard' },
  { id: 'payment', label: 'Payment Methods', icon: CreditCard, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100', view: 'finance' },
  { id: 'password', label: 'Change Password', icon: Shield, iconColor: 'text-amber-600', iconBg: 'bg-amber-100' },
  { id: 'notif-settings', label: 'Notification Settings', icon: Bell, iconColor: 'text-purple-600', iconBg: 'bg-purple-100', view: 'notifications' },
  { id: 'language', label: 'Language', icon: Globe, iconColor: 'text-teal-600', iconBg: 'bg-teal-100' },
  { id: 'about', label: 'About Us', icon: Info, iconColor: 'text-gray-600', iconBg: 'bg-gray-100' },
  { id: 'help', label: 'Help & Support', icon: HelpCircle, iconColor: 'text-rose-600', iconBg: 'bg-rose-100', view: 'help' },
];

// ─── Main Component ─────────────────────────────────────────

export function MobileProfile() {
  const { setView } = useAppStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const handleMenuTap = (item: SettingsMenuItem) => {
    if (item.action === 'logout') {
      handleLogout();
      return;
    }
    if (item.view) {
      setView(item.view);
    } else {
      toast.info(`${item.label} — coming soon`);
    }
  };

  // Get initials for avatar
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  // Get role display label
  const roleLabel = user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="size-9 -ml-1" onClick={() => setView('dashboard')} aria-label="Back">
              <ArrowLeft className="size-5 text-gray-600" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900">Profile</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => toast.info('Edit profile — coming soon')}
            aria-label="Edit profile"
          >
            <Pencil className="size-4.5 text-gray-500" />
          </Button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        {!isAuthenticated ? (
          /* ─── Not Logged In ─── */
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-gray-100">
              <LogIn className="size-8 text-gray-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-800">Not Logged In</h2>
            <p className="mt-1 text-sm text-gray-500">Sign in to access your profile and settings</p>
            <Button className="mt-6 bg-emerald-600 hover:bg-emerald-700" onClick={() => setView('login')}>
              <LogIn className="size-4 mr-2" />
              Sign In
            </Button>
          </div>
        ) : (
          <>
            {/* ─── Profile Card ─── */}
            <Card className="mx-4 mt-4 border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="size-18 w-[72px] h-[72px] rounded-full object-cover border-3 border-emerald-200 ring-2 ring-emerald-100"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = 'none';
                          if (el.nextElementSibling) (el.nextElementSibling as HTMLElement).style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={cn(
                        'flex size-[72px] items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700',
                        user?.avatar && 'hidden',
                      )}
                    >
                      {initials}
                    </div>
                    {/* Online indicator */}
                    <span className="absolute bottom-0.5 right-0.5 size-4 rounded-full border-2 border-white bg-emerald-500" />
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 truncate">{user?.name || 'Unknown'}</h2>
                    {roleLabel && (
                      <span className="inline-block mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {roleLabel}
                      </span>
                    )}
                    {user?.email && (
                      <p className="mt-1.5 text-sm text-gray-500 truncate">{user.email}</p>
                    )}
                    {user?.phone && (
                      <p className="mt-0.5 text-sm text-gray-400 truncate">{user.phone}</p>
                    )}
                  </div>
                </div>

                {/* Tenant info */}
                {(user?.tenantName) && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-gray-400" />
                        <span className="text-xs text-gray-500">Organization</span>
                      </div>
                      <span className="text-xs font-medium text-gray-700">{user.tenantName}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ─── Settings Menu ─── */}
            <Card className="mx-4 mt-4 border-0 shadow-sm overflow-hidden">
              {SETTINGS_MENU.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <React.Fragment key={item.id}>
                    {idx > 0 && <Separator className="ml-14" />}
                    <button
                      onClick={() => handleMenuTap(item)}
                      className="flex items-center w-full gap-3.5 px-4 py-3.5 text-left transition-colors active:bg-gray-50 hover:bg-gray-50"
                    >
                      <div className={cn('flex size-9 items-center justify-center rounded-xl shrink-0', item.iconBg)}>
                        <Icon className={cn('size-4.5', item.iconColor)} />
                      </div>
                      <span className={cn(
                        'flex-1 text-sm font-medium',
                        item.danger ? 'text-red-600' : 'text-gray-700',
                      )}>
                        {item.label}
                      </span>
                      <ChevronRight className="size-4 text-gray-300 shrink-0" />
                    </button>
                  </React.Fragment>
                );
              })}
            </Card>

            {/* ─── Logout Button ─── */}
            <div className="mx-4 mt-6">
              <Button
                variant="outline"
                className="w-full h-12 text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 hover:border-red-300 gap-2 rounded-xl text-sm font-semibold"
                onClick={handleLogout}
              >
                <LogOut className="size-4.5" />
                Logout
              </Button>
            </div>

            {/* ─── App Version ─── */}
            <p className="mt-6 text-center text-[11px] text-gray-400">
              MOHD.HMS Enterprise v1.0.0
            </p>
          </>
        )}
      </div>
    </div>
  );
}