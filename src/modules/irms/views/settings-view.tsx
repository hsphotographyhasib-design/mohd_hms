'use client';

import React from 'react';
import { Sun, Moon, User, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIrmStore, ROLES } from '@/modules/irms/lib';
import { toast } from 'sonner';

export default function SettingsView() {
  const theme = useIrmStore((s) => s.theme);
  const toggleTheme = useIrmStore((s) => s.toggleTheme);
  const currentUser = useIrmStore((s) => s.currentUser);
  const setCurrentUser = useIrmStore((s) => s.setCurrentUser);

  const handleRoleSwitch = (role: string) => {
    setCurrentUser({ ...currentUser, role });
    toast.success(`Switched to ${role}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Application preferences</p>
      </div>

      <div className="max-w-2xl space-y-4">
        {/* Theme Toggle */}
        <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'light' ? (
                  <Sun className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Moon className="h-5 w-5 text-blue-400" />
                )}
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="text-xs text-muted-foreground">
                    {theme === 'light' ? 'Light mode' : 'Dark mode'}
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* Current User */}
        <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Current User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-green-600 text-white text-lg">
                  {currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-semibold text-lg">{currentUser.name}</p>
                <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                <p className="text-sm">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {currentUser.role}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Switcher (Demo) */}
        <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Role Switcher (Demo)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Switch between roles to test different permission levels
            </p>
            <Select value={currentUser.role} onValueChange={handleRoleSwitch}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Regional Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm">Language</Label>
              <Select defaultValue="en">
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية (Arabic)</SelectItem>
                  <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                  <SelectItem value="ur">اردو (Urdu)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div>
              <Label className="text-sm">Date Format</Label>
              <Select defaultValue="yyyy-mm-dd">
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div>
              <Label className="text-sm">Time Zone</Label>
              <Select defaultValue="asia/dubai">
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asia/dubai">Asia/Dubai (GMT+4)</SelectItem>
                  <SelectItem value="asia/riyadh">Asia/Riyadh (GMT+3)</SelectItem>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="america/new_york">America/New York (EST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}