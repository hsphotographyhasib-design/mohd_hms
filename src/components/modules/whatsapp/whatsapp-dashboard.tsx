'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  MessageSquare, Send, AlertTriangle, Clock, Wifi, WifiOff, Loader2,
  ArrowRight, TrendingUp, TrendingDown, ArrowUpRight,
  MessageCircle, FileText, Settings, Zap,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/store';
import { toast } from 'sonner';
import type { WhatsAppDashboardStats, WhatsAppSessionData } from '@/types';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function formatRelativeTime(dateStr: string): string {
  try {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return then.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

function formatResponseTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round((seconds % 60))}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// ============ MOCK DATA ============

const MOCK_STATS: WhatsAppDashboardStats = {
  totalSessions: 142,
  activeSessions: 23,
  totalMessages: 3456,
  messagesToday: 187,
  inboundToday: 98,
  outboundToday: 89,
  complaintsViaWhatsapp: 12,
  avgResponseTime: 245,
  unresolvedThreads: 5,
  connectionStatus: 'connected',
  provider: 'openwa',
  recentSessions: [
    { id: '1', tenantId: 't1', configId: 'c1', phoneNumber: '+6012345678', customerName: 'Ahmad Razak', state: 'chat', lastMessageAt: new Date(Date.now() - 120000).toISOString(), messageCount: 15, isActive: true, isBlocked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '2', tenantId: 't1', configId: 'c1', phoneNumber: '+6012345679', customerName: 'Sarah Lee', state: 'new_complaint_desc', lastMessageAt: new Date(Date.now() - 300000).toISOString(), messageCount: 8, isActive: true, isBlocked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '3', tenantId: 't1', configId: 'c1', phoneNumber: '+6012345680', customerName: 'Kumar Nair', state: 'status_query', lastMessageAt: new Date(Date.now() - 900000).toISOString(), messageCount: 4, isActive: true, isBlocked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '4', tenantId: 't1', configId: 'c1', phoneNumber: '+6012345681', customerName: 'Lim Wei Ming', state: 'menu', lastMessageAt: new Date(Date.now() - 1800000).toISOString(), messageCount: 22, isActive: false, isBlocked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '5', tenantId: 't1', configId: 'c1', phoneNumber: '+6012345682', customerName: 'Priya Sharma', state: 'feedback_rating', lastMessageAt: new Date(Date.now() - 3600000).toISOString(), messageCount: 6, isActive: true, isBlocked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '6', tenantId: 't1', configId: 'c1', phoneNumber: '+6012345683', customerName: 'Omar Hassan', state: 'emergency_desc', lastMessageAt: new Date(Date.now() - 7200000).toISOString(), messageCount: 3, isActive: true, isBlocked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '7', tenantId: 't1', configId: 'c1', phoneNumber: '+6012345684', customerName: 'Tan Mei Ling', state: 'chat', lastMessageAt: new Date(Date.now() - 14400000).toISOString(), messageCount: 31, isActive: false, isBlocked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '8', tenantId: 't1', configId: 'c1', phoneNumber: '+6012345685', customerName: 'Raj Patel', state: 'invoice_query', lastMessageAt: new Date(Date.now() - 28800000).toISOString(), messageCount: 11, isActive: true, isBlocked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '9', tenantId: 't1', configId: 'c1', phoneNumber: '+6012345686', customerName: 'Nurul Aisyah', state: 'menu', lastMessageAt: new Date(Date.now() - 43200000).toISOString(), messageCount: 2, isActive: true, isBlocked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '10', tenantId: 't1', configId: 'c1', phoneNumber: '+6012345687', customerName: 'David Wong', state: 'service_request_desc', lastMessageAt: new Date(Date.now() - 86400000).toISOString(), messageCount: 7, isActive: true, isBlocked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ],
  recentMessages: [],
  messageTrend: [
    { date: 'Mon', inbound: 65, outbound: 58 },
    { date: 'Tue', inbound: 72, outbound: 65 },
    { date: 'Wed', inbound: 85, outbound: 78 },
    { date: 'Thu', inbound: 63, outbound: 70 },
    { date: 'Fri', inbound: 91, outbound: 85 },
    { date: 'Sat', inbound: 45, outbound: 38 },
    { date: 'Sun', inbound: 98, outbound: 89 },
  ],
};

// ============ STAT CARD CONFIG ============

interface StatCardConfig {
  key: keyof WhatsAppDashboardStats;
  label: string;
  icon: React.ElementType;
  valueFormat: (v: number) => string;
  trend: number;
  color: string;
  iconBg: string;
}

const STAT_CARDS: StatCardConfig[] = [
  {
    key: 'activeSessions',
    label: 'Active Sessions',
    icon: MessageSquare,
    valueFormat: (v) => String(v),
    trend: 12,
    color: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
  },
  {
    key: 'messagesToday',
    label: 'Messages Today',
    icon: Send,
    valueFormat: (v) => String(v),
    trend: 8,
    color: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
  },
  {
    key: 'complaintsViaWhatsapp',
    label: 'Complaints via WhatsApp',
    icon: AlertTriangle,
    valueFormat: (v) => String(v),
    trend: -3,
    color: 'text-amber-600',
    iconBg: 'bg-amber-100',
  },
  {
    key: 'avgResponseTime',
    label: 'Avg Response Time',
    icon: Clock,
    valueFormat: (v) => formatResponseTime(v),
    trend: -15,
    color: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
  },
];

// ============ COMPONENTS ============

function StatCard({ config, stats }: { config: StatCardConfig; stats: WhatsAppDashboardStats }) {
  const value = stats[config.key] as number;
  const Icon = config.icon;
  const isPositiveTrend = config.key === 'complaintsViaWhatsapp' ? config.trend < 0 : config.trend > 0;
  const isTimeMetric = config.key === 'avgResponseTime';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{config.label}</p>
              <p className={`text-2xl font-bold ${config.color}`}>{config.valueFormat(value)}</p>
            </div>
            <div className={`rounded-lg p-2.5 ${config.iconBg}`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs">
            {isPositiveTrend ? (
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-rose-500" />
            )}
            <span className={isPositiveTrend ? 'text-emerald-600' : 'text-rose-600'}>
              {Math.abs(config.trend)}%
            </span>
            <span className="text-muted-foreground">
              {isTimeMetric
                ? isPositiveTrend ? 'slower' : 'faster'
                : isPositiveTrend ? 'vs last week' : 'vs last week'}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ConnectionBanner({ stats }: { stats: WhatsAppDashboardStats }) {
  const { setView } = useAppStore();

  const providerNames: Record<string, string> = {
    openwa: 'OpenWA',
    meta: 'Meta Cloud API',
    twilio: 'Twilio',
  };

  const statusConfig = {
    connected: { dot: 'bg-emerald-500', text: 'Connected', label: 'bg-emerald-50 text-emerald-700' },
    disconnected: { dot: 'bg-red-500', text: 'Disconnected', label: 'bg-red-50 text-red-700' },
    connecting: { dot: 'bg-amber-500', text: 'Connecting...', label: 'bg-amber-50 text-amber-700' },
  };

  const config = statusConfig[stats.connectionStatus];

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          {stats.connectionStatus === 'connected' ? (
            <Wifi className="h-5 w-5 text-emerald-600" />
          ) : stats.connectionStatus === 'connecting' ? (
            <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {providerNames[stats.provider] || stats.provider}
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize">
              <span className={`h-2 w-2 rounded-full ${config.dot}`} />
              {config.text}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setView('whatsapp-settings')}
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <Settings className="h-4 w-4 mr-1.5" />
          {stats.connectionStatus === 'connected' ? 'Configure' : 'Connect'}
        </Button>
      </CardContent>
    </Card>
  );
}

function MessageTrendChart({ data }: { data: { date: string; inbound: number; outbound: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Message Trend (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="outbound"
                name="Outbound"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#10b981' }}
                activeDot={{ r: 5, fill: '#10b981' }}
              />
              <Line
                type="monotone"
                dataKey="inbound"
                name="Inbound"
                stroke="#9ca3af"
                strokeWidth={2}
                dot={{ r: 3, fill: '#9ca3af' }}
                activeDot={{ r: 5, fill: '#9ca3af' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentConversationsTable({ sessions }: { sessions: WhatsAppSessionData[] }) {
  const { setView } = useAppStore();

  const stateBadgeVariant = (state: string) => {
    const map: Record<string, string> = {
      menu: 'bg-gray-100 text-gray-700',
      chat: 'bg-emerald-100 text-emerald-700',
      new_complaint_desc: 'bg-amber-100 text-amber-700',
      new_complaint_media: 'bg-amber-100 text-amber-700',
      new_complaint_equipment: 'bg-amber-100 text-amber-700',
      service_request_desc: 'bg-amber-100 text-amber-700',
      status_query: 'bg-sky-100 text-sky-700',
      invoice_query: 'bg-violet-100 text-violet-700',
      emergency_desc: 'bg-red-100 text-red-700',
      feedback_rating: 'bg-teal-100 text-teal-700',
      feedback_comment: 'bg-teal-100 text-teal-700',
      escalation_desc: 'bg-rose-100 text-rose-700',
      appointment_date: 'bg-orange-100 text-orange-700',
      appointment_time: 'bg-orange-100 text-orange-700',
      appointment_location: 'bg-orange-100 text-orange-700',
    };
    return map[state] || 'bg-gray-100 text-gray-700';
  };

  const stateLabel = (state: string) => {
    const map: Record<string, string> = {
      menu: 'Menu',
      chat: 'Chat',
      new_complaint_desc: 'New Complaint',
      new_complaint_media: 'Upload Media',
      new_complaint_equipment: 'Select Equipment',
      service_request_desc: 'Service Request',
      status_query: 'Status Query',
      invoice_query: 'Invoice Query',
      emergency_desc: 'Emergency',
      feedback_rating: 'Rating',
      feedback_comment: 'Feedback',
      escalation_desc: 'Escalation',
      appointment_date: 'Appointment',
      appointment_time: 'Appointment',
      appointment_location: 'Appointment',
    };
    return map[state] || state.replace(/_/g, ' ');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Recent Conversations</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Last Message</TableHead>
                <TableHead className="hidden sm:table-cell">State</TableHead>
                <TableHead className="hidden lg:table-cell">Messages</TableHead>
                <TableHead className="hidden lg:table-cell">Time</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow
                  key={session.id}
                  className="cursor-pointer hover:bg-emerald-50/50 transition-colors"
                  onClick={() => setView('whatsapp-chats', { sessionId: session.id })}
                >
                  <TableCell className="font-mono text-sm">{session.phoneNumber}</TableCell>
                  <TableCell className="font-medium">{session.customerName || 'Unknown'}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {formatRelativeTime(session.lastMessageAt)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className={stateBadgeVariant(session.state)}>
                      {stateLabel(session.state)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{session.messageCount}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                    {formatRelativeTime(session.lastMessageAt)}
                  </TableCell>
                  <TableCell>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  const { setView } = useAppStore();

  const actions = [
    { label: 'View Live Chats', view: 'whatsapp-chats' as const, icon: MessageCircle, desc: 'Active conversations' },
    { label: 'Manage Templates', view: 'whatsapp-templates' as const, icon: FileText, desc: 'Message templates' },
    { label: 'Create Campaign', view: 'whatsapp-campaigns' as const, icon: Zap, desc: 'Broadcast campaigns' },
    { label: 'Settings', view: 'whatsapp-settings' as const, icon: Settings, desc: 'Provider config' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.view}
                whileHover={{ scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-auto flex flex-col items-center gap-2 py-4 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                  onClick={() => setView(action.view)}
                >
                  <Icon className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-sm">{action.label}</span>
                  <span className="text-xs text-muted-foreground">{action.desc}</span>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ MAIN COMPONENT ============

export function WhatsAppDashboard() {
  const [stats, setStats] = useState<WhatsAppDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/whatsapp', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        // Use mock data in development
        setStats(MOCK_STATS);
      }
    } catch {
      // Use mock data when API is not available
      setStats(MOCK_STATS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-100 p-2">
          <MessageSquare className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Admin</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage WhatsApp communications</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((config) => (
          <StatCard key={config.key} config={config} stats={stats} />
        ))}
      </div>

      {/* Connection Status Banner */}
      <ConnectionBanner stats={stats} />

      {/* Message Trend Chart */}
      <MessageTrendChart data={stats.messageTrend} />

      {/* Recent Conversations */}
      <RecentConversationsTable sessions={stats.recentSessions} />

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}
