'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Settings, Wifi, WifiOff, Loader2, Check, Plug, Cloud, Phone,
  MessageSquare, Key, Globe, Shield, Eye, EyeOff, QrCode,
  RefreshCw, Zap, Send, Activity, Server, Clock,
  AlertCircle, Radio,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import type { WhatsAppProvider, WhatsAppConnectionStatus } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ============ HELPERS ============
function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

const PROVIDERS = [
  { id: 'openwa' as WhatsAppProvider, name: 'OpenWA', description: 'Open-source WhatsApp Web API. Free, self-hosted.', icon: MessageSquare },
  { id: 'meta' as WhatsAppProvider, name: 'Meta Cloud API', description: 'Official WhatsApp Business API by Meta.', icon: Cloud },
  { id: 'twilio' as WhatsAppProvider, name: 'Twilio', description: 'Third-party messaging API. Global coverage.', icon: Phone },
];

// ============ TYPES ============
interface ConnectionData {
  serviceRunning: boolean;
  connectionState: string;
  qr: string | null;
  qrAvailable: boolean;
  serviceInfo: {
    session: string;
    status: string;
    qrAvailable: boolean;
    phoneInfo: { phoneNumber?: string; pushName?: string } | null;
    connectedAt: string | null;
    lastHeartbeat: string | null;
    messageCount: number;
    uptime: number;
  } | null;
  logs: Array<{ timestamp: string; level: string; event: string; message: string }>;
  config: {
    id: string;
    provider: string;
    isEnabled: boolean;
    phoneNumber: string | null;
    businessName: string | null;
    openwaStatus: string;
    autoReplyEnabled: boolean;
    welcomeMessage: string;
  } | null;
  stats: { messagesToday: number; sentToday: number; deliveredToday: number; failedToday: number };
  recentMessages: Array<{
    id: string; direction: string; messageType: string; content: string;
    status: string; isFromBot: boolean; fromNumber: string | null;
    customerName: string | null; createdAt: string;
  }>;
}

// ============ STATUS BADGE ============
function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string; bg: string; label: string }> = {
    CONNECTED: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Connected' },
    connected: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Connected' },
    QR_READY: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'QR Ready' },
    generating_qr: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Generating QR...' },
    CONNECTING: { color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200', label: 'Connecting...' },
    connecting: { color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200', label: 'Connecting...' },
    RECONNECTING: { color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: 'Reconnecting...' },
    reconnecting: { color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: 'Reconnecting...' },
    DISCONNECTED: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Disconnected' },
    disconnected: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Disconnected' },
    offline: { color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', label: 'Offline' },
  };
  const c = configs[status] || configs.disconnected;
  const isSpinning = ['CONNECTING', 'connecting', 'RECONNECTING', 'reconnecting', 'generating_qr'].includes(status);

  return (
    <Badge variant="outline" className={cn('px-3 py-1.5 gap-2 font-medium border', c.bg, c.color)}>
      {isSpinning ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span className={cn('h-2 w-2 rounded-full', status === 'CONNECTED' || status === 'connected' ? 'bg-emerald-500' : 'bg-red-500')} />
      )}
      {c.label}
    </Badge>
  );
}

// ============ MAIN COMPONENT ============
export function WhatsAppSettings() {
  const { setView } = useAppStore();
  const [data, setData] = useState<ConnectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<WhatsAppProvider>('openwa');
  const [activeTab, setActiveTab] = useState<'connection' | 'settings' | 'logs'>('connection');

  // Settings form
  const [openwaBaseUrl, setOpenwaBaseUrl] = useState('http://localhost:3001');
  const [openwaApiKey, setOpenwaApiKey] = useState('');
  const [openwaSession, setOpenwaSession] = useState('MOHDHMS');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState('');
  const [metaVerifyToken, setMetaVerifyToken] = useState('');
  const [metaWebhookSecret, setMetaWebhookSecret] = useState('');
  const [metaBusinessAccountId, setMetaBusinessAccountId] = useState('');
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('');
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [emergencyNumbers, setEmergencyNumbers] = useState('');
  const [defaultPriority, setDefaultPriority] = useState('medium');
  const [testChatId, setTestChatId] = useState('');
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ============ FETCH STATUS ============
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/connection', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const json = await res.json() as ConnectionData;
        setData(json);

        // Convert QR if available
        if (json.qr) {
          const url = await QRCode.toDataURL(json.qr, { width: 280, margin: 2 });
          setQrImageUrl(url);
        } else if (json.connectionState === 'CONNECTED' || json.connectionState === 'connected') {
          setQrImageUrl(null);
        }

        return json;
      }
    } catch {}
    return null;
  }, []);

  // ============ QR POLLING ============
  useEffect(() => {
    const state = data?.connectionState;
    const isWaiting = ['CONNECTING', 'connecting', 'QR_READY', 'generating_qr', 'RECONNECTING', 'reconnecting'].includes(state || '');

    if (isWaiting) {
      // Poll QR every 2 seconds when waiting
      if (!qrPollRef.current) {
        qrPollRef.current = setInterval(async () => {
          try {
            const token = getToken();
            const res = await fetch('/api/whatsapp/connection', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'get-qr' }),
            });
            if (res.ok) {
              const qrData = await res.json() as { qr: string | null; connected: boolean };
              if (qrData.connected) {
                setQrImageUrl(null);
                // Connected! Refresh full status
                fetchStatus();
                if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
              } else if (qrData.qr) {
                const url = await QRCode.toDataURL(qrData.qr, { width: 280, margin: 2 });
                setQrImageUrl(url);
              }
            }
          } catch {}
        }, 2000);
      }
    } else {
      if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
    }

    return () => {
      if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
    };
  }, [data?.connectionState, fetchStatus]);

  // ============ STATUS POLLING ============
  useEffect(() => {
    const state = data?.connectionState;
    const isActive = ['CONNECTING', 'connecting', 'QR_READY', 'generating_qr', 'RECONNECTING', 'reconnecting'].includes(state || '');

    if (isActive && !pollRef.current) {
      pollRef.current = setInterval(fetchStatus, 5000);
    } else if (!isActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [data?.connectionState, fetchStatus]);

  // ============ INITIAL LOAD ============
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      // Load config
      try {
        const res = await fetch('/api/whatsapp/config', {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const d = await res.json();
          setSelectedProvider(d.provider || 'openwa');
          setOpenwaBaseUrl(d.openwaBaseUrl || 'http://localhost:3001');
          setOpenwaApiKey(d.openwaApiKey || '');
          setOpenwaSession(d.openwaSession || 'MOHDHMS');
          setMetaAccessToken(d.metaAccessToken || '');
          setMetaPhoneNumberId(d.metaPhoneNumberId || '');
          setMetaVerifyToken(d.metaVerifyToken || '');
          setMetaWebhookSecret(d.metaWebhookSecret || '');
          setMetaBusinessAccountId(d.metaBusinessAccountId || '');
          setTwilioAccountSid(d.twilioAccountSid || '');
          setTwilioAuthToken(d.twilioAuthToken || '');
          setTwilioPhoneNumber(d.twilioPhoneNumber || '');
          setAutoReplyEnabled(d.autoReplyEnabled ?? true);
          setWelcomeMessage(d.welcomeMessage || '');
          setEmergencyNumbers(d.emergencyNumbers || '');
          setDefaultPriority(d.defaultPriority || 'medium');
        }
      } catch {}

      await fetchStatus();
      setLoading(false);
    };
    init();
  }, [fetchStatus]);

  // ============ HANDLE ACTION ============
  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      const res = await fetch('/api/whatsapp/connection', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, chatId: testChatId || undefined }),
      });
      const result = await res.json();

      if (action === 'connect') {
        if (result.state === 'CONNECTED') {
          toast.success('WhatsApp connected successfully!');
          setQrImageUrl(null);
        } else {
          toast.info('Connecting to WhatsApp... QR code will appear shortly.');
        }
      } else if (action === 'disconnect') {
        toast.success('WhatsApp disconnected');
        setQrImageUrl(null);
      } else if (action === 'reconnect') {
        toast.info('Reconnecting...');
        setQrImageUrl(null);
      } else if (action === 'test-message') {
        toast[result.success ? 'success' : 'error'](result.message || 'Test failed');
      } else if (action === 'get-qr') {
        if (result.qr) {
          const url = await QRCode.toDataURL(result.qr, { width: 280, margin: 2 });
          setQrImageUrl(url);
        }
      }

      if (!result.success && result.error) {
        toast.error(result.error);
      }

      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  // ============ SAVE SETTINGS ============
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider, openwaBaseUrl, openwaApiKey, openwaSession,
          metaAccessToken, metaPhoneNumberId, metaVerifyToken, metaWebhookSecret, metaBusinessAccountId,
          twilioAccountSid, twilioAuthToken, twilioPhoneNumber,
          autoReplyEnabled, welcomeMessage, emergencyNumbers, defaultPriority,
        }),
      });
      if (res.ok) toast.success('Settings saved');
      else toast.error('Save failed');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const connState = data?.connectionState || 'DISCONNECTED';
  const isConnected = connState === 'CONNECTED' || connState === 'connected';
  const isConnecting = ['CONNECTING', 'connecting', 'QR_READY', 'generating_qr', 'RECONNECTING', 'reconnecting'].includes(connState);
  const info = data?.serviceInfo;
  const stats = data?.stats;

  const formatUptime = (s: number) => {
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  };

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  // ============ RENDER ============
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <Settings className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">WhatsApp Settings</h1>
            <p className="text-sm text-muted-foreground">Configure and manage your WhatsApp integration</p>
          </div>
        </div>
        <StatusBadge status={connState} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Messages Today', value: stats?.messagesToday || 0, icon: MessageSquare, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'Sent', value: stats?.sentToday || 0, icon: Send, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Delivered', value: stats?.deliveredToday || 0, icon: Check, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Failed', value: stats?.failedToday || 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', item.bg)}>
                <item.icon className={cn('h-5 w-5', item.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xl font-bold">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {(['connection', 'settings', 'logs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
              activeTab === tab ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CONNECTION TAB */}
      {activeTab === 'connection' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Connection Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-600" />
                Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Info */}
              {isConnected && info && (
                <div className="space-y-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium text-emerald-700">Connected</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Phone:</span>{' '}
                      <span className="font-medium">{info.phoneInfo?.phoneNumber || info.phoneInfo?.pushName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Uptime:</span>{' '}
                      <span className="font-medium">{formatUptime(info.uptime)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Messages:</span>{' '}
                      <span className="font-medium">{info.messageCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Heartbeat:</span>{' '}
                      <span className="font-medium">{info.lastHeartbeat ? new Date(info.lastHeartbeat).toLocaleTimeString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code Display */}
              <AnimatePresence mode="wait">
                {qrImageUrl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl border border-dashed border-amber-300"
                  >
                    <p className="text-sm font-medium text-amber-700">Scan with WhatsApp</p>
                    <img src={qrImageUrl} alt="WhatsApp QR Code" className="w-64 h-64 rounded-lg" />
                    <p className="text-xs text-muted-foreground">QR refreshes every 20 seconds. Scan quickly!</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Connecting indicator (no QR yet) */}
              {isConnecting && !qrImageUrl && (
                <div className="flex flex-col items-center gap-3 p-8 bg-sky-50 rounded-xl border border-sky-200">
                  <Loader2 className="h-8 w-8 text-sky-600 animate-spin" />
                  <p className="text-sm font-medium text-sky-700">
                    {connState === 'generating_qr' || connState === 'QR_READY'
                      ? 'Generating QR code...'
                      : 'Launching WhatsApp Web...'}
                  </p>
                  <p className="text-xs text-sky-500">This may take 15-30 seconds</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {!isConnected && !isConnecting && (
                  <Button
                    onClick={() => handleAction('connect')}
                    disabled={actionLoading === 'connect'}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {actionLoading === 'connect' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                    Connect WhatsApp
                  </Button>
                )}

                {isConnecting && (
                  <Button variant="outline" onClick={() => handleAction('disconnect')} className="text-red-600 border-red-200 hover:bg-red-50">
                    <WifiOff className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}

                {isConnected && (
                  <>
                    <Button variant="outline" onClick={() => handleAction('test-message')} disabled={actionLoading === 'test-message'}>
                      {actionLoading === 'test-message' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Send Test
                    </Button>
                    <Button variant="outline" onClick={() => handleAction('disconnect')} disabled={actionLoading === 'disconnect'} className="text-red-600 border-red-200 hover:bg-red-50">
                      <WifiOff className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </>
                )}

                {isConnected && (
                  <Button variant="outline" size="sm" onClick={fetchStatus}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                  </Button>
                )}
              </div>

              {/* Test Message Input */}
              {isConnected && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Phone number (e.g. 60123456789@s.whatsapp.net)"
                    value={testChatId}
                    onChange={(e) => setTestChatId(e.target.value)}
                    className="text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => handleAction('test-message')}>
                    Send
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Provider Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plug className="h-4 w-4 text-emerald-600" />
                Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProvider(p.id)}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all',
                      selectedProvider === p.id
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-transparent bg-muted/50 hover:bg-muted'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      selectedProvider === p.id ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
                    )}>
                      <p.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{p.name}</p>
                        {selectedProvider === p.id && <Check className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Session Info */}
              <Separator />
              <div className="space-y-2 text-sm">
                <h4 className="font-medium">Session Details</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground text-xs">Session ID</p>
                    <p className="font-mono text-xs">{info?.session || 'MOHDHMS'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Status</p>
                    <p className="font-medium">{info?.status || 'DISCONNECTED'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Connected At</p>
                    <p className="font-medium">{info?.connectedAt ? new Date(info.connectedAt).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Chrome</p>
                    <p className="font-medium text-xs">{data?.serviceInfo ? 'Found' : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-600" />
              Provider Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedProvider === 'openwa' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Service URL</Label>
                    <Input className="mt-1" value={openwaBaseUrl} onChange={(e) => setOpenwaBaseUrl(e.target.value)} placeholder="http://localhost:3001" />
                  </div>
                  <div>
                    <Label>Session Name</Label>
                    <Input className="mt-1" value={openwaSession} onChange={(e) => setOpenwaSession(e.target.value)} placeholder="MOHDHMS" />
                  </div>
                </div>
                <div>
                  <Label>API Key (optional)</Label>
                  <div className="relative mt-1">
                    <Input type={showPw.openwaApiKey ? 'text' : 'password'} value={openwaApiKey} onChange={(e) => setOpenwaApiKey(e.target.value)} placeholder="Optional API key" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPw(p => ({ ...p, openwaApiKey: !p.openwaApiKey }))}>
                      {showPw.openwaApiKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedProvider === 'meta' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Access Token</Label>
                    <Input className="mt-1" type="password" value={metaAccessToken} onChange={(e) => setMetaAccessToken(e.target.value)} />
                  </div>
                  <div>
                    <Label>Phone Number ID</Label>
                    <Input className="mt-1" value={metaPhoneNumberId} onChange={(e) => setMetaPhoneNumberId(e.target.value)} />
                  </div>
                  <div>
                    <Label>Verify Token</Label>
                    <Input className="mt-1" value={metaVerifyToken} onChange={(e) => setMetaVerifyToken(e.target.value)} />
                  </div>
                  <div>
                    <Label>Webhook Secret</Label>
                    <Input className="mt-1" type="password" value={metaWebhookSecret} onChange={(e) => setMetaWebhookSecret(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Business Account ID</Label>
                    <Input className="mt-1" value={metaBusinessAccountId} onChange={(e) => setMetaBusinessAccountId(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {selectedProvider === 'twilio' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Account SID</Label>
                    <Input className="mt-1" value={twilioAccountSid} onChange={(e) => setTwilioAccountSid(e.target.value)} />
                  </div>
                  <div>
                    <Label>Auth Token</Label>
                    <Input className="mt-1" type="password" value={twilioAuthToken} onChange={(e) => setTwilioAuthToken(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Twilio Phone Number</Label>
                    <Input className="mt-1" value={twilioPhoneNumber} onChange={(e) => setTwilioPhoneNumber(e.target.value)} placeholder="+1234567890" />
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* General Settings */}
            <div className="space-y-4">
              <h3 className="font-medium">General Settings</h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Reply</Label>
                  <p className="text-xs text-muted-foreground">Automatically respond to incoming messages</p>
                </div>
                <Switch checked={autoReplyEnabled} onCheckedChange={setAutoReplyEnabled} />
              </div>
              <div>
                <Label>Welcome Message</Label>
                <Textarea className="mt-1" rows={4} value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} placeholder="Welcome message..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Emergency Numbers</Label>
                  <Input className="mt-1" value={emergencyNumbers} onChange={(e) => setEmergencyNumbers(e.target.value)} placeholder='["+60123456789"]' />
                </div>
                <div>
                  <Label>Default Priority</Label>
                  <Select value={defaultPriority} onValueChange={setDefaultPriority}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['low', 'medium', 'high', 'critical'].map(p => (
                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LOGS TAB */}
      {activeTab === 'logs' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" />
                Service Logs
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchStatus}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96">
              {(!data?.logs || data.logs.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-8">No logs yet</p>
              ) : (
                <div className="space-y-1 font-mono text-xs">
                  {data.logs.map((log, i) => (
                    <div key={i} className={cn(
                      'flex gap-2 px-2 py-1.5 rounded',
                      log.level === 'error' ? 'bg-red-50 text-red-700' :
                      log.level === 'warn' ? 'bg-amber-50 text-amber-700' :
                      'text-muted-foreground'
                    )}>
                      <span className="shrink-0 opacity-60">{log.timestamp.split('T')[1]?.split('.')[0] || ''}</span>
                      <span className={cn(
                        'shrink-0 font-bold uppercase w-12',
                        log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-amber-500' : 'text-sky-500'
                      )}>{log.level}</span>
                      <span className="shrink-0 text-foreground/70">{log.event}</span>
                      <span className="truncate">{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}