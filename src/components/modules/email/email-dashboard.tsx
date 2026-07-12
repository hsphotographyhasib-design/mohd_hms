'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Send,
  Mail,
  MailCheck,
  MailOpen,
  MailWarning,
  MailX,
  Clock,
  RefreshCw,
  Filter,
  TrendingUp,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Eye,
  MousePointerClick,
  ArrowUpRight,
  Loader2,
  Inbox,
} from 'lucide-react';
import { CampaignsTab } from './campaigns-tab';
import { toast } from 'sonner';

// ============ TYPES ============

interface EmailStats {
  sentToday: number;
  failedToday: number;
  queueSize: number;
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  scheduledCount: number;
}

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  templateName: string | null;
  module: string | null;
  status: string;
  provider: string;
  providerMessageId: string | null;
  retryCount: number;
  maxRetries: number;
  attachmentCount: number;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  errorMessage: string | null;
}

interface TemplateInfo {
  identifier: string;
  name: string;
  module: string;
  description: string;
  variables: { name: string; description: string; required: boolean }[];
}

// ============ STATUS HELPERS ============

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  queued: { label: 'Queued', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  sending: { label: 'Sending', color: 'bg-blue-100 text-blue-800', icon: Loader2 },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800', icon: MailCheck },
  opened: { label: 'Opened', color: 'bg-green-100 text-green-800', icon: MailOpen },
  clicked: { label: 'Clicked', color: 'bg-teal-100 text-teal-800', icon: MousePointerClick },
  bounced: { label: 'Bounced', color: 'bg-red-100 text-red-800', icon: MailX },
  failed: { label: 'Failed', color: 'bg-rose-100 text-rose-800', icon: AlertCircle },
  spam: { label: 'Spam', color: 'bg-orange-100 text-orange-800', icon: MailWarning },
  unsubscribed: { label: 'Unsubscribed', color: 'bg-gray-100 text-gray-800', icon: MailX },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: Mail };
  const Icon = config.icon;
  return (
    <Badge variant="secondary" className={`${config.color} gap-1 text-xs font-medium`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ============ STAT CARD ============

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'text-emerald-600',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  color?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${color} bg-opacity-10`} style={{ backgroundColor: `${color === 'text-emerald-600' ? '#16A34A' : color === 'text-rose-600' ? '#E11D48' : color === 'text-amber-600' ? '#D97706' : '#3B82F6'}15` }}>
            <Icon className="h-5 w-5" style={{ color: color.includes('emerald') ? '#16A34A' : color.includes('rose') ? '#E11D48' : color.includes('amber') ? '#D97706' : '#3B82F6' }} />
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <span className="text-emerald-600 font-medium">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ MAIN COMPONENT ============

export function EmailManagement() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'templates' | 'campaigns'>('dashboard');
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [brevoConfigured, setBrevoConfigured] = useState(false);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRecipient, setFilterRecipient] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Selected log for detail view
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  const fetchLogs = async (p: number, module: string, status: string, recipient: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (module !== 'all') params.set('module', module);
      if (status !== 'all') params.set('status', status);
      if (recipient) params.set('recipient', recipient);
      const res = await fetch(`/api/email/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalLogs(data.total);
      }
    } catch { /* */ }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/email/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setBrevoConfigured(!!data.brevoConfigured);
      }
    } catch { /* */ }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/email/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
      }
    } catch { /* */ }
  };

  // Load initial data on mount
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      await fetchStats();
      await fetchTemplates();
      if (!cancelled) await fetchLogs(1, 'all', 'all', '');
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // Debounced recipient search
  const handleRecipientChange = (val: string) => {
    setFilterRecipient(val);
    if (searchTimeout) clearTimeout(searchTimeout);
    const t = setTimeout(() => {
      setPage(1);
      fetchLogs(1, filterModule, filterStatus, val);
    }, 400);
    setSearchTimeout(t);
  };

  const handleModuleChange = (val: string) => {
    setFilterModule(val);
    setPage(1);
    fetchLogs(1, val, filterStatus, filterRecipient);
  };

  const handleStatusChange = (val: string) => {
    setFilterStatus(val);
    setPage(1);
    fetchLogs(1, filterModule, val, filterRecipient);
  };

  const handleClearFilters = () => {
    setFilterModule('all');
    setFilterStatus('all');
    setFilterRecipient('');
    setPage(1);
    fetchLogs(1, 'all', 'all', '');
  };

  const handleRetry = async (logId: string) => {
    try {
      const res = await fetch('/api/email/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId }),
      });
      if (res.ok) {
        toast.success('Email queued for retry');
        fetchStats();
        fetchLogs(page, filterModule, filterStatus, filterRecipient);
      } else {
        toast.error('Failed to retry email');
      }
    } catch {
      toast.error('Failed to retry email');
    }
  };

  const modules = [...new Set(templates.map((t) => t.module))];
  const statuses = Object.keys(statusConfig);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Centralized email automation powered by Brevo</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <div className={`w-2 h-2 rounded-full ${brevoConfigured ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
            {brevoConfigured ? 'Brevo Connected' : 'Console Mode'}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {(['dashboard', 'logs', 'templates', 'campaigns'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all capitalize ${
              activeTab === tab
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ============ DASHBOARD TAB ============ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Sent Today"
                value={stats.sentToday}
                icon={Send}
                color="text-emerald-600"
              />
              <StatCard
                title="Failed Today"
                value={stats.failedToday}
                icon={AlertCircle}
                color="text-rose-600"
              />
              <StatCard
                title="Queue Size"
                value={stats.queueSize}
                icon={Clock}
                color="text-amber-600"
                subtitle={`${stats.scheduledCount} scheduled`}
              />
              <StatCard
                title="Total Sent"
                value={stats.totalSent}
                icon={Mail}
                color="text-blue-600"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Rates */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Delivery Rate</span>
                  </div>
                  <p className="text-3xl font-bold text-emerald-600">{stats.deliveryRate}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Eye className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Open Rate</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{stats.openRate}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <MousePointerClick className="h-4 w-4 text-teal-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Click Rate</span>
                  </div>
                  <p className="text-3xl font-bold text-teal-600">{stats.clickRate}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <MailX className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bounce Rate</span>
                  </div>
                  <p className="text-3xl font-bold text-red-600">{stats.bounceRate}%</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Emails */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Emails</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('logs')}>
                  View All <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Inbox className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">No emails sent yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                  {logs.slice(0, 10).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className="shrink-0">
                        <StatusBadge status={log.status} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{log.subject}</p>
                        <p className="text-xs text-muted-foreground truncate">{log.recipient}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {log.templateName && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{log.templateName}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============ LOGS TAB ============ */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span className="font-medium">Filters:</span>
                </div>
                <div className="flex flex-wrap gap-3 flex-1">
                  <div className="w-40">
                    <label className="text-xs text-muted-foreground mb-1 block">Module</label>
                    <Select value={filterModule} onValueChange={handleModuleChange}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Modules" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modules</SelectItem>
                        {modules.map((m) => (
                          <SelectItem key={m} value={m} className="capitalize">{m.replace(/-/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-40">
                    <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                    <Select value={filterStatus} onValueChange={handleStatusChange}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {statuses.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Recipient</label>
                    <Input
                      placeholder="Search by email..."
                      value={filterRecipient}
                      onChange={(e) => handleRecipientChange(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={handleClearFilters}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Recipient</TableHead>
                          <TableHead className="text-xs">Subject</TableHead>
                          <TableHead className="text-xs">Template</TableHead>
                          <TableHead className="text-xs">Module</TableHead>
                          <TableHead className="text-xs">Retries</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No email logs found</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          logs.map((log) => (
                            <TableRow
                              key={log.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setSelectedLog(log)}
                            >
                              <TableCell className="py-2.5">
                                <StatusBadge status={log.status} />
                              </TableCell>
                              <TableCell className="py-2.5 text-sm max-w-[180px] truncate">{log.recipient}</TableCell>
                              <TableCell className="py-2.5 text-sm font-medium max-w-[220px] truncate">{log.subject}</TableCell>
                              <TableCell className="py-2.5 text-xs text-muted-foreground max-w-[150px] truncate">{log.templateName || '—'}</TableCell>
                              <TableCell className="py-2.5">
                                {log.module && (
                                  <Badge variant="outline" className="text-xs capitalize">{log.module.replace(/-/g, ' ')}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="py-2.5 text-xs">
                                <span className={log.retryCount > 0 ? 'text-amber-600 font-medium' : ''}>
                                  {log.retryCount}/{log.maxRetries}
                                </span>
                              </TableCell>
                              <TableCell className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </TableCell>
                              <TableCell className="py-2.5 text-right">
                                {log.status === 'failed' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    onClick={(e) => { e.stopPropagation(); handleRetry(log.id); }}
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                    Retry
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Pagination */}
                  {totalLogs > 20 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, totalLogs)} of {totalLogs}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={page <= 1}
                          onClick={() => { const p = page - 1; setPage(p); fetchLogs(p, filterModule, filterStatus, filterRecipient); }}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={page * 20 >= totalLogs}
                          onClick={() => { const p = page + 1; setPage(p); fetchLogs(p, filterModule, filterStatus, filterRecipient); }}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============ TEMPLATES TAB ============ */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base">Available Templates</CardTitle>
                <Badge variant="secondary" className="ml-auto">{templates.length} templates</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {templates.map((tpl) => (
                  <div
                    key={tpl.identifier}
                    className="p-3.5 border rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all cursor-default"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-semibold">{tpl.name}</h4>
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">{tpl.module}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{tpl.description}</p>
                    {tpl.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tpl.variables.map((v) => (
                          <span key={v.name} className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono">
                            {v.name}
                            {v.required && <span className="text-rose-500">*</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============ CAMPAIGNS TAB ============ */}
      {activeTab === 'campaigns' && (
        <CampaignsTab brevoConfigured={brevoConfigured} />
      )}

      {/* ============ LOG DETAIL DIALOG ============ */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-emerald-600" />
              Email Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <StatusBadge status={selectedLog.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Recipient</span>
                  <span className="text-sm font-medium">{selectedLog.recipient}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Subject</span>
                  <span className="text-sm font-medium text-right max-w-[280px] truncate">{selectedLog.subject}</span>
                </div>
                {selectedLog.templateName && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Template</span>
                    <span className="text-sm">{selectedLog.templateName}</span>
                  </div>
                )}
                {selectedLog.module && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Module</span>
                    <Badge variant="outline" className="text-xs capitalize">{selectedLog.module.replace(/-/g, ' ')}</Badge>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Provider</span>
                  <span className="text-sm capitalize">{selectedLog.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Retries</span>
                  <span className="text-sm">{selectedLog.retryCount} / {selectedLog.maxRetries}</span>
                </div>
                {selectedLog.attachmentCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Attachments</span>
                    <span className="text-sm">{selectedLog.attachmentCount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Created</span>
                  <span className="text-xs">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                </div>
                {selectedLog.sentAt && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Sent</span>
                    <span className="text-xs">{new Date(selectedLog.sentAt).toLocaleString()}</span>
                  </div>
                )}
                {selectedLog.deliveredAt && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Delivered</span>
                    <span className="text-xs">{new Date(selectedLog.deliveredAt).toLocaleString()}</span>
                  </div>
                )}
                {selectedLog.openedAt && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Opened</span>
                    <span className="text-xs">{new Date(selectedLog.openedAt).toLocaleString()}</span>
                  </div>
                )}
                {selectedLog.providerMessageId && (
                  <div>
                    <span className="text-xs text-muted-foreground">Message ID</span>
                    <p className="text-xs font-mono mt-1 bg-muted p-2 rounded break-all">{selectedLog.providerMessageId}</p>
                  </div>
                )}
                {selectedLog.errorMessage && (
                  <div>
                    <span className="text-xs text-muted-foreground">Error</span>
                    <p className="text-xs text-rose-600 mt-1 bg-rose-50 dark:bg-rose-950 p-2 rounded break-all">{selectedLog.errorMessage}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                {selectedLog.status === 'failed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => { handleRetry(selectedLog.id); setSelectedLog(null); }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}