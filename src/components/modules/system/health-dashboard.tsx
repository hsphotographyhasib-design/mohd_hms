'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Database,
  Shield,
  Mail,
  HardDrive,
  Server,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  KeyRound,
  MessageSquare,
  Route,
} from 'lucide-react';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  message: string;
  user?: string;
}

interface HealthData {
  status: string;
  timestamp: string;
  responseTime: number;
  environment: string;
  auditVersion?: string;
  checks: Record<string, HealthCheck>;
}

const STATUS_CONFIG = {
  healthy: { color: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2, label: 'Healthy' },
  degraded: { color: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', Icon: AlertTriangle, label: 'Degraded' },
  down: { color: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700', Icon: XCircle, label: 'Down' },
};

const CHECK_META: Record<string, { icon: typeof Database; label: string; description: string }> = {
  database: { icon: Database, label: 'Database', description: 'PostgreSQL connection' },
  prisma: { icon: Server, label: 'Prisma ORM', description: 'Query engine status' },
  authentication: { icon: Shield, label: 'Authentication', description: 'JWT verification' },
  email: { icon: Mail, label: 'Email Service', description: 'Brevo API status' },
  storage: { icon: HardDrive, label: 'File Storage', description: 'Upload directory' },
  jwt: { icon: KeyRound, label: 'JWT Secret', description: 'Token signing security' },
  whatsapp: { icon: MessageSquare, label: 'WhatsApp', description: 'WhatsApp Business API' },
  apiRoutes: { icon: Route, label: 'API Routes', description: 'Registered endpoint count' },
};

export function HealthDashboard() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('cmms_token');
      const res = await fetch('/api/system/health', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const overallStatus = data
    ? Object.values(data.checks).some((c) => c.status === 'down')
      ? 'down'
      : Object.values(data.checks).some((c) => c.status === 'degraded')
        ? 'degraded'
        : 'healthy'
    : 'down';

  const cfg = STATUS_CONFIG[overallStatus as keyof typeof STATUS_CONFIG];
  const OverallIcon = cfg.Icon;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50">
            <Activity className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">System Health</h2>
            <p className="text-sm text-muted-foreground">Real-time infrastructure monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data?.auditVersion && (
            <Badge variant="outline" className="text-[10px]">Audit v{data.auditVersion}</Badge>
          )}
          {data && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {new Date(data.timestamp).toLocaleTimeString()}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status Bar */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <OverallIcon className={`h-8 w-8 ${overallStatus === 'healthy' ? 'text-emerald-500' : overallStatus === 'degraded' ? 'text-amber-500' : 'text-rose-500'}`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{overallStatus === 'healthy' ? 'All Systems Operational' : overallStatus === 'degraded' ? 'Partial Degradation' : 'System Issues Detected'}</span>
                  <Badge className={cfg.badge}>{cfg.label}</Badge>
                </div>
                {data && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Environment: {data.environment} · Check completed in {data.responseTime}ms
                  </p>
                )}
              </div>
            </div>
            {data && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{Object.values(data.checks).filter((c) => c.status === 'healthy').length}/{Object.keys(data.checks).length} healthy</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(CHECK_META).map(([key, meta]) => {
          const check = data?.checks[key];
          const status = check?.status || 'down';
          const sCfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          const StatusIcon = sCfg.Icon;
          const Icon = meta.icon;

          return (
            <Card key={key} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                  </div>
                  <StatusIcon className={`h-5 w-5 ${status === 'healthy' ? 'text-emerald-500' : status === 'degraded' ? 'text-amber-500' : 'text-rose-500'}`} />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${sCfg.color} ${status === 'healthy' ? 'animate-pulse' : ''}`} />
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${sCfg.badge}`}>
                    {sCfg.label}
                  </Badge>
                  {check && check.responseTime > 0 && (
                    <span className="text-[10px] text-muted-foreground ml-auto">{check.responseTime}ms</span>
                  )}
                </div>

                {check && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {check.message}
                    {check.user && (
                      <span className="block mt-1 text-foreground font-medium">{check.user}</span>
                    )}
                  </p>
                )}

                {loading && !check && (
                  <div className="space-y-1.5">
                    <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}