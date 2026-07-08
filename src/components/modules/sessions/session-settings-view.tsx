'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Shield, Users, Settings, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store';

// ============ Types ============

const ROLES = [
  'super_admin',
  'admin',
  'manager',
  'supervisor',
  'technician',
  'customer',
  'finance',
] as const;

interface SessionConfig {
  roleTimeouts: Record<string, number>; // role → minutes
  warningBefore: number; // minutes
  rememberMeDuration: number; // days
  maxConcurrentSessions: number; // 0 = unlimited
  logoutOnPasswordReset: boolean;
  logoutOnRoleChange: boolean;
  logoutOnAccountDeactivation: boolean;
}

function getDefaultConfig(): SessionConfig {
  return {
    roleTimeouts: {
      super_admin: 60,
      admin: 60,
      manager: 45,
      supervisor: 30,
      technician: 30,
      customer: 60,
      finance: 45,
    },
    warningBefore: 5,
    rememberMeDuration: 30,
    maxConcurrentSessions: 3,
    logoutOnPasswordReset: true,
    logoutOnRoleChange: true,
    logoutOnAccountDeactivation: true,
  };
}

function getToken() {
  return useAuthStore.getState().token || localStorage.getItem('cmms_token') || '';
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    supervisor: 'Supervisor',
    technician: 'Technician',
    customer: 'Customer',
    finance: 'Finance',
  };
  return labels[role] || role;
}

// ============ Component ============

export function SessionSettingsView() {
  const [config, setConfig] = useState<SessionConfig>(getDefaultConfig());
  const [originalConfig, setOriginalConfig] = useState<SessionConfig>(getDefaultConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions/settings', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch session settings');
      const json = await res.json();

      // Map server response to our local shape
      const serverConfig: SessionConfig = {
        roleTimeouts: json.roleTimeouts || getDefaultConfig().roleTimeouts,
        warningBefore: json.warningBefore ?? 5,
        rememberMeDuration: json.rememberMeDuration ?? 30,
        maxConcurrentSessions: json.maxConcurrentSessions ?? 3,
        logoutOnPasswordReset: json.logoutOnPasswordReset ?? true,
        logoutOnRoleChange: json.logoutOnRoleChange ?? true,
        logoutOnAccountDeactivation: json.logoutOnAccountDeactivation ?? true,
      };

      setConfig(serverConfig);
      setOriginalConfig(serverConfig);
    } catch {
      toast.error('Failed to load session settings');
      // Keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/sessions/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('Failed to save');
      setOriginalConfig({ ...config });
      toast.success('Session settings saved successfully');
    } catch {
      toast.error('Failed to save session settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const defaults = getDefaultConfig();
      setConfig(defaults);

      const res = await fetch('/api/sessions/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(defaults),
      });
      if (!res.ok) throw new Error('Failed to reset');
      setOriginalConfig(defaults);
      toast.success('Session settings reset to defaults');
    } catch {
      toast.error('Failed to reset session settings');
    } finally {
      setResetting(false);
    }
  };

  const updateRoleTimeout = (role: string, minutes: number) => {
    setConfig((prev) => ({
      ...prev,
      roleTimeouts: { ...prev.roleTimeouts, [role]: Math.max(1, minutes) },
    }));
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Settings className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Session Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure session timeouts and security policies
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={resetting || !hasChanges}
          >
            {resetting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Reset to Defaults
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Role-Based Timeouts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            Role-Based Idle Timeouts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set the inactivity timeout (in minutes) for each user role. After this period of inactivity, users will be warned and then logged out.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLES.map((role) => (
              <div key={role} className="space-y-1.5">
                <Label className="text-sm font-medium">{roleLabel(role)}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={config.roleTimeouts[role] ?? 30}
                    onChange={(e) => updateRoleTimeout(role, parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Warning Before */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Warning Before Logout</Label>
              <p className="text-xs text-muted-foreground">
                Show a warning modal this many minutes before auto-logout
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={config.warningBefore}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    warningBefore: Math.max(1, parseInt(e.target.value) || 1),
                  }))
                }
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          </div>

          <Separator />

          {/* Remember Me Duration */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Remember Me Duration</Label>
              <p className="text-xs text-muted-foreground">
                How long &quot;Remember Me&quot; sessions last
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={config.rememberMeDuration}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    rememberMeDuration: Math.max(1, parseInt(e.target.value) || 1),
                  }))
                }
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>

          <Separator />

          {/* Max Concurrent Sessions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Max Concurrent Sessions</Label>
              <p className="text-xs text-muted-foreground">
                Maximum number of simultaneous sessions per user (0 = unlimited)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={config.maxConcurrentSessions}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    maxConcurrentSessions: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                {config.maxConcurrentSessions === 0 ? 'unlimited' : 'sessions'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            Security Policies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Logout on Password Reset */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Logout on Password Reset</Label>
              <p className="text-xs text-muted-foreground">
                Automatically log out all sessions when a user resets their password
              </p>
            </div>
            <Switch
              checked={config.logoutOnPasswordReset}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, logoutOnPasswordReset: checked }))
              }
            />
          </div>

          <Separator />

          {/* Logout on Role Change */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Logout on Role Change</Label>
              <p className="text-xs text-muted-foreground">
                Automatically log out all sessions when a user&apos;s role is changed
              </p>
            </div>
            <Switch
              checked={config.logoutOnRoleChange}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, logoutOnRoleChange: checked }))
              }
            />
          </div>

          <Separator />

          {/* Logout on Account Deactivation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Logout on Account Deactivation</Label>
              <p className="text-xs text-muted-foreground">
                Automatically log out all sessions when a user&apos;s account is deactivated
              </p>
            </div>
            <Switch
              checked={config.logoutOnAccountDeactivation}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, logoutOnAccountDeactivation: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}