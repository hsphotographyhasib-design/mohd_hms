'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Megaphone,
  Plus,
  Send,
  Trash2,
  Eye,
  Loader2,
  RefreshCw,
  CalendarClock,
  Mail,
  User,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  Ban,
  PlayCircle,
  TestTube,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface BrevoCampaign {
  id: number;
  name: string;
  subject: string;
  type: string;
  status: string;
  sender?: { name: string; email: string };
  createdAt: string;
  modifiedAt?: string;
  scheduledAt?: string;
  sentAt?: string;
  statistics?: {
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    spam: number;
    unsubsribed: number;
    uniqueOpens?: number;
    uniqueClicks?: number;
  };
  recipients?: { listIds: number[] };
  toField?: string;
  replyTo?: string;
  htmlContent?: string;
}

interface CampaignFormState {
  name: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  htmlContent: string;
  listIds: string;
  toField: string;
  scheduledAt: string;
  type: string;
  sendMode: 'list' | 'email';
}

const emptyForm: CampaignFormState = {
  name: '',
  subject: '',
  senderName: '',
  senderEmail: '',
  replyTo: '',
  htmlContent: '',
  listIds: '',
  toField: '',
  scheduledAt: '',
  type: 'classic',
  sendMode: 'list',
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText },
  scheduled: { label: 'Scheduled', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: CalendarClock },
  sent: { label: 'Sent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  inProcess: { label: 'Processing', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Loader2 },
  suspended: { label: 'Suspended', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: Ban },
  archive: { label: 'Archived', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Ban },
  queued: { label: 'Queued', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Clock },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, color: 'bg-muted text-muted-foreground border', icon: AlertCircle };
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`gap-1 text-xs font-medium ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function formatCampaignDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ============ CAMPAIGNS TAB COMPONENT ============

export function CampaignsTab({ brevoConfigured }: { brevoConfigured: boolean }) {
  const [campaigns, setCampaigns] = useState<BrevoCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CampaignFormState>(emptyForm);
  const [creating, setCreating] = useState(false);

  // Test email dialog
  const [showTest, setShowTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testCampaignId, setTestCampaignId] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<BrevoCampaign | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sending
  const [sendingId, setSendingId] = useState<number | null>(null);

  // Detail dialog
  const [detailCampaign, setDetailCampaign] = useState<BrevoCampaign | null>(null);

  const fetchCampaigns = useCallback(async (p: number = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', offset: String(p * 50) });
      const res = await fetch(`/api/email/campaigns?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        setTotalCount(data.count || 0);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to fetch campaigns');
      }
    } catch {
      toast.error('Network error fetching campaigns');
    }
    setLoading(false);
  }, []);

  const initialized = React.useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (!brevoConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ limit: '50', offset: '0' });
        const res = await fetch(`/api/email/campaigns?${params}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.campaigns || []);
          setTotalCount(data.count || 0);
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || 'Failed to fetch campaigns');
        }
      } catch {
        if (!cancelled) toast.error('Network error fetching campaigns');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // ============ Handlers ============

  const handleCreate = async () => {
    setCreating(true);
    try {
      const listIdsArr = form.sendMode === 'list' && form.listIds.trim()
        ? form.listIds.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        subject: form.subject.trim(),
        senderName: form.senderName.trim(),
        senderEmail: form.senderEmail.trim(),
        htmlContent: form.htmlContent,
        type: form.type,
        replyTo: form.replyTo.trim() || undefined,
        scheduledAt: form.scheduledAt || undefined,
      };

      if (form.sendMode === 'list' && listIdsArr.length > 0) {
        payload.listIds = listIdsArr;
      } else if (form.sendMode === 'email' && form.toField.trim()) {
        payload.toField = form.toField.trim();
      }

      const res = await fetch('/api/email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Campaign "${data.campaign?.name || form.name}" created successfully!`);
        setShowCreate(false);
        setForm(emptyForm);
        fetchCampaigns(0);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to create campaign');
      }
    } catch {
      toast.error('Network error creating campaign');
    }
    setCreating(false);
  };

  const handleSendNow = async (id: number, name: string) => {
    setSendingId(id);
    try {
      const res = await fetch(`/api/email/campaigns/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sendNow' }),
      });
      if (res.ok) {
        toast.success(`Campaign "${name}" is now sending!`);
        fetchCampaigns(page);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to send campaign');
      }
    } catch {
      toast.error('Network error sending campaign');
    }
    setSendingId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/email/campaigns/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Campaign "${deleteTarget.name}" deleted`);
        setDeleteTarget(null);
        fetchCampaigns(page);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to delete campaign');
      }
    } catch {
      toast.error('Network error deleting campaign');
    }
    setDeleting(false);
  };

  const handleTestSend = async () => {
    if (!testCampaignId || !testEmail.trim()) return;
    setTesting(true);
    try {
      const emails = testEmail.split(',').map((e) => e.trim()).filter(Boolean);
      const res = await fetch(`/api/email/campaigns/${testCampaignId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', emails }),
      });
      if (res.ok) {
        toast.success('Test email sent!');
        setShowTest(false);
        setTestEmail('');
        setTestCampaignId(null);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to send test');
      }
    } catch {
      toast.error('Network error sending test');
    }
    setTesting(false);
  };

  const openTestDialog = (campaign: BrevoCampaign) => {
    setTestCampaignId(campaign.id);
    setTestEmail('');
    setShowTest(true);
  };

  // ============ Render ============

  if (!brevoConfigured) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-amber-500" />
          <h3 className="font-semibold mb-1">Brevo Not Configured</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Set the <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">BREVO_API_KEY</code> environment variable to manage email campaigns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-semibold">Email Campaigns</h2>
          {totalCount > 0 && (
            <Badge variant="secondary">{totalCount} campaigns</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchCampaigns(page)} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-3.5 w-3.5" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Mail className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm font-medium mb-1">No campaigns yet</p>
              <p className="text-xs mb-4">Create your first email campaign to get started</p>
              <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-3.5 w-3.5" />
                Create Campaign
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Campaign</TableHead>
                      <TableHead className="text-xs">Subject</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Created</TableHead>
                      <TableHead className="text-xs">Stats</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id} className="group">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                              <Megaphone className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[200px]">{campaign.name}</p>
                              {campaign.sender && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {campaign.sender.name} &lt;{campaign.sender.email}&gt;
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-sm max-w-[200px] truncate">
                          {campaign.subject}
                        </TableCell>
                        <TableCell className="py-3">
                          <StatusBadge status={campaign.status} />
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-xs capitalize">
                            {campaign.type || 'classic'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatCampaignDate(campaign.createdAt)}
                          {campaign.scheduledAt && campaign.status === 'scheduled' && (
                            <span className="block text-amber-600">
                              Scheduled: {formatCampaignDate(campaign.scheduledAt)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          {campaign.statistics ? (
                            <div className="flex gap-2 text-xs">
                              <span className="text-emerald-600">{campaign.statistics.delivered} sent</span>
                              <span className="text-blue-600">{campaign.statistics.opened} opens</span>
                              <span className="text-teal-600">{campaign.statistics.clicked} clicks</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="View Details"
                              onClick={() => setDetailCampaign(campaign)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700"
                                title="Send Test"
                                onClick={() => openTestDialog(campaign)}
                              >
                                <TestTube className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700"
                                title="Send Now"
                                disabled={sendingId === campaign.id}
                                onClick={() => handleSendNow(campaign.id, campaign.name)}
                              >
                                {sendingId === campaign.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <PlayCircle className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                            {(campaign.status === 'draft' || campaign.status === 'suspended' || campaign.status === 'archive') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                                title="Delete"
                                onClick={() => setDeleteTarget(campaign)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalCount > 50 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Showing {page * 50 + 1}–{Math.min((page + 1) * 50, totalCount)} of {totalCount}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={page <= 0}
                      onClick={() => { const p = page - 1; setPage(p); fetchCampaigns(p); }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={(page + 1) * 50 >= totalCount}
                      onClick={() => { const p = page + 1; setPage(p); fetchCampaigns(p); }}
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

      {/* ============ CREATE CAMPAIGN DIALOG ============ */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); setForm(emptyForm); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-600" />
              Create Email Campaign
            </DialogTitle>
            <DialogDescription>
              Create a new email campaign via the Brevo API. The campaign will be saved as a draft.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Campaign Name */}
            <div className="space-y-1.5">
              <Label htmlFor="camp-name" className="text-sm font-medium">
                Campaign Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="camp-name"
                placeholder="e.g. Monthly Newsletter - January"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label htmlFor="camp-subject" className="text-sm font-medium">
                Email Subject <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="camp-subject"
                placeholder="e.g. Your January Updates"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>

            {/* Campaign Type */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Campaign Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="trigger">Trigger</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sender Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="camp-sender-name" className="text-sm font-medium">
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Sender Name</span>
                </Label>
                <Input
                  id="camp-sender-name"
                  placeholder="e.g. My Company"
                  value={form.senderName}
                  onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="camp-sender-email" className="text-sm font-medium">
                  <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Sender Email <span className="text-rose-500">*</span></span>
                </Label>
                <Input
                  id="camp-sender-email"
                  type="email"
                  placeholder="e.g. noreply@mycompany.com"
                  value={form.senderEmail}
                  onChange={(e) => setForm((f) => ({ ...f, senderEmail: e.target.value }))}
                />
              </div>
            </div>

            {/* Reply-To */}
            <div className="space-y-1.5">
              <Label htmlFor="camp-replyto" className="text-sm font-medium">Reply-To Email (optional)</Label>
              <Input
                id="camp-replyto"
                type="email"
                placeholder="e.g. support@mycompany.com"
                value={form.replyTo}
                onChange={(e) => setForm((f) => ({ ...f, replyTo: e.target.value }))}
              />
            </div>

            {/* Recipients Mode Toggle */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Recipients</Label>
              <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, sendMode: 'list' }))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    form.sendMode === 'list'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Contact Lists
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, sendMode: 'email' }))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    form.sendMode === 'email'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Email Addresses
                </button>
              </div>
            </div>

            {form.sendMode === 'list' ? (
              <div className="space-y-1.5">
                <Label htmlFor="camp-lists" className="text-sm font-medium">List IDs (comma-separated)</Label>
                <Input
                  id="camp-lists"
                  placeholder="e.g. 2, 7"
                  value={form.listIds}
                  onChange={(e) => setForm((f) => ({ ...f, listIds: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Enter Brevo contact list IDs separated by commas. Create lists in your Brevo dashboard first.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="camp-to" className="text-sm font-medium">To Field</Label>
                <Input
                  id="camp-to"
                  placeholder={'e.g. {"email":"test@example.com","name":"John"}'}
                  value={form.toField}
                  onChange={(e) => setForm((f) => ({ ...f, toField: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {'JSON format for recipient(s). Example: '}
                  <code className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono">
                    {`{"email":"a@b.com","name":"A"}`}
                  </code>
                </p>
              </div>
            )}

            {/* Schedule */}
            <div className="space-y-1.5">
              <Label htmlFor="camp-schedule" className="text-sm font-medium">
                <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Schedule (optional)</span>
              </Label>
              <Input
                id="camp-schedule"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value ? new Date(e.target.value).toISOString().replace('Z', '+00:00') : '' }))}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to save as draft. Set a future date to schedule sending.
              </p>
            </div>

            {/* HTML Content */}
            <div className="space-y-1.5">
              <Label htmlFor="camp-html" className="text-sm font-medium">
                HTML Content <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="camp-html"
                placeholder="<html><body><h1>Hello!</h1><p>Your content here...</p></body></html>"
                value={form.htmlContent}
                onChange={(e) => setForm((f) => ({ ...f, htmlContent: e.target.value }))}
                className="min-h-[180px] font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Enter the full HTML content for the campaign email.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { setShowCreate(false); setForm(emptyForm); }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !form.name.trim() || !form.subject.trim() || !form.htmlContent.trim() || !form.senderEmail.trim()}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ TEST EMAIL DIALOG ============ */}
      <Dialog open={showTest} onOpenChange={(open) => { if (!open) { setShowTest(false); setTestEmail(''); setTestCampaignId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-amber-600" />
              Send Test Email
            </DialogTitle>
            <DialogDescription>
              Send a test copy of this campaign to verify how it looks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="test-email" className="text-sm font-medium">Email Address(es)</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="email@example.com (comma-separate for multiple)"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowTest(false); setTestEmail(''); }}>
              Cancel
            </Button>
            <Button
              onClick={handleTestSend}
              disabled={testing || !testEmail.trim()}
              className="gap-1.5"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ DELETE CONFIRM DIALOG ============ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============ CAMPAIGN DETAIL DIALOG ============ */}
      <Dialog open={!!detailCampaign} onOpenChange={() => setDetailCampaign(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-600" />
              Campaign Details
            </DialogTitle>
          </DialogHeader>
          {detailCampaign && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <StatusBadge status={detailCampaign.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <span className="text-sm font-medium text-right max-w-[280px] truncate">{detailCampaign.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Subject</span>
                  <span className="text-sm text-right max-w-[280px]">{detailCampaign.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <Badge variant="outline" className="text-xs capitalize">{detailCampaign.type || 'classic'}</Badge>
                </div>
                {detailCampaign.sender && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Sender</span>
                    <span className="text-sm">{detailCampaign.sender.name} &lt;{detailCampaign.sender.email}&gt;</span>
                  </div>
                )}
                {detailCampaign.replyTo && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Reply-To</span>
                    <span className="text-sm">{detailCampaign.replyTo}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Created</span>
                  <span className="text-xs">{formatCampaignDate(detailCampaign.createdAt)}</span>
                </div>
                {detailCampaign.modifiedAt && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Modified</span>
                    <span className="text-xs">{formatCampaignDate(detailCampaign.modifiedAt)}</span>
                  </div>
                )}
                {detailCampaign.scheduledAt && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Scheduled</span>
                    <span className="text-xs">{formatCampaignDate(detailCampaign.scheduledAt)}</span>
                  </div>
                )}
                {detailCampaign.sentAt && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Sent At</span>
                    <span className="text-xs">{formatCampaignDate(detailCampaign.sentAt)}</span>
                  </div>
                )}
                {detailCampaign.recipients && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">List IDs</span>
                    <span className="text-sm">{detailCampaign.recipients.listIds?.join(', ') || '—'}</span>
                  </div>
                )}
              </div>

              {/* Statistics */}
              {detailCampaign.statistics && (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Statistics</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-emerald-700">{detailCampaign.statistics.delivered}</p>
                      <p className="text-[10px] text-emerald-600 font-medium">Delivered</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-blue-700">{detailCampaign.statistics.opened}</p>
                      <p className="text-[10px] text-blue-600 font-medium">Opened</p>
                    </div>
                    <div className="bg-teal-50 dark:bg-teal-950 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-teal-700">{detailCampaign.statistics.clicked}</p>
                      <p className="text-[10px] text-teal-600 font-medium">Clicked</p>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-950 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-rose-700">{detailCampaign.statistics.bounced}</p>
                      <p className="text-[10px] text-rose-600 font-medium">Bounced</p>
                    </div>
                    {detailCampaign.statistics.spam > 0 && (
                      <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-bold text-orange-700">{detailCampaign.statistics.spam}</p>
                        <p className="text-[10px] text-orange-600 font-medium">Spam</p>
                      </div>
                    )}
                    {detailCampaign.statistics.unsubsribed > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-bold text-gray-700">{detailCampaign.statistics.unsubsribed}</p>
                        <p className="text-[10px] text-gray-600 font-medium">Unsubscribed</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                {(detailCampaign.status === 'draft' || detailCampaign.status === 'scheduled') && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => { openTestDialog(detailCampaign); setDetailCampaign(null); }}
                    >
                      <TestTube className="h-3.5 w-3.5" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      disabled={sendingId === detailCampaign.id}
                      onClick={() => { handleSendNow(detailCampaign.id, detailCampaign.name); setDetailCampaign(null); }}
                    >
                      {sendingId === detailCampaign.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PlayCircle className="h-3.5 w-3.5" />
                      )}
                      Send Now
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => setDetailCampaign(null)}>
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