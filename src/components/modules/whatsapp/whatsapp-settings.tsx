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
  RefreshCw, Zap, PhoneCall, Send, Activity, Server, Clock,
  AlertCircle, ArrowDownUp, Database, Radio, Trash2,
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

// ============ PROVIDER CONFIG ============
interface ProviderCardConfig {
  id: WhatsAppProvider;
  name: string;
  description: string;
  icon: React.ElementType;
}

const PROVIDERS: ProviderCardConfig[] = [
  {
    id: 'openwa',
    name: 'OpenWA',
    description: 'Open-source WhatsApp Web API. Free, self-hosted with QR code pairing.',
    icon: MessageSquare,
  },
  {
    id: 'meta',
    name: 'Meta Cloud API',
    description: 'Official WhatsApp Business API by Meta. Requires business verification.',
    icon: Cloud,
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Third-party messaging API. Global coverage with reliable delivery.',
    icon: Phone,
  },
];

// ============ TYPES ============
interface ServiceInfo {
  session: string;
  status: string;
  qrAvailable: boolean;
  phoneInfo: { phoneNumber?: string; pushName?: string; platform?: string } | null;
  connectedAt: string | null;
  lastHeartbeat: string | null;
  messageCount: number;
  errorCount: number;
  lastError?: string;
  uptime: number;
}

interface ConnectionData {
  serviceRunning: boolean;
  serviceInfo: ServiceInfo | null;
  queueStatus: { total: number; pending: number; processing: number; failed: number } | null;
  logs: Array<{
    id: string;
    timestamp: string;
    level: string;
    event: string;
    message: string;
  }>;
  config: {
    id: string;
    provider: string;
    isEnabled: boolean;
    phoneNumber: string | null;
    businessName: string | null;
    openwaBaseUrl: string | null;
    openwaSession: string | null;
    openwaStatus: string;
    autoReplyEnabled: boolean;
    welcomeMessage: string;
  } | null;
  stats: {
    messagesToday: number;
    sentToday: number;
    deliveredToday: number;
    failedToday: number;
  };
  recentMessages: Array<{
    id: string;
    direction: string;
    messageType: string;
    content: string;
    status: string;
    isFromBot: boolean;
    fromNumber: string | null;
    toNumber: string | null;
    customerName: string | null;
    customerPhone: string | null;
    createdAt: string;
    errorMessage: string | null;
  }>;
}

// ============ CONNECTION STATUS BADGE ============
function ConnectionBadge({ status }: { status: WhatsAppConnectionStatus }) {
  const config: Record<string, { color: string; bg: string; dot: string; label: string }> = {
    connected: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', label: 'Connected' },
    disconnected: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500', label: 'Disconnected' },
    connecting: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', label: 'Connecting...' },
  };
  const c = config[status] || config.disconnected;

  return (
    <Badge variant="outline" className={cn('px-3 py-1.5 gap-2 font-medium border', c.bg, c.color)}>
      {status === 'connecting' ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span className={cn('h-2 w-2 rounded-full', c.dot)} />
      )}
      {c.label}
    </Badge>
  );
}

// ============ MAIN COMPONENT ============
export function WhatsAppSettings() {
  const { setView } = useAppStore();
  const [connectionData, setConnectionData] = useState<ConnectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<WhatsAppProvider>('openwa');
  const [showPasswordFields, setShowPasswordFields] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'connection' | 'settings' | 'logs'>('connection');

  // Form state
  const [openwaBaseUrl, setOpenwaBaseUrl] = useState('http://localhost:3001');
  const [openwaApiKey, setOpenwaApiKey] = useState('');
  const [openwaSession, setOpenwaSession] = useState('default');
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

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch connection status
  const fetchConnectionStatus = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/whatsapp/connection', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as ConnectionData;
        setConnectionData(data);

        // Update QR if available from service
        if (data.config?.openwaStatus === 'connecting') {
          // Poll QR from the service
          try {
            const qrRes = await fetch('/api/whatsapp/connection', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'get-qr' }),
            });
            if (qrRes.ok) {
              const qrData = await qrRes.json() as { qr: string | null };
              if (qrData.qr) {
                // Convert raw QR string to data URL
                const url = await QRCode.toDataURL(qrData.qr, { width: 256, margin: 2 });
                setQrCodeDataUrl(url);
              }
            }
          } catch {}
        }

        // Clear QR when connected
        if (data.config?.openwaStatus === 'connected') {
          setQrCodeDataUrl(null);
        }
      }
    } catch {
      // Silent fail on polling
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      // First fetch config for form fields
      try {
        const token = getToken();
        const res = await fetch('/api/whatsapp/config', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSelectedProvider(data.provider || 'openwa');
          setOpenwaBaseUrl(data.openwaBaseUrl || 'http://localhost:3001');
          setOpenwaApiKey(data.openwaApiKey || '');
          setOpenwaSession(data.openwaSession || 'default');
          setMetaAccessToken(data.metaAccessToken || '');
          setMetaPhoneNumberId(data.metaPhoneNumberId || '');
          setMetaVerifyToken(data.metaVerifyToken || '');
          setMetaWebhookSecret(data.metaWebhookSecret || '');
          setMetaBusinessAccountId(data.metaBusinessAccountId || '');
          setTwilioAccountSid(data.twilioAccountSid || '');
          setTwilioAuthToken(data.twilioAuthToken || '');
          setTwilioPhoneNumber(data.twilioPhoneNumber || '');
          setAutoReplyEnabled(data.autoReplyEnabled ?? true);
          setWelcomeMessage(data.welcomeMessage || '');
          setEmergencyNumbers(data.emergencyNumbers || '');
          setDefaultPriority(data.defaultPriority || 'medium');
        }
      } catch {}

      await fetchConnectionStatus();
      setIsLoading(false);
    };

    init();
  }, [fetchConnectionStatus]);

  // Poll connection status every 5s when connecting
  useEffect(() => {
    const status = connectionData?.config?.openwaStatus;
    if (status === 'connecting') {
      pollRef.current = setInterval(fetchConnectionStatus, 5000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [connectionData?.config?.openwaStatus, fetchConnectionStatus]);

  // Handle connection actions
  const handleAction = async (action: string) => {
    setIsActionLoading(action);
    try {
      const token = getToken();
      const res = await fetch('/api/whatsapp/connection', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, chatId: testChatId || undefined }),
      });
      const data = await res.json();

      if (data.success) {
        switch (action) {
          case 'connect':
            if (data.qr) {
              const url = await QRCode.toDataURL(data.qr, { width: 256, margin: 2 });
              setQrCodeDataUrl(url);
              toast.success('QR code generated. Scan with your WhatsApp app.');
            } else if (data.state === 'CONNECTED') {
              toast.success('WhatsApp connected successfully!');
            } else {
              toast.info(data.message || 'Connecting...');
            }
            break;
          case 'disconnect':
            toast.success('WhatsApp disconnected');
            setQrCodeDataUrl(null);
            break;
          case 'reconnect':
            if (data.qr) {
              const url = await QRCode.toDataURL(data.qr, { width: 256, margin: 2 });
              setQrCodeDataUrl(url);
            }
            toast.success('Reconnecting...');
            break;
          case 'restart':
            toast.success('Service restarting...');
            break;
          case 'test-message':
            toast.success(data.message || 'Test message sent!');
            break;
          case 'sync-conversations':
            toast.success(data.message || 'Conversations synced!');
            break;
          case 'get-qr':
            if (data.qr) {
              const url = await QRCode.toDataURL(data.qr, { width: 256, margin: 2 });
              setQrCodeDataUrl(url);
            }
            break;
        }
      } else {
        toast.error(data.error || data.message || 'Action failed');
        if (action === 'connect' && data.error) {
          // Show specific error for Chrome not found
          if (data.error.includes('Chrome') || data.error.includes('chromium')) {
            toast.error('Chromium browser not found. Install it or set CHROME_PATH.', { duration: 8000 });
          }
        }
      }
      // Refresh status
      await fetchConnectionStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsActionLoading(null);
    }
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = getToken();
      const res = await fetch('/api/whatsapp/config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          openwaBaseUrl,
          openwaApiKey,
          openwaSession,
          metaAccessToken,
          metaPhoneNumberId,
          metaVerifyToken,
          metaWebhookSecret,
          metaBusinessAccountId,
          twilioAccountSid,
          twilioAuthToken,
          twilioPhoneNumber,
          autoReplyEnabled,
          welcomeMessage,
          emergencyNumbers,
          defaultPriority,
        }),
      });
      if (res.ok) {
        toast.success('Settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswordFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const status: WhatsAppConnectionStatus = (connectionData?.config?.openwaStatus as WhatsAppConnectionStatus) || 'disconnected';
  const serviceInfo = connectionData?.serviceInfo;
  const stats = connectionData?.stats;
  const recentMessages = connectionData?.recentMessages || [];
  const logs = connectionData?.logs || [];

  // Format uptime
  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  // Format relative time
  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <Settings className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">WhatsApp Settings</h1>
            <p className="text-sm text-muted-foreground">Configure and manage your WhatsApp integration</p>
          </div>
        </div>
        <ConnectionBadge status={status} />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {(['connection', 'settings', 'logs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'connection' && <Radio className="h-3.5 w-3.5 inline mr-1.5" />}
            {tab === 'settings' && <Settings className="h-3.5 w-3.5 inline mr-1.5" />}
            {tab === 'logs' && <Activity className="h-3.5 w-3.5 inline mr-1.5" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ============ CONNECTION TAB ============ */}
        {activeTab === 'connection' && (
          <motion.div key="connection" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Stats Row */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Service Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        {connectionData?.serviceRunning ? (
                          <Server className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Server className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-semibold">
                          {connectionData?.serviceRunning ? 'Running' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    <div className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center',
                      connectionData?.serviceRunning ? 'bg-emerald-50' : 'bg-red-50'
                    )}>
                      <Activity className={cn(
                        'h-4 w-4',
                        connectionData?.serviceRunning ? 'text-emerald-600' : 'text-red-500'
                      )} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Messages Today</p>
                      <p className="text-lg font-bold mt-0.5">{stats?.messagesToday || 0}</p>
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Send className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Queue</p>
                      <p className="text-lg font-bold mt-0.5">{connectionData?.queueStatus?.pending || 0}</p>
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                      <ArrowDownUp className="h-4 w-4 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Uptime</p>
                      <p className="text-lg font-bold mt-0.5">
                        {serviceInfo?.uptime ? formatUptime(serviceInfo.uptime) : '—'}
                      </p>
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service offline warning */}
            {!connectionData?.serviceRunning && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-amber-800">OpenWA Service Not Running</p>
                    <p className="text-xs text-amber-700">
                      The WhatsApp service at <code className="bg-amber-100 px-1 rounded text-xs">{openwaBaseUrl}</code> is not reachable.
                      Start it with: <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">cd mini-services/whatsapp-service &amp;&amp; bun index.ts</code>
                    </p>
                    <p className="text-xs text-amber-600">
                      The service requires <strong>Chromium</strong> to be installed. In production, set the <code className="bg-amber-100 px-1 rounded text-xs">CHROME_PATH</code> environment variable.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {/* QR Code & Connection Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-emerald-600" />
                      Connection & QR Code
                    </CardTitle>
                    <ConnectionBadge status={status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* QR Code Display */}
                  <div className="flex flex-col items-center gap-4">
                    {status === 'connecting' && qrCodeDataUrl ? (
                      <div className="relative">
                        <div className="w-56 h-56 border-2 border-emerald-200 rounded-xl overflow-hidden bg-white p-2">
                          <img src={qrCodeDataUrl} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                        </div>
                        <div className="absolute -top-2 -right-2">
                          <Badge className="bg-amber-500 text-white text-[10px] animate-pulse">LIVE</Badge>
                        </div>
                        <p className="text-xs text-center text-muted-foreground mt-2 max-w-xs">
                          Scan with your WhatsApp app. QR refreshes automatically every 20 seconds.
                        </p>
                      </div>
                    ) : status === 'connected' ? (
                      <div className="w-56 h-56 border-2 border-emerald-200 rounded-xl bg-emerald-50 flex flex-col items-center justify-center gap-3">
                        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Check className="h-8 w-8 text-emerald-600" />
                        </div>
                        <p className="text-sm font-medium text-emerald-700">Connected</p>
                        {serviceInfo?.phoneInfo?.pushName && (
                          <p className="text-xs text-emerald-600">{serviceInfo.phoneInfo.pushName}</p>
                        )}
                        {serviceInfo?.phoneInfo?.phoneNumber && (
                          <p className="text-xs text-muted-foreground">{serviceInfo.phoneInfo.phoneNumber}</p>
                        )}
                      </div>
                    ) : (
                      <div className="w-56 h-56 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-3 bg-gray-50">
                        <QrCode className="h-12 w-12 text-gray-300" />
                        <p className="text-xs text-gray-400 text-center px-4">
                          Click &ldquo;Connect WhatsApp&rdquo; to generate QR code
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Connection Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {status !== 'connected' && (
                      <Button
                        onClick={() => handleAction('connect')}
                        disabled={isActionLoading === 'connect'}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {isActionLoading === 'connect' ? (
                          <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Connecting...</>
                        ) : (
                          <><Plug className="h-4 w-4 mr-1.5" />Connect WhatsApp</>
                        )}
                      </Button>
                    )}

                    {status === 'connecting' && (
                      <Button
                        variant="outline"
                        onClick={() => handleAction('get-qr')}
                        disabled={isActionLoading === 'get-qr'}
                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                      >
                        {isActionLoading === 'get-qr' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <QrCode className="h-4 w-4 mr-1.5" />}
                        Refresh QR
                      </Button>
                    )}

                    {status === 'connected' && (
                      <Button
                        variant="outline"
                        onClick={() => handleAction('disconnect')}
                        disabled={isActionLoading === 'disconnect'}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        {isActionLoading === 'disconnect' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <WifiOff className="h-4 w-4 mr-1.5" />}
                        Disconnect
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => handleAction('reconnect')}
                      disabled={isActionLoading === 'reconnect'}
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      {isActionLoading === 'reconnect' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                      Reconnect
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleAction('restart')}
                      disabled={isActionLoading === 'restart'}
                    >
                      {isActionLoading === 'restart' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Zap className="h-4 w-4 mr-1.5" />}
                      Restart
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleAction('sync-conversations')}
                      disabled={isActionLoading === 'sync-conversations'}
                    >
                      {isActionLoading === 'sync-conversations' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Database className="h-4 w-4 mr-1.5" />}
                      Sync
                    </Button>
                  </div>

                  {/* Session Info */}
                  {serviceInfo && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Session</span>
                        <span className="font-mono">{serviceInfo.session}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service Status</span>
                        <span className="font-mono">{serviceInfo.status}</span>
                      </div>
                      {serviceInfo.connectedAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Connected At</span>
                          <span>{new Date(serviceInfo.connectedAt).toLocaleString()}</span>
                        </div>
                      )}
                      {serviceInfo.lastHeartbeat && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Heartbeat</span>
                          <span>{formatTime(serviceInfo.lastHeartbeat)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Messages Processed</span>
                        <span className="font-semibold">{serviceInfo.messageCount}</span>
                      </div>
                      {serviceInfo.lastError && (
                        <div className="flex justify-between text-red-600">
                          <span>Last Error</span>
                          <span className="truncate max-w-[200px]">{serviceInfo.lastError}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right Column: Test Message + Recent Messages */}
              <div className="space-y-6">
                {/* Test Message */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Send className="h-4 w-4 text-emerald-600" />
                      Test Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Send a test message to verify your WhatsApp connection is working.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Phone number (optional, sends to self)"
                        value={testChatId}
                        onChange={e => setTestChatId(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleAction('test-message')}
                        disabled={isActionLoading === 'test-message' || status !== 'connected'}
                        className="bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap"
                      >
                        {isActionLoading === 'test-message' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4 mr-1.5" />
                        )}
                        Test
                      </Button>
                    </div>
                    {status !== 'connected' && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Connect WhatsApp first before sending test messages
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Message Logs */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-600" />
                        Recent Messages
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">{recentMessages.length} recent</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-80">
                      {recentMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                          <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
                          <p className="text-sm">No messages yet</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {recentMessages.map(msg => (
                            <div key={msg.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant={msg.direction === 'inbound' ? 'secondary' : 'outline'} className="text-[10px] px-1.5">
                                    {msg.direction === 'inbound' ? '↓ IN' : '↑ OUT'}
                                  </Badge>
                                  <span className="text-xs font-medium">
                                    {msg.customerName || msg.fromNumber || msg.toNumber}
                                  </span>
                                  {msg.isFromBot && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 text-purple-600 border-purple-200">BOT</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px] px-1.5',
                                      msg.status === 'sent' && 'border-emerald-200 text-emerald-600',
                                      msg.status === 'delivered' && 'border-blue-200 text-blue-600',
                                      msg.status === 'read' && 'border-violet-200 text-violet-600',
                                      msg.status === 'failed' && 'border-red-200 text-red-600',
                                    )}
                                  >
                                    {msg.status}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{msg.content || `[${msg.messageType}]`}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============ SETTINGS TAB ============ */}
        {activeTab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Provider Selection */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Provider Selection</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {PROVIDERS.map(provider => {
                  const Icon = provider.icon;
                  const isSelected = selectedProvider === provider.id;
                  return (
                    <motion.div key={provider.id} whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                      <Card
                        className={cn(
                          'cursor-pointer transition-all',
                          isSelected ? 'border-2 border-emerald-500 bg-emerald-50/30 shadow-sm' : 'hover:border-emerald-200'
                        )}
                        onClick={() => setSelectedProvider(provider.id)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <div className={cn('rounded-lg p-2.5', isSelected ? 'bg-emerald-100' : 'bg-gray-100')}>
                              <Icon className={cn('h-5 w-5', isSelected ? 'text-emerald-600' : 'text-gray-500')} />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm">{provider.name}</h3>
                                {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{provider.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Provider Config */}
            {selectedProvider === 'openwa' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">OpenWA Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        Service URL
                      </Label>
                      <Input
                        placeholder="http://localhost:3001"
                        value={openwaBaseUrl}
                        onChange={e => setOpenwaBaseUrl(e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground">URL of the OpenWA service (usually localhost:3001)</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        <Plug className="h-3.5 w-3.5 text-muted-foreground" />
                        Session Name
                      </Label>
                      <Input
                        placeholder="default"
                        value={openwaSession}
                        onChange={e => setOpenwaSession(e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground">Unique session name for this tenant</p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-muted-foreground" />
                        API Key (optional)
                      </Label>
                      <div className="relative max-w-md">
                        <Input
                          type={showPasswordFields.apiKey ? 'text' : 'password'}
                          placeholder="Enter API key if configured"
                          value={openwaApiKey}
                          onChange={e => setOpenwaApiKey(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('apiKey')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPasswordFields.apiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedProvider === 'meta' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Meta Cloud API Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Key className="h-3.5 w-3.5 text-muted-foreground" />Access Token</Label>
                      <div className="relative">
                        <Input
                          type={showPasswordFields.metaToken ? 'text' : 'password'}
                          placeholder="EAAxxxxx..."
                          value={metaAccessToken}
                          onChange={e => setMetaAccessToken(e.target.value)}
                        />
                        <button type="button" onClick={() => togglePasswordVisibility('metaToken')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPasswordFields.metaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />Phone Number ID</Label>
                      <Input placeholder="Enter Phone Number ID" value={metaPhoneNumberId} onChange={e => setMetaPhoneNumberId(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-muted-foreground" />Verify Token</Label>
                      <Input placeholder="Webhook verify token" value={metaVerifyToken} onChange={e => setMetaVerifyToken(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Key className="h-3.5 w-3.5 text-muted-foreground" />Webhook Secret</Label>
                      <div className="relative">
                        <Input
                          type={showPasswordFields.webhookSecret ? 'text' : 'password'}
                          placeholder="App secret"
                          value={metaWebhookSecret}
                          onChange={e => setMetaWebhookSecret(e.target.value)}
                        />
                        <button type="button" onClick={() => togglePasswordVisibility('webhookSecret')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPasswordFields.webhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-muted-foreground" />Business Account ID</Label>
                      <Input placeholder="Enter Business Account ID" value={metaBusinessAccountId} onChange={e => setMetaBusinessAccountId(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedProvider === 'twilio' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Twilio Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-muted-foreground" />Account SID</Label>
                      <Input placeholder="ACxxxxx..." value={twilioAccountSid} onChange={e => setTwilioAccountSid(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Key className="h-3.5 w-3.5 text-muted-foreground" />Auth Token</Label>
                      <div className="relative">
                        <Input
                          type={showPasswordFields.twilioToken ? 'text' : 'password'}
                          placeholder="Enter auth token"
                          value={twilioAuthToken}
                          onChange={e => setTwilioAuthToken(e.target.value)}
                        />
                        <button type="button" onClick={() => togglePasswordVisibility('twilioToken')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPasswordFields.twilioToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-1.5"><PhoneCall className="h-3.5 w-3.5 text-muted-foreground" />WhatsApp Phone Number</Label>
                      <Input placeholder="whatsapp:+1234567890" value={twilioPhoneNumber} onChange={e => setTwilioPhoneNumber(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Reply</Label>
                    <p className="text-xs text-muted-foreground">Automatically respond to customer messages</p>
                  </div>
                  <Switch checked={autoReplyEnabled} onCheckedChange={setAutoReplyEnabled} className="data-[state=checked]:bg-emerald-600" />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Welcome Message</Label>
                  <Textarea
                    placeholder="Enter the welcome message sent to new customers..."
                    value={welcomeMessage}
                    onChange={e => setWelcomeMessage(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports variables: {'{{company_name}}'}, {'{{customer_name}}'}
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <PhoneCall className="h-3.5 w-3.5 text-red-500" />
                    Emergency Numbers
                  </Label>
                  <Input placeholder="+60119991111, +60118882222" value={emergencyNumbers} onChange={e => setEmergencyNumbers(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Comma-separated phone numbers for emergency escalation</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Default Priority for WhatsApp Complaints</Label>
                  <Select value={defaultPriority} onValueChange={setDefaultPriority}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button onClick={handleSave} disabled={isSaving} className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-base">
              {isSaving ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Saving...</> : <><Check className="h-5 w-5 mr-2" />Save Settings</>}
            </Button>
          </motion.div>
        )}

        {/* ============ LOGS TAB ============ */}
        {activeTab === 'logs' && (
          <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    Service Logs
                  </CardTitle>
                  <Badge variant="secondary">{logs.length} entries</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[500px]">
                  {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Activity className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">No logs yet. Start the WhatsApp service to see logs.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {logs.map((log, i) => (
                        <div key={log.id || i} className="px-4 py-2.5 hover:bg-muted/30 transition-colors font-mono text-xs">
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] px-1.5 shrink-0',
                                log.level === 'error' && 'border-red-200 text-red-600 bg-red-50',
                                log.level === 'warn' && 'border-amber-200 text-amber-600 bg-amber-50',
                                log.level === 'info' && 'border-blue-200 text-blue-600 bg-blue-50',
                                log.level === 'debug' && 'border-gray-200 text-gray-500 bg-gray-50',
                              )}
                            >
                              {log.level.toUpperCase()}
                            </Badge>
                            <span className="truncate">{log.event}</span>
                            {log.data && typeof log.data === 'object' && (
                              <span className="text-muted-foreground truncate ml-auto">
                                {JSON.stringify(log.data).slice(0, 60)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Service Health */}
            {connectionData?.queueStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Message Queue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'Total', value: connectionData.queueStatus.total, color: 'text-foreground' },
                      { label: 'Pending', value: connectionData.queueStatus.pending, color: 'text-amber-600' },
                      { label: 'Processing', value: connectionData.queueStatus.processing, color: 'text-blue-600' },
                      { label: 'Failed', value: connectionData.queueStatus.failed, color: 'text-red-600' },
                    ].map(item => (
                      <div key={item.label} className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className={cn('text-2xl font-bold', item.color)}>{item.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}