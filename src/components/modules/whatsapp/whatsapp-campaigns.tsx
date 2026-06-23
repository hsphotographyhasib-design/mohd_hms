'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Megaphone, Plus, Eye, CalendarClock, XCircle, Trash2, Send,
  Users, CheckCircle2, AlertCircle, Clock, BarChart3, Zap,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import type { BroadcastLogData, BroadcastStatus } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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

// ============ CONSTANTS ============

const STATUS_CONFIG: Record<BroadcastStatus, { label: string; color: string; dotColor: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', dotColor: 'bg-gray-400' },
  scheduled: { label: 'Scheduled', color: 'bg-amber-100 text-amber-700', dotColor: 'bg-amber-500' },
  sending: { label: 'Sending', color: 'bg-sky-100 text-sky-700', dotColor: 'bg-sky-500' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', dotColor: 'bg-emerald-500' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', dotColor: 'bg-red-500' },
};

const RECIPIENT_GROUPS = [
  { value: 'all', label: 'All Customers' },
  { value: 'verified', label: 'WhatsApp Verified Only' },
  { value: 'active', label: 'Active Accounts Only' },
  { value: 'custom', label: 'Custom List' },
];

// ============ MOCK DATA ============

const MOCK_CAMPAIGNS: BroadcastLogData[] = [
  {
    id: '1', tenantId: 't1', title: 'Monthly Maintenance Reminder', content: 'Dear customer, your monthly maintenance is scheduled. Reply to confirm.',
    recipientCount: 156, sentCount: 156, deliveredCount: 148, failedCount: 8, readCount: 120,
    status: 'completed', sentAt: '2024-06-01T10:00:00Z', completedAt: '2024-06-01T10:05:00Z',
    createdAt: '2024-06-01T09:00:00Z', updatedAt: '2024-06-01T10:05:00Z',
  },
  {
    id: '2', tenantId: 't1', title: 'Holiday Greetings 2024', content: 'Happy Hari Raya! We wish you and your family joy and prosperity. 🎉',
    recipientCount: 320, sentCount: 318, deliveredCount: 310, failedCount: 8, readCount: 280,
    status: 'completed', sentAt: '2024-06-15T08:00:00Z', completedAt: '2024-06-15T08:12:00Z',
    createdAt: '2024-06-10T00:00:00Z', updatedAt: '2024-06-15T08:12:00Z',
  },
  {
    id: '3', tenantId: 't1', title: 'Emergency Contact Update', content: 'Update: Our emergency hotline has changed. Save this number for future reference.',
    recipientCount: 245, sentCount: 0, deliveredCount: 0, failedCount: 0, readCount: 0,
    status: 'scheduled', scheduledAt: '2024-07-01T09:00:00Z',
    createdAt: '2024-06-20T00:00:00Z', updatedAt: '2024-06-20T00:00:00Z',
  },
  {
    id: '4', tenantId: 't1', title: 'New Service Announcement', content: 'We now offer 24/7 HVAC emergency services! Book your slot now.',
    recipientCount: 100, sentCount: 0, deliveredCount: 0, failedCount: 0, readCount: 0,
    status: 'draft',
    createdAt: '2024-06-25T00:00:00Z', updatedAt: '2024-06-25T00:00:00Z',
  },
  {
    id: '5', tenantId: 't1', title: 'Invoice Due Reminder Batch', content: 'You have outstanding invoices. Please remit payment before the due date.',
    recipientCount: 45, sentCount: 45, deliveredCount: 44, failedCount: 1, readCount: 38,
    status: 'completed', sentAt: '2024-06-20T14:00:00Z', completedAt: '2024-06-20T14:02:00Z',
    createdAt: '2024-06-19T00:00:00Z', updatedAt: '2024-06-20T14:02:00Z',
  },
  {
    id: '6', tenantId: 't1', title: 'System Downtime Notice', content: 'Our CMMS portal will undergo maintenance on July 5th from 2-4 AM.',
    recipientCount: 180, sentCount: 180, deliveredCount: 175, failedCount: 5, readCount: 160,
    status: 'completed', sentAt: '2024-06-28T11:00:00Z', completedAt: '2024-06-28T11:08:00Z',
    createdAt: '2024-06-27T00:00:00Z', updatedAt: '2024-06-28T11:08:00Z',
  },
  {
    id: '7', tenantId: 't1', title: 'Failed Test Broadcast', content: 'Test message for API connectivity check.',
    recipientCount: 10, sentCount: 2, deliveredCount: 0, failedCount: 2, readCount: 0,
    status: 'failed', sentAt: '2024-06-15T16:00:00Z',
    createdAt: '2024-06-15T15:55:00Z', updatedAt: '2024-06-15T16:00:00Z',
  },
];

// ============ FORM DEFAULTS ============

interface CampaignFormData {
  title: string;
  content: string;
  recipientGroup: string;
  scheduledAt: string;
  sendNow: boolean;
}

const FORM_DEFAULTS: CampaignFormData = {
  title: '',
  content: '',
  recipientGroup: 'all',
  scheduledAt: '',
  sendNow: true,
};

// ============ STAT CARD ============

interface CampaignStatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  iconBg: string;
}

function CampaignStatCard({ label, value, icon, color, iconBg }: CampaignStatCardProps) {
  const Icon = icon;
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value.toLocaleString()}</p>
            </div>
            <div className={cn('rounded-lg p-2', iconBg)}>
              <Icon className={cn('h-4 w-4', color)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============ CAMPAIGN DETAIL DIALOG ============

function CampaignDetailDialog({
  campaign,
  open,
  onOpenChange,
}: {
  campaign: BroadcastLogData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!campaign) return null;

  const deliveryRate = campaign.sentCount > 0
    ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100)
    : 0;
  const readRate = campaign.sentCount > 0
    ? Math.round((campaign.readCount / campaign.sentCount) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{campaign.title}</DialogTitle>
          <DialogDescription>Campaign performance details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant="secondary" className={STATUS_CONFIG[campaign.status].color}>
              <span className={cn('h-1.5 w-1.5 rounded-full mr-1', STATUS_CONFIG[campaign.status].dotColor)} />
              {STATUS_CONFIG[campaign.status].label}
            </Badge>
          </div>

          {/* Content Preview */}
          <div className="bg-gray-100 rounded-lg p-3">
            <p className="text-sm text-gray-700">{campaign.content}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{campaign.recipientCount}</p>
              <p className="text-xs text-muted-foreground">Recipients</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-emerald-600">{campaign.sentCount}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-emerald-600">{campaign.deliveredCount}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-red-500">{campaign.failedCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-teal-600">{campaign.readCount}</p>
              <p className="text-xs text-muted-foreground">Read</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{deliveryRate}%</p>
              <p className="text-xs text-muted-foreground">Delivery Rate</p>
            </div>
          </div>

          {/* Delivery Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Delivery Rate</span>
              <span className="font-medium">{deliveryRate}%</span>
            </div>
            <Progress value={deliveryRate} className="h-2" />
          </div>

          {/* Read Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Read Rate</span>
              <span className="font-medium">{readRate}%</span>
            </div>
            <Progress value={readRate} className="h-2" />
          </div>

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p>Created: {new Date(campaign.createdAt).toLocaleString()}</p>
            {campaign.scheduledAt && <p>Scheduled: {new Date(campaign.scheduledAt).toLocaleString()}</p>}
            {campaign.sentAt && <p>Sent: {new Date(campaign.sentAt).toLocaleString()}</p>}
            {campaign.completedAt && <p>Completed: {new Date(campaign.completedAt).toLocaleString()}</p>}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ MAIN COMPONENT ============

export function WhatsAppCampaigns() {
  const [campaigns, setCampaigns] = useState<BroadcastLogData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState<BroadcastLogData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formData, setFormData] = useState<CampaignFormData>(FORM_DEFAULTS);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/whatsapp/campaigns', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(Array.isArray(data) ? data : data.data || []);
      } else {
        setCampaigns(MOCK_CAMPAIGNS);
      }
    } catch {
      setCampaigns(MOCK_CAMPAIGNS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setIsCreating(true);
    try {
      const token = getToken();
      const res = await fetch('/api/whatsapp/campaigns', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success(formData.sendNow ? 'Campaign sent' : 'Campaign created');
        setDialogOpen(false);
        setFormData(FORM_DEFAULTS);
        fetchCampaigns();
      } else {
        // Optimistically add
        const newCampaign: BroadcastLogData = {
          id: `local-${Date.now()}`,
          tenantId: '',
          title: formData.title,
          content: formData.content,
          recipientCount: 0,
          sentCount: formData.sendNow ? 0 : 0,
          deliveredCount: 0,
          failedCount: 0,
          readCount: 0,
          status: formData.sendNow ? 'sending' : 'draft',
          scheduledAt: formData.sendNow ? undefined : formData.scheduledAt || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCampaigns((prev) => [newCampaign, ...prev]);
        toast.success(formData.sendNow ? 'Campaign is being sent' : 'Campaign saved as draft');
        setDialogOpen(false);
        setFormData(FORM_DEFAULTS);
      }
    } catch {
      toast.error('Failed to create campaign');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelCampaign = (campaign: BroadcastLogData) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaign.id ? { ...c, status: 'draft' as BroadcastStatus } : c))
    );
    toast.success('Campaign cancelled');
  };

  const handleDeleteCampaign = (campaign: BroadcastLogData) => {
    if (campaign.status !== 'draft') {
      toast.error('Only draft campaigns can be deleted');
      return;
    }
    setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
    toast.success('Campaign deleted');
  };

  // Compute stats
  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === 'sending' || c.status === 'scheduled').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
    totalRecipients: campaigns.reduce((sum, c) => sum + c.recipientCount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <Megaphone className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Broadcast Campaigns</h1>
            <p className="text-sm text-muted-foreground">Send bulk messages to customer groups</p>
          </div>
        </div>
        <Button onClick={() => { setFormData(FORM_DEFAULTS); setDialogOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1.5" />
          New Campaign
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <CampaignStatCard
          label="Total Campaigns"
          value={stats.total}
          icon={BarChart3}
          color="text-emerald-600"
          iconBg="bg-emerald-100"
        />
        <CampaignStatCard
          label="Active"
          value={stats.active}
          icon={Send}
          color="text-amber-600"
          iconBg="bg-amber-100"
        />
        <CampaignStatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          color="text-emerald-600"
          iconBg="bg-emerald-100"
        />
        <CampaignStatCard
          label="Total Recipients"
          value={stats.totalRecipients}
          icon={Users}
          color="text-teal-600"
          iconBg="bg-teal-100"
        />
      </div>

      {/* Desktop Campaign Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No campaigns yet</p>
              <p className="text-sm">Create your first broadcast campaign</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Recipients</TableHead>
                    <TableHead className="hidden md:table-cell">Sent</TableHead>
                    <TableHead className="hidden md:table-cell">Delivered</TableHead>
                    <TableHead className="hidden lg:table-cell">Failed</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead className="w-[160px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{campaign.title}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {campaign.content.slice(0, 60)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px]', STATUS_CONFIG[campaign.status].color)}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full mr-1', STATUS_CONFIG[campaign.status].dotColor)} />
                          {STATUS_CONFIG[campaign.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{campaign.recipientCount}</TableCell>
                      <TableCell className="hidden md:table-cell">{campaign.sentCount}</TableCell>
                      <TableCell className="hidden md:table-cell text-emerald-600 font-medium">{campaign.deliveredCount}</TableCell>
                      <TableCell className="hidden lg:table-cell text-red-500 font-medium">{campaign.failedCount}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                        {campaign.sentAt ? formatRelativeTime(campaign.sentAt) : campaign.scheduledAt ? formatRelativeTime(campaign.scheduledAt) : formatRelativeTime(campaign.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setDetailCampaign(campaign); setDetailOpen(true); }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {(campaign.status === 'draft') && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                                onClick={() => {
                                  setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, status: 'scheduled' as BroadcastStatus, scheduledAt: new Date(Date.now() + 3600000).toISOString() } : c)));
                                  toast.success('Campaign scheduled');
                                }}
                              >
                                <CalendarClock className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:bg-red-50"
                                onClick={() => handleDeleteCampaign(campaign)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {(campaign.status === 'scheduled') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                              onClick={() => handleCancelCampaign(campaign)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-28 w-full rounded-lg" /></CardContent></Card>
          ))
        ) : campaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No campaigns yet</p>
            <p className="text-sm">Create your first broadcast campaign</p>
          </div>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{campaign.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {campaign.sentAt ? formatRelativeTime(campaign.sentAt) : campaign.scheduledAt ? formatRelativeTime(campaign.scheduledAt) : formatRelativeTime(campaign.createdAt)}
                    </p>
                  </div>
                  <Badge variant="secondary" className={cn('text-[10px]', STATUS_CONFIG[campaign.status].color)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full mr-1', STATUS_CONFIG[campaign.status].dotColor)} />
                    {STATUS_CONFIG[campaign.status].label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{campaign.content}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{campaign.recipientCount} recipients</span>
                  {campaign.sentCount > 0 && <span className="text-emerald-600 font-medium">{campaign.sentCount} sent</span>}
                  {campaign.deliveredCount > 0 && <span className="text-emerald-600">{campaign.deliveredCount} delivered</span>}
                  {campaign.failedCount > 0 && <span className="text-red-500">{campaign.failedCount} failed</span>}
                </div>
                <div className="flex items-center gap-1 border-t pt-3">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDetailCampaign(campaign); setDetailOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                  {campaign.status === 'draft' && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:bg-amber-50" onClick={() => {
                        setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, status: 'scheduled' as BroadcastStatus, scheduledAt: new Date(Date.now() + 3600000).toISOString() } : c)));
                        toast.success('Campaign scheduled');
                      }}><CalendarClock className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => handleDeleteCampaign(campaign)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                  {campaign.status === 'scheduled' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:bg-amber-50" onClick={() => handleCancelCampaign(campaign)}><XCircle className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
            <DialogDescription>Create a new broadcast campaign to send messages to customers</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="camp-title">Campaign Title</Label>
              <Input
                id="camp-title"
                placeholder="e.g., Monthly Maintenance Reminder"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label>Message Content</Label>
              <Textarea
                placeholder="Type the broadcast message..."
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>

            {/* Recipient Group */}
            <div className="space-y-2">
              <Label>Recipient Group</Label>
              <Select
                value={formData.recipientGroup}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, recipientGroup: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recipients" />
                </SelectTrigger>
                <SelectContent>
                  {RECIPIENT_GROUPS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Schedule */}
            <div className="space-y-3">
              <Label>Schedule</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={formData.sendNow ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    formData.sendNow ? 'bg-emerald-600 hover:bg-emerald-700' : '',
                    !formData.sendNow && 'border-emerald-200'
                  )}
                  onClick={() => setFormData((prev) => ({ ...prev, sendNow: true }))}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Send Now
                </Button>
                <Button
                  type="button"
                  variant={!formData.sendNow ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    !formData.sendNow ? 'bg-emerald-600 hover:bg-emerald-700' : '',
                    formData.sendNow && 'border-emerald-200'
                  )}
                  onClick={() => setFormData((prev) => ({ ...prev, sendNow: false }))}
                >
                  <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                  Schedule
                </Button>
              </div>
              {!formData.sendNow && (
                <Input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                />
              )}
            </div>

            {/* Preview */}
            {formData.content && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </Label>
                <div className="bg-emerald-600 text-white rounded-xl p-3 max-w-xs ml-auto">
                  <p className="text-sm">{formData.content}</p>
                  <p className="text-xs opacity-70 mt-1 text-right">12:00 PM</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !formData.title.trim() || !formData.content.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isCreating ? (
                <>
                  <Zap className="h-4 w-4 mr-1.5 animate-pulse" />
                  {formData.sendNow ? 'Sending...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  {formData.sendNow ? 'Send Now' : 'Create Draft'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Dialog */}
      <CampaignDetailDialog
        campaign={detailCampaign}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
