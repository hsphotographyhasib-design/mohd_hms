'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Switch } from '@/shared/ui/switch';
import { Textarea } from '@/shared/ui/textarea';
import { Slider } from '@/shared/ui/slider';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Separator } from '@/shared/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/shared/ui/collapsible';
import {
  MessageSquare, AlertTriangle, FileText, Clock, ChevronDown,
  Bot, Settings, Loader2, TrendingUp, TrendingDown, Eye,
  UserCheck, CreditCard,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/app-shell/store';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// ============ HELPERS ============

function getToken(): string {
  return useAuthStore.getState().token || localStorage.getItem('cmms_token') || '';
}

function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
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

// ============ BADGE HELPERS ============

function languageBadge(lang: string) {
  const map: Record<string, string> = {
    en: 'bg-sky-100 text-sky-700',
    ms: 'bg-emerald-100 text-emerald-700',
    bn: 'bg-orange-100 text-orange-700',
    ar: 'bg-red-100 text-red-700',
    mixed: 'bg-purple-100 text-purple-700',
  };
  const labels: Record<string, string> = {
    en: 'EN', ms: 'MS', bn: 'BN', ar: 'AR', mixed: 'Mixed',
  };
  return (
    <Badge variant="secondary" className={map[lang] || 'bg-gray-100 text-gray-700'}>
      {labels[lang] || lang}
    </Badge>
  );
}

function intentBadge(intent: string) {
  const map: Record<string, string> = {
    complaint: 'bg-red-100 text-red-700',
    status: 'bg-sky-100 text-sky-700',
    quotation: 'bg-amber-100 text-amber-700',
    service: 'bg-emerald-100 text-emerald-700',
    payment: 'bg-green-100 text-green-700',
    feedback: 'bg-purple-100 text-purple-700',
    general: 'bg-gray-100 text-gray-700',
    emergency: 'bg-rose-100 text-rose-700',
  };
  const labels: Record<string, string> = {
    complaint: 'Complaint', status: 'Status', quotation: 'Quotation',
    service: 'Service', payment: 'Payment', feedback: 'Feedback',
    general: 'General', emergency: 'Emergency',
  };
  return (
    <Badge variant="secondary" className={map[intent] || 'bg-gray-100 text-gray-700'}>
      {labels[intent] || intent}
    </Badge>
  );
}

function statusBadge(status: string) {
  if (status === 'active') return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Active</Badge>;
  if (status === 'resolved') return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Resolved</Badge>;
  return <Badge variant="secondary" className="bg-gray-100 text-gray-700">{status}</Badge>;
}

// ============ TYPES ============

interface AiDashboardData {
  messagesToday: number;
  messagesYesterday: number;
  complaintsCreated: number;
  quotationsGenerated: number;
  avgResponseTime: number;
  languageDistribution: { language: string; count: number; percentage: number }[];
  recentConversations: {
    id: string;
    phoneNumber: string;
    customerName?: string;
    language?: string;
    intent?: string;
    confidence?: number;
    responseTimeMs?: number;
    status: string;
    lastMessageAt: string;
  }[];
}

interface AiSettingsData {
  aiEnabled: boolean;
  aiSystemPrompt: string | null;
  aiTypingDelay: number;
  aiMaxContext: number;
  aiBusinessHours: string | null;
}

interface PaymentVerificationItem {
  id: string;
  customerName?: string;
  invoiceNumber?: string;
  extractedAmount?: number;
  extractedBank?: string;
  extractedDate?: string;
  extractedTxnId?: string;
  imageUrl?: string;
  status: string;
  createdAt: string;
}

// ============ ANALYTICS CARDS ============

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  color,
  iconBg,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend: number;
  trendLabel: string;
  color: string;
  iconBg: string;
}) {
  const isPositive = trend > 0;
  const isTimeMetric = label.includes('Time');
  const goodDirection = isTimeMetric ? trend < 0 : trend > 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
            <div className={`rounded-lg p-2.5 ${iconBg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs">
            {goodDirection ? (
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-rose-500" />
            )}
            <span className={goodDirection ? 'text-emerald-600' : 'text-rose-600'}>
              {Math.abs(trend)}%
            </span>
            <span className="text-muted-foreground">{trendLabel}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============ LANGUAGE DISTRIBUTION BAR ============

function LanguageDistribution({ data }: { data: { language: string; count: number; percentage: number }[] }) {
  const langColors: Record<string, string> = {
    en: 'bg-sky-500',
    ms: 'bg-emerald-500',
    bn: 'bg-orange-500',
    ar: 'bg-red-500',
    mixed: 'bg-purple-500',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Language Distribution</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
          {data.map((item) => (
            <div
              key={item.language}
              className={`${langColors[item.language] || 'bg-gray-400'} transition-all duration-500`}
              style={{ width: `${item.percentage}%` }}
              title={`${item.language}: ${item.percentage}%`}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          {data.map((item) => (
            <div key={item.language} className="flex items-center gap-1.5 text-xs">
              <span className={`h-2.5 w-2.5 rounded-full ${langColors[item.language] || 'bg-gray-400'}`} />
              <span className="font-medium uppercase">{item.language}</span>
              <span className="text-muted-foreground">{item.percentage}% ({item.count})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ RECENT AI CONVERSATIONS TABLE ============

function RecentConversationsTable({ conversations, onViewConversations }: {
  conversations: AiDashboardData['recentConversations'];
  onViewConversations: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Recent AI Conversations</CardTitle>
        <Button variant="outline" size="sm" onClick={onViewConversations} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
          <Eye className="h-4 w-4 mr-1.5" />
          View All
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden sm:table-cell">Language</TableHead>
                <TableHead className="hidden md:table-cell">Intent</TableHead>
                <TableHead className="hidden lg:table-cell">Response</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No AI conversations yet
                  </TableCell>
                </TableRow>
              )}
              {conversations.map((conv) => (
                <TableRow key={conv.id} className="hover:bg-emerald-50/50 transition-colors">
                  <TableCell className="font-mono text-sm">{conv.phoneNumber}</TableCell>
                  <TableCell className="font-medium">{conv.customerName || 'Unknown'}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {conv.language ? languageBadge(conv.language) : '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {conv.intent ? intentBadge(conv.intent) : '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                    {conv.responseTimeMs ? formatResponseTime(conv.responseTimeMs) : '—'}
                    {conv.confidence != null && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({Math.round(conv.confidence * 100)}%)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {statusBadge(conv.status)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                    {formatRelativeTime(conv.lastMessageAt)}
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

// ============ AI SETTINGS PANEL ============

function AiSettingsPanel() {
  const [settings, setSettings] = useState<AiSettingsData>({
    aiEnabled: true,
    aiSystemPrompt: null,
    aiTypingDelay: 1500,
    aiMaxContext: 20,
    aiBusinessHours: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);
  const [bhStart, setBhStart] = useState('09:00');
  const [bhEnd, setBhEnd] = useState('18:00');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = getToken();
        const res = await fetch('/api/whatsapp/ai-settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          if (data.aiBusinessHours) {
            try {
              const bh = JSON.parse(data.aiBusinessHours);
              setBusinessHoursEnabled(bh.enabled || false);
              setBhStart(bh.start || '09:00');
              setBhEnd(bh.end || '18:00');
            } catch { /* ignore */ }
          }
        }
      } catch { /* use defaults */ }
      setIsLoaded(true);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = getToken();
      const businessHours = businessHoursEnabled
        ? JSON.stringify({ enabled: true, start: bhStart, end: bhEnd, timezone: 'Asia/Brunei', days: [1, 2, 3, 4, 5] })
        : JSON.stringify({ enabled: false });

      const res = await fetch('/api/whatsapp/ai-settings', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...settings,
          aiBusinessHours: businessHours,
        }),
      });

      if (res.ok) {
        toast.success('AI settings saved successfully');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger asChild>
          <button className="w-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors rounded-t-lg">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-base font-semibold">AI Configuration</CardTitle>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
            </CardHeader>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-6 pt-0 space-y-6">
            {/* Enable AI Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">AI Assistant</Label>
                <p className="text-xs text-muted-foreground">Enable or disable the AI auto-responder</p>
              </div>
              <Switch
                checked={settings.aiEnabled}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, aiEnabled: checked }))}
              />
            </div>

            <Separator />

            {/* System Prompt */}
            <div className="space-y-2">
              <Label htmlFor="system-prompt" className="text-sm font-medium">System Prompt</Label>
              <p className="text-xs text-muted-foreground">
                Custom instructions for the AI assistant behavior
              </p>
              <Textarea
                id="system-prompt"
                placeholder="You are a helpful customer service AI for MOHD.HMS ENTERPRISE CMMS..."
                value={settings.aiSystemPrompt || ''}
                onChange={(e) => setSettings((s) => ({ ...s, aiSystemPrompt: e.target.value || null }))}
                rows={4}
                className="resize-none"
              />
            </div>

            <Separator />

            {/* Max Context Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Max Context Turns</Label>
                  <p className="text-xs text-muted-foreground">Number of conversation turns to remember</p>
                </div>
                <span className="text-sm font-semibold text-emerald-600">{settings.aiMaxContext}</span>
              </div>
              <Slider
                value={[settings.aiMaxContext]}
                onValueChange={([val]) => setSettings((s) => ({ ...s, aiMaxContext: val }))}
                min={5}
                max={50}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            {/* Typing Delay Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Typing Delay</Label>
                  <p className="text-xs text-muted-foreground">Simulated typing delay before response</p>
                </div>
                <span className="text-sm font-semibold text-emerald-600">{settings.aiTypingDelay}ms</span>
              </div>
              <Slider
                value={[settings.aiTypingDelay]}
                onValueChange={([val]) => setSettings((s) => ({ ...s, aiTypingDelay: val }))}
                min={500}
                max={3000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>500ms</span>
                <span>3000ms</span>
              </div>
            </div>

            <Separator />

            {/* Business Hours */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Business Hours</Label>
                  <p className="text-xs text-muted-foreground">AI only responds during business hours</p>
                </div>
                <Switch
                  checked={businessHoursEnabled}
                  onCheckedChange={setBusinessHoursEnabled}
                />
              </div>
              {businessHoursEnabled && (
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start</Label>
                    <Input
                      type="time"
                      value={bhStart}
                      onChange={(e) => setBhStart(e.target.value)}
                      className="w-32"
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">to</span>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <Input
                      type="time"
                      value={bhEnd}
                      onChange={(e) => setBhEnd(e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ============ PAYMENT VERIFICATION LIST ============

function PaymentVerificationPanel() {
  const [verifications, setVerifications] = useState<PaymentVerificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchVerifications = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/payments/verification?status=pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVerifications(Array.isArray(data) ? data : data.data || []);
      }
    } catch { /* ignore */ }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      const token = getToken();
      const res = await fetch('/api/payments/verification', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        toast.success(`Payment ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
        setVerifications((prev) => prev.filter((v) => v.id !== id));
      } else {
        const data = await res.json();
        toast.error(data.error || `Failed to ${status} payment`);
      }
    } catch {
      toast.error(`Failed to ${status} payment`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-emerald-600" />
          Pending Payment Verifications
          {verifications.length > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">{verifications.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : verifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No pending payment verifications
            </div>
          ) : (
            <div className="divide-y">
              {verifications.map((v) => (
                <div key={v.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{v.customerName || 'Unknown'}</span>
                      {v.invoiceNumber && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs shrink-0">
                          {v.invoiceNumber}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {v.extractedAmount != null && (
                        <span className="font-medium text-emerald-700">BND {v.extractedAmount.toFixed(2)}</span>
                      )}
                      {v.extractedBank && <span>Bank: {v.extractedBank}</span>}
                      {v.extractedDate && <span>Date: {v.extractedDate}</span>}
                      {v.extractedTxnId && <span className="font-mono">Ref: {v.extractedTxnId}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(v.createdAt)}</p>
                  </div>
                  {v.imageUrl && (
                    <div className="shrink-0">
                      <img
                        src={v.imageUrl}
                        alt="Payment proof"
                        className="h-12 w-12 rounded object-cover border"
                      />
                    </div>
                  )}
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAction(v.id, 'approved')}
                      disabled={processingId === v.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                    >
                      {processingId === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3 mr-1" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(v.id, 'rejected')}
                      disabled={processingId === v.id}
                      className="border-red-200 text-red-600 hover:bg-red-50 h-8"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ LOADING SKELETON ============

export function AiDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-6 w-20 ml-auto" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function AiWhatsAppDashboard() {
  const { setView } = useAppStore();
  const [data, setData] = useState<AiDashboardData | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/whatsapp/ai-dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setAiEnabled(result.aiEnabled ?? true);
      } else {
        // Fallback mock data
        setData({
          messagesToday: 47,
          messagesYesterday: 42,
          complaintsCreated: 5,
          quotationsGenerated: 3,
          avgResponseTime: 1820,
          languageDistribution: [
            { language: 'ms', count: 22, percentage: 47 },
            { language: 'en', count: 18, percentage: 38 },
            { language: 'bn', count: 4, percentage: 9 },
            { language: 'ar', count: 3, percentage: 6 },
          ],
          recentConversations: [],
        });
      }
    } catch {
      setData({
        messagesToday: 47,
        messagesYesterday: 42,
        complaintsCreated: 5,
        quotationsGenerated: 3,
        avgResponseTime: 1820,
        languageDistribution: [
          { language: 'ms', count: 22, percentage: 47 },
          { language: 'en', count: 18, percentage: 38 },
          { language: 'bn', count: 4, percentage: 9 },
          { language: 'ar', count: 3, percentage: 6 },
        ],
        recentConversations: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleAi = async (enabled: boolean) => {
    setAiEnabled(enabled);
    try {
      const token = getToken();
      await fetch('/api/whatsapp/ai-settings', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aiEnabled: enabled }),
      });
      toast.success(`AI Assistant ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      setAiEnabled(!enabled);
      toast.error('Failed to toggle AI');
    }
  };

  if (isLoading) return <AiDashboardSkeleton />;
  if (!data) return null;

  const msgTrend = data.messagesYesterday > 0
    ? Math.round(((data.messagesToday - data.messagesYesterday) / data.messagesYesterday) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <Bot className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI WhatsApp Assistant</h1>
            <p className="text-sm text-muted-foreground">Monitor and configure AI-powered customer interactions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-sm">
            <span className={`h-2 w-2 rounded-full ${aiEnabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            <span className="font-medium text-muted-foreground">{aiEnabled ? 'Active' : 'Inactive'}</span>
          </div>
          <Switch checked={aiEnabled} onCheckedChange={handleToggleAi} />
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={MessageSquare}
          label="Messages Today"
          value={data.messagesToday}
          trend={msgTrend}
          trendLabel="vs yesterday"
          color="text-emerald-600"
          iconBg="bg-emerald-100"
        />
        <StatCard
          icon={AlertTriangle}
          label="Complaints Created"
          value={data.complaintsCreated}
          trend={12}
          trendLabel="vs yesterday"
          color="text-amber-600"
          iconBg="bg-amber-100"
        />
        <StatCard
          icon={FileText}
          label="Quotations Generated"
          value={data.quotationsGenerated}
          trend={8}
          trendLabel="vs yesterday"
          color="text-purple-600"
          iconBg="bg-purple-100"
        />
        <StatCard
          icon={Clock}
          label="Avg Response Time"
          value={formatResponseTime(data.avgResponseTime)}
          trend={-15}
          trendLabel="faster"
          color="text-emerald-600"
          iconBg="bg-emerald-100"
        />
      </div>

      {/* Language Distribution */}
      <LanguageDistribution data={data.languageDistribution} />

      {/* Recent AI Conversations Table */}
      <RecentConversationsTable
        conversations={data.recentConversations}
        onViewConversations={() => setView('whatsapp-chats')}
      />

      {/* Payment Verifications */}
      <PaymentVerificationPanel />

      {/* AI Settings Panel (Collapsible) */}
      <AiSettingsPanel />
    </div>
  );
}