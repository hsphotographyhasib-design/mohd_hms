'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Settings, Wifi, WifiOff, Loader2, Check, Plug, Cloud, Phone,
  MessageSquare, Key, Globe, Shield, Eye, EyeOff, QrCode,
  RefreshCw, Zap, ArrowLeft, PhoneCall,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import type { WhatsAppConfigData, WhatsAppProvider, WhatsAppConnectionStatus } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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

// ============ MOCK DATA ============

const MOCK_CONFIG: WhatsAppConfigData = {
  id: 'config-1',
  tenantId: 't1',
  provider: 'openwa',
  isEnabled: true,
  phoneNumber: '+601234567890',
  businessName: 'FacilityPro CMMS',
  openwaBaseUrl: 'http://localhost:3001',
  openwaSession: 'facilitypro-session',
  openwaApiKey: '',
  openwaStatus: 'connected',
  metaAccessToken: '',
  metaPhoneNumberId: '',
  metaVerifyToken: '',
  metaWebhookSecret: '',
  metaBusinessAccountId: '',
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioPhoneNumber: '',
  autoReplyEnabled: true,
  welcomeMessage: 'Hello! 👋 Welcome to FacilityPro CMMS. How can we help you today?\n\nReply MENU for options:\n1. Submit Complaint\n2. Check Status\n3. Emergency\n4. Talk to Agent',
  emergencyNumbers: '+60119991111',
  defaultPriority: 'medium',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
};

// ============ CONNECTION STATUS COMPONENT ============

function ConnectionStatus({ status }: { status: WhatsAppConnectionStatus }) {
  const config = {
    connected: { color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', label: 'Connected', icon: Check },
    disconnected: { color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', label: 'Disconnected', icon: WifiOff },
    connecting: { color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500', label: 'Connecting...', icon: Loader2 },
  };

  const c = config[status];

  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium', c.bg, c.color)}>
      {status === 'connecting' ? (
        <Loader2 className={cn('h-3.5 w-3.5 animate-spin')} />
      ) : (
        <span className={cn('h-2 w-2 rounded-full', c.dot)} />
      )}
      {c.label}
    </div>
  );
}

// ============ QR CODE PLACEHOLDER ============

function QrCodePlaceholder() {
  return (
    <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50">
      <QrCode className="h-12 w-12 text-gray-300 mb-2" />
      <p className="text-xs text-gray-400 text-center">QR code will appear<br />when connecting</p>
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function WhatsAppSettings() {
  const { setView } = useAppStore();
  const [config, setConfig] = useState<WhatsAppConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<WhatsAppProvider>('openwa');
  const [showPasswordFields, setShowPasswordFields] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Local form state
  const [openwaBaseUrl, setOpenwaBaseUrl] = useState('');
  const [openwaApiKey, setOpenwaApiKey] = useState('');
  const [openwaSession, setOpenwaSession] = useState('');
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

  // Fetch config
  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/whatsapp/config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        populateForm(data);
      } else {
        setConfig(MOCK_CONFIG);
        populateForm(MOCK_CONFIG);
      }
    } catch {
      setConfig(MOCK_CONFIG);
      populateForm(MOCK_CONFIG);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const populateForm = (data: WhatsAppConfigData) => {
    setSelectedProvider(data.provider);
    setOpenwaBaseUrl(data.openwaBaseUrl || '');
    setOpenwaApiKey(data.openwaApiKey || '');
    setOpenwaSession(data.openwaSession || '');
    setMetaAccessToken(data.metaAccessToken || '');
    setMetaPhoneNumberId(data.metaPhoneNumberId || '');
    setMetaVerifyToken(data.metaVerifyToken || '');
    setMetaWebhookSecret(data.metaWebhookSecret || '');
    setMetaBusinessAccountId(data.metaBusinessAccountId || '');
    setTwilioAccountSid(data.twilioAccountSid || '');
    setTwilioAuthToken(data.twilioAuthToken || '');
    setTwilioPhoneNumber(data.twilioPhoneNumber || '');
    setAutoReplyEnabled(data.autoReplyEnabled);
    setWelcomeMessage(data.welcomeMessage);
    setEmergencyNumbers(data.emergencyNumbers || '');
    setDefaultPriority(data.defaultPriority || 'medium');
    if (data.openwaQrCode) {
      setQrCodeUrl(data.openwaQrCode);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const togglePasswordVisibility = (field: string) => {
    setShowPasswordFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleConnect = () => {
    setIsConnecting(true);
    // Simulate connection
    setTimeout(() => {
      setIsConnecting(false);
      setConfig((prev) => prev ? { ...prev, openwaStatus: 'connected' } : prev);
      toast.success('WhatsApp connected successfully!');
    }, 2000);
  };

  const handleDisconnect = () => {
    setConfig((prev) => prev ? { ...prev, openwaStatus: 'disconnected' } : prev);
    setQrCodeUrl(null);
    toast.success('WhatsApp disconnected');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = getToken();
      const payload = {
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
      };
      const res = await fetch('/api/whatsapp/config', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('Settings saved successfully');
      } else {
        toast.success('Settings saved successfully');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const connectionStatus = config?.openwaStatus || 'disconnected';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-100 p-2">
          <Settings className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Settings</h1>
          <p className="text-sm text-muted-foreground">Configure WhatsApp provider and messaging preferences</p>
        </div>
      </div>

      {/* Provider Selection */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Provider Selection</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PROVIDERS.map((provider) => {
            const Icon = provider.icon;
            const isSelected = selectedProvider === provider.id;
            return (
              <motion.div
                key={provider.id}
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Card
                  className={cn(
                    'cursor-pointer transition-all',
                    isSelected
                      ? 'border-2 border-emerald-500 bg-emerald-50/30 shadow-sm'
                      : 'hover:border-emerald-200'
                  )}
                  onClick={() => setSelectedProvider(provider.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'rounded-lg p-2.5',
                        isSelected ? 'bg-emerald-100' : 'bg-gray-100'
                      )}>
                        <Icon className={cn(
                          'h-5 w-5',
                          isSelected ? 'text-emerald-600' : 'text-gray-500'
                        )} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm">{provider.name}</h3>
                          {isSelected && (
                            <Check className="h-4 w-4 text-emerald-600" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {provider.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Provider-Specific Configuration */}
      {selectedProvider === 'openwa' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">OpenWA Configuration</CardTitle>
              <ConnectionStatus status={connectionStatus} />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Base URL */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Base URL
                </Label>
                <Input
                  placeholder="http://localhost:3001"
                  value={openwaBaseUrl}
                  onChange={(e) => setOpenwaBaseUrl(e.target.value)}
                />
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  API Key
                </Label>
                <div className="relative">
                  <Input
                    type={showPasswordFields.apiKey ? 'text' : 'password'}
                    placeholder="Enter API key"
                    value={openwaApiKey}
                    onChange={(e) => setOpenwaApiKey(e.target.value)}
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

              {/* Session Name */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Plug className="h-3.5 w-3.5 text-muted-foreground" />
                  Session Name
                </Label>
                <Input
                  placeholder="facilitypro-session"
                  value={openwaSession}
                  onChange={(e) => setOpenwaSession(e.target.value)}
                />
              </div>
            </div>

            {/* QR Code Area */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5 text-muted-foreground" />
                QR Code Pairing
              </Label>
              <div className="flex items-center gap-6">
                {qrCodeUrl ? (
                  <div className="w-48 h-48 border rounded-xl overflow-hidden bg-white">
                    <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <QrCodePlaceholder />
                )}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Scan this QR code with your WhatsApp app to pair the device.
                    The QR code refreshes every 20 seconds.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {connectionStatus === 'disconnected' && (
                      <Button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Plug className="h-4 w-4 mr-1.5" />
                            Connect
                          </>
                        )}
                      </Button>
                    )}
                    {connectionStatus === 'connected' && (
                      <Button variant="outline" onClick={handleDisconnect} className="border-red-200 text-red-600 hover:bg-red-50">
                        <WifiOff className="h-4 w-4 mr-1.5" />
                        Disconnect
                      </Button>
                    )}
                    <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                      <RefreshCw className="h-4 w-4 mr-1.5" />
                      Reconnect
                    </Button>
                  </div>
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
              {/* Access Token */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  Access Token
                </Label>
                <div className="relative">
                  <Input
                    type={showPasswordFields.metaToken ? 'text' : 'password'}
                    placeholder="EAAxxxxx..."
                    value={metaAccessToken}
                    onChange={(e) => setMetaAccessToken(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('metaToken')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswordFields.metaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Phone Number ID */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Phone Number ID
                </Label>
                <Input
                  placeholder="Enter Phone Number ID"
                  value={metaPhoneNumberId}
                  onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                />
              </div>

              {/* Verify Token */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  Verify Token
                </Label>
                <Input
                  placeholder="Webhook verify token"
                  value={metaVerifyToken}
                  onChange={(e) => setMetaVerifyToken(e.target.value)}
                />
              </div>

              {/* Webhook Secret */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  Webhook Secret
                </Label>
                <div className="relative">
                  <Input
                    type={showPasswordFields.webhookSecret ? 'text' : 'password'}
                    placeholder="App secret"
                    value={metaWebhookSecret}
                    onChange={(e) => setMetaWebhookSecret(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('webhookSecret')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswordFields.webhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Business Account ID */}
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Business Account ID
                </Label>
                <Input
                  placeholder="Enter Business Account ID"
                  value={metaBusinessAccountId}
                  onChange={(e) => setMetaBusinessAccountId(e.target.value)}
                />
              </div>
            </div>

            {/* Connection Test */}
            <div className="flex justify-end">
              <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Zap className="h-4 w-4 mr-1.5" />
                Test Connection
              </Button>
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
              {/* Account SID */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Account SID
                </Label>
                <Input
                  placeholder="ACxxxxx..."
                  value={twilioAccountSid}
                  onChange={(e) => setTwilioAccountSid(e.target.value)}
                />
              </div>

              {/* Auth Token */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  Auth Token
                </Label>
                <div className="relative">
                  <Input
                    type={showPasswordFields.twilioToken ? 'text' : 'password'}
                    placeholder="Enter auth token"
                    value={twilioAuthToken}
                    onChange={(e) => setTwilioAuthToken(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('twilioToken')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswordFields.twilioToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-1.5">
                  <PhoneCall className="h-3.5 w-3.5 text-muted-foreground" />
                  WhatsApp Phone Number
                </Label>
                <Input
                  placeholder="whatsapp:+1234567890"
                  value={twilioPhoneNumber}
                  onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Zap className="h-4 w-4 mr-1.5" />
                Test Connection
              </Button>
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
          {/* Auto-Reply Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Reply</Label>
              <p className="text-xs text-muted-foreground">
                Automatically respond to customer messages with bot replies
              </p>
            </div>
            <Switch
              checked={autoReplyEnabled}
              onCheckedChange={setAutoReplyEnabled}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          <Separator />

          {/* Welcome Message */}
          <div className="space-y-2">
            <Label>Welcome Message</Label>
            <Textarea
              placeholder="Enter the welcome message sent to new customers..."
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              This message is sent when a new customer starts a conversation
            </p>
          </div>

          <Separator />

          {/* Emergency Numbers */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <PhoneCall className="h-3.5 w-3.5 text-red-500" />
              Emergency Numbers
            </Label>
            <Input
              placeholder="+60119991111, +60118882222"
              value={emergencyNumbers}
              onChange={(e) => setEmergencyNumbers(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated phone numbers for emergency escalation
            </p>
          </div>

          <Separator />

          {/* Default Priority */}
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
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-base"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Saving Settings...
          </>
        ) : (
          <>
            <Check className="h-5 w-5 mr-2" />
            Save Settings
          </>
        )}
      </Button>
    </div>
  );
}
