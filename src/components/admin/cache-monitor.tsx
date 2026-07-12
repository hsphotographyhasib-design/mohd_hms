'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Activity,
  Zap,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  AlertTriangle,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  PenLine,
  XOctagon,
  Mail,
  Bell,
  MessageSquare,
  CalendarClock,
  HeartPulse,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// ============ TYPES ============

interface RedisInfo {
  available: boolean;
  connected: boolean;
  uptimeMs: number;
  configPresent: boolean;
  totalErrors: number;
  totalReconnects: number;
  lastError: string | null;
}

interface CacheInfo {
  hits: number;
  misses: number;
  hitRate: string;
  missRate: string;
  writes: number;
  deletes: number;
  errors: number;
  totalRequests: number;
}

interface QueueCounts {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
}

interface QueueInfo {
  workersRunning: boolean;
  queues: Record<string, QueueCounts>;
}

interface CacheMonitorData {
  redis: RedisInfo;
  cache: CacheInfo;
  queue: QueueInfo;
  ttlConfig?: Record<string, unknown>;
  keyPrefixes?: Record<string, unknown>;
}

// ============ HELPERS ============

function formatUptime(ms: number): string {
  if (ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

function parseRate(rateStr: string): number {
  const num = parseFloat(rateStr);
  return isNaN(num) ? 0 : num;
}

const QUEUE_META: Record<string, { icon: typeof Mail; label: string; color: string }> = {
  emails: { icon: Mail, label: 'Emails', color: 'text-blue-500' },
  notifications: { icon: Bell, label: 'Notifications', color: 'text-amber-500' },
  whatsapp: { icon: MessageSquare, label: 'WhatsApp', color: 'text-green-500' },
  reminders: { icon: CalendarClock, label: 'Reminders', color: 'text-purple-500' },
};

// ============ COMPONENT ============

export function CacheMonitor() {
  const [data, setData] = useState<CacheMonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invalidatePattern, setInvalidatePattern] = useState('');
  const [invalidating, setInvalidating] = useState(false);

  // ── Fetch ──
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = localStorage.getItem('cmms_token');
      const res = await fetch('/api/cache/monitor', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error('Failed to fetch cache data');
      }
    } catch {
      toast.error('Network error while fetching cache data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Invalidate ──
  const handleInvalidate = async () => {
    const pattern = invalidatePattern.trim();
    if (!pattern) {
      toast.error('Please enter a cache key pattern');
      return;
    }
    setInvalidating(true);
    try {
      const token = localStorage.getItem('cmms_token');
      const res = await fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pattern }),
      });
      if (res.ok) {
        toast.success(`Cache invalidated for pattern: ${pattern}`);
        setInvalidatePattern('');
        fetchData(true);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Invalidation failed');
      }
    } catch {
      toast.error('Network error during invalidation');
    } finally {
      setInvalidating(false);
    }
  };

  // ── Derived ──
  const redis = data?.redis;
  const cache = data?.cache;
  const queue = data?.queue;

  const hitRateNum = cache ? parseRate(cache.hitRate) : 0;
  const missRateNum = cache ? parseRate(cache.missRate) : 0;

  // Health computation
  const isHealthy = redis?.connected === true && (cache?.errors ?? 0) === 0;
  const isDegraded = !isHealthy && redis?.available === true;

  const healthConfig = isHealthy
    ? { label: 'Healthy', color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle }
    : isDegraded
      ? { label: 'Degraded', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', Icon: AlertTriangle }
      : { label: 'Unhealthy', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700', Icon: XCircle };

  const HealthIcon = healthConfig.Icon;

  // ── Loading skeleton ──
  if (loading && !data) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-muted rounded animate-pulse" />
              <div className="h-3 w-56 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-24 bg-muted rounded-md animate-pulse" />
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-8 w-16 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-24 w-full bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50">
            <Database className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Cache Monitoring</h2>
            <p className="text-sm text-muted-foreground">Redis cache, queue status &amp; performance metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Auto-refreshes 30s</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Cache Health Indicator ── */}
      <Card className={`border ${healthConfig.border}`}>
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${healthConfig.bg}`}>
                <HealthIcon className={`h-5 w-5 ${healthConfig.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Cache Health</span>
                  <Badge className={`text-[10px] px-1.5 py-0 border-0 ${healthConfig.badge}`}>
                    {healthConfig.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isHealthy
                    ? 'All cache systems are operating normally.'
                    : isDegraded
                      ? 'Cache is available but experiencing issues.'
                      : 'Cache is unavailable or misconfigured.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {queue && (
                <span className="flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5" />
                  Workers {queue.workersRunning ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-rose-500" />}
                </span>
              )}
              {redis && (
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  {redis.totalReconnects} reconnects
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Redis Connection Status ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            Redis Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${redis?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <Badge
                className={`border-0 ${redis?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
              >
                {redis?.connected ? 'Connected' : 'Disconnected'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {redis?.configPresent ? 'Config loaded' : 'No config'}
              </span>
            </div>
            {redis && redis.uptimeMs > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Uptime: <span className="font-medium text-foreground">{formatUptime(redis.uptimeMs)}</span></span>
              </div>
            )}
          </div>

          {/* Connection detail row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="text-sm font-medium flex items-center gap-1.5">
                {redis?.available ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                {redis?.available ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Errors</p>
              <p className={`text-sm font-medium ${(redis?.totalErrors ?? 0) > 0 ? 'text-rose-600' : 'text-foreground'}`}>
                {redis?.totalErrors ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reconnects</p>
              <p className={`text-sm font-medium ${(redis?.totalReconnects ?? 0) > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                {redis?.totalReconnects ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Error</p>
              <p className="text-sm font-medium text-muted-foreground truncate">
                {redis?.lastError || 'None'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Cache Performance Bar ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Cache Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Requests</span>
            <span className="font-semibold text-foreground">{cache?.totalRequests.toLocaleString() ?? '0'}</span>
          </div>

          {/* Visual performance bar */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-emerald-600 font-medium">Hit Rate: {cache?.hitRate ?? '0%'}</span>
              <span className="text-rose-500 font-medium">Miss Rate: {cache?.missRate ?? '0%'}</span>
            </div>
            <div className="h-4 w-full rounded-full bg-rose-100 overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-l-full transition-all duration-700 ease-out"
                style={{ width: `${hitRateNum}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-rose-300 to-rose-400 rounded-r-full transition-all duration-700 ease-out"
                style={{ width: `${missRateNum}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              <span>{cache?.hits.toLocaleString() ?? 0} hits</span>
              <span>{cache?.misses.toLocaleString() ?? 0} misses</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Cache Metrics Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Hits */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-emerald-50">
                <Zap className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Hits</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{cache?.hits.toLocaleString() ?? '0'}</p>
            <p className="text-[10px] text-emerald-600 mt-1">Cache served</p>
          </CardContent>
        </Card>

        {/* Misses */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-rose-50">
                <ArrowDownCircle className="h-4 w-4 text-rose-500" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Misses</span>
            </div>
            <p className={`text-2xl font-bold ${(cache?.misses ?? 0) > 0 ? 'text-rose-600' : 'text-foreground'}`}>
              {cache?.misses.toLocaleString() ?? '0'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Cache bypass</p>
          </CardContent>
        </Card>

        {/* Writes */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-blue-50">
                <PenLine className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Writes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{cache?.writes.toLocaleString() ?? '0'}</p>
            <p className="text-[10px] text-blue-600 mt-1">Stored to cache</p>
          </CardContent>
        </Card>

        {/* Deletes */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-amber-50">
                <Trash2 className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Deletes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{cache?.deletes.toLocaleString() ?? '0'}</p>
            <p className="text-[10px] text-amber-600 mt-1">Keys removed</p>
          </CardContent>
        </Card>

        {/* Errors */}
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${(cache?.errors ?? 0) > 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                <XOctagon className={`h-4 w-4 ${(cache?.errors ?? 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Errors</span>
            </div>
            <p className={`text-2xl font-bold ${(cache?.errors ?? 0) > 0 ? 'text-rose-600' : 'text-foreground'}`}>
              {cache?.errors.toLocaleString() ?? '0'}
            </p>
            <p className={`text-[10px] mt-1 ${(cache?.errors ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {(cache?.errors ?? 0) > 0 ? 'Needs attention' : 'No errors'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ── Queue Status ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            Queue Status
          </h3>
          {queue && (
            <Badge
              className={`border-0 text-[10px] ${queue.workersRunning ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
            >
              Workers {queue.workersRunning ? 'Running' : 'Stopped'}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(QUEUE_META).map(([key, meta]) => {
            const counts = queue?.queues[key];
            const Icon = meta.icon;
            const hasIssues = (counts?.failed ?? 0) > 0 || (counts?.deadLetter ?? 0) > 0;
            const totalActive = (counts?.pending ?? 0) + (counts?.processing ?? 0);

            return (
              <Card key={key} className={hasIssues ? 'border-rose-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-muted">
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </div>
                      <span className="text-sm font-medium">{meta.label}</span>
                    </div>
                    {hasIssues && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Issues
                      </Badge>
                    )}
                  </div>

                  {!counts ? (
                    <p className="text-xs text-muted-foreground">No data available</p>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: 'Pending', value: counts.pending, color: 'text-blue-600' },
                        { label: 'Processing', value: counts.processing, color: 'text-amber-600' },
                        { label: 'Completed', value: counts.completed, color: 'text-emerald-600' },
                        { label: 'Failed', value: counts.failed, color: 'text-rose-600' },
                        { label: 'Dead', value: counts.deadLetter, color: 'text-gray-600' },
                      ].map((item) => (
                        <div key={item.label} className="text-center">
                          <p className={`text-lg font-bold ${item.color}`}>
                            {item.value}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── Manual Cache Invalidation ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            Manual Cache Invalidation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Enter a key pattern (e.g. <code className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono">dashboard:*</code>,
            <code className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono ml-1">user:123:*</code>) to invalidate matching cache entries.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Enter key pattern (e.g. dashboard:*)"
              value={invalidatePattern}
              onChange={(e) => setInvalidatePattern(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInvalidate();
              }}
              className="font-mono text-sm"
              disabled={invalidating}
            />
            <Button
              onClick={handleInvalidate}
              disabled={invalidating || !invalidatePattern.trim()}
              variant="destructive"
              className="sm:w-auto w-full"
            >
              {invalidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Invalidating...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Invalidate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}