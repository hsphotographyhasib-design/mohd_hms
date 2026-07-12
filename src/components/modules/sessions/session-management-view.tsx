'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Monitor,
  Smartphone,
  Tablet,
  LogOut,
  Shield,
  Clock,
  MapPin,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store';

// ============ Helpers ============

function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function maskIp(ip: string): string {
  if (!ip) return 'Unknown';
  const parts = ip.split('.');
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  return ip;
}

function DeviceIconDisplay({ deviceType, className }: { deviceType: string; className?: string }) {
  const type = deviceType?.toLowerCase();
  if (type === 'mobile' || type === 'phone') {
    return <Smartphone className={className} />;
  }
  if (type === 'tablet') {
    return <Tablet className={className} />;
  }
  return <Monitor className={className} />;
}

function getToken() {
  return useAuthStore.getState().token || localStorage.getItem('cmms_token') || '';
}

// ============ Types ============

interface SessionInfo {
  id: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  loginTime?: string;
  lastActivity?: string;
  isCurrent?: boolean;
  userAgent?: string;
}

// ============ Component ============

export function SessionManagementView() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOutId, setLoggingOutId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const json = await res.json();
      setSessions(json.data || json.sessions || json || []);
    } catch {
      toast.error('Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleLogoutDevice = async (sessionId: string) => {
    setLoggingOutId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Device logged out successfully');
      fetchSessions();
    } catch {
      toast.error('Failed to logout device');
    } finally {
      setLoggingOutId(null);
    }
  };

  const handleRevokeAll = async () => {
    setRevokingAll(true);
    try {
      const res = await fetch('/api/sessions/revoke-others', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error();
      toast.success('All other devices have been logged out');
      fetchSessions();
    } catch {
      toast.error('Failed to logout other devices');
    } finally {
      setRevokingAll(false);
    }
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);
  const currentSession = sessions.find((s) => s.isCurrent);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Shield className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Session Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage your active sessions across devices
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSessions}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {otherSessions.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRevokeAll}
              disabled={revokingAll}
            >
              {revokingAll ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              Logout All Other Devices
            </Button>
          )}
        </div>
      </div>

      {/* Current Device */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="h-4 w-4 text-emerald-600" />
            Current Device
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : currentSession ? (
            <SessionCard session={currentSession} isCurrent />
          ) : (
            <p className="text-sm text-muted-foreground">No current session found.</p>
          )}
        </CardContent>
      </Card>

      {/* Other Devices */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Other Active Sessions
            {otherSessions.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {otherSessions.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : otherSessions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Monitor className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No other active sessions</p>
            </div>
          ) : (
            <div className="divide-y">
              {otherSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onLogout={() => handleLogoutDevice(session.id)}
                  loggingOut={loggingOutId === session.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Session Card Sub-component ============

function SessionCard({
  session,
  isCurrent = false,
  onLogout,
  loggingOut = false,
}: {
  session: SessionInfo;
  isCurrent?: boolean;
  onLogout?: () => void;
  loggingOut?: boolean;
}) {
  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Device Icon */}
      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
        <DeviceIconDisplay deviceType={session.deviceType || ''} className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Device Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">
            {session.deviceName || 'Unknown Device'}
          </span>
          {isCurrent && (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
              Current
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
          {session.browser && <span>{session.browser}</span>}
          {session.os && (
            <>
              <span className="text-border">·</span>
              <span>{session.os}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1.5 flex-wrap text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {session.loginTime ? `Logged in ${timeAgo(session.loginTime)}` : 'Unknown'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {session.lastActivity ? `Active ${timeAgo(session.lastActivity)}` : 'Unknown'}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {maskIp(session.ipAddress || '')}
          </span>
        </div>
      </div>

      {/* Logout Button */}
      {onLogout && !isCurrent && (
        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          disabled={loggingOut}
          className="shrink-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 border-rose-200 dark:border-rose-800/40"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 mr-1.5" />
          )}
          <span className="hidden sm:inline">Logout Device</span>
          <span className="sm:hidden">Logout</span>
        </Button>
      )}
    </div>
  );
}