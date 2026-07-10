import type { WhatsAppConfig } from '@prisma/client';

// ============ Types ============

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export interface SendMessageOptions {
  sessionId?: string;
  isTemplate?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SendMessageResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  timestamp: string;
}

export interface WhatsAppProviderInterface {
  sendMessage(to: string, message: string, options?: SendMessageOptions): Promise<SendMessageResult>;
  sendMedia(to: string, mediaUrl: string, caption?: string, type?: string): Promise<SendMessageResult>;
  getStatus(): Promise<ConnectionStatus>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getQrCode(): Promise<string | null>;
}

// ============ OpenWA Provider (v0.8+ API) ============

class OpenWAProvider implements WhatsAppProviderInterface {
  private baseUrl: string;
  private sessionName: string;
  private sessionId: string | null = null;
  private apiKey: string;
  private status: ConnectionStatus = 'disconnected';

  constructor(config: WhatsAppConfig) {
    // New OpenWA default port is 3002
    this.baseUrl = config.openwaBaseUrl || 'http://localhost:3002';
    this.sessionName = config.openwaSession || 'MOHDHMS';
    this.apiKey = config.openwaApiKey || 'dev-admin-key';
    if (config.openwaStatus === 'connected') this.status = 'connected';
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
  }

  private formatPhone(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return cleaned.includes('@') ? cleaned : `${cleaned}@s.whatsapp.net`;
  }

  /** Resolve session ID by name, caching it for subsequent calls */
  private async resolveSessionId(): Promise<string | null> {
    if (this.sessionId) return this.sessionId;

    try {
      const res = await fetch(`${this.baseUrl}/api/sessions`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const sessions = await res.json() as Array<{ id: string; name: string }>;
      const match = sessions.find(s => s.name === this.sessionName);
      if (match) {
        this.sessionId = match.id;
        return match.id;
      }
    } catch {
      // Service may not be running
    }
    return null;
  }

  async sendMessage(to: string, message: string, options?: SendMessageOptions): Promise<SendMessageResult> {
    const sessionId = options?.sessionId || await this.resolveSessionId();
    if (!sessionId) {
      return { success: false, error: 'No active WhatsApp session', timestamp: new Date().toISOString() };
    }

    try {
      const chatId = this.formatPhone(to);
      const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/messages/send-text`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ chatId, text: message }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json() as { id?: string; key?: { id?: string }; error?: string; message?: string };

      if (!res.ok) {
        return { success: false, error: data.error || data.message || `HTTP ${res.status}`, timestamp: new Date().toISOString() };
      }

      return {
        success: true,
        providerMessageId: data.id || data.key?.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() };
    }
  }

  async sendMedia(to: string, mediaUrl: string, caption?: string, type?: string): Promise<SendMessageResult> {
    const sessionId = await this.resolveSessionId();
    if (!sessionId) {
      return { success: false, error: 'No active WhatsApp session', timestamp: new Date().toISOString() };
    }

    try {
      const chatId = this.formatPhone(to);
      const mediaType = type === 'video' ? 'send-video' : type === 'audio' ? 'send-audio' : 'send-image';

      const body: Record<string, unknown> = { chatId, url: mediaUrl };
      if (caption && mediaType !== 'send-audio') {
        body.caption = caption;
      }
      if (type === 'audio') {
        // For PTT (push-to-talk / voice note)
        // body.ptt = true; // Uncomment if voice note behavior is desired
      }

      const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/messages/${mediaType}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json() as { id?: string; key?: { id?: string }; error?: string; message?: string };

      if (!res.ok) {
        return { success: false, error: data.error || data.message || `HTTP ${res.status}`, timestamp: new Date().toISOString() };
      }

      return {
        success: true,
        providerMessageId: data.id || data.key?.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() };
    }
  }

  async getStatus(): Promise<ConnectionStatus> {
    const sessionId = await this.resolveSessionId();
    if (!sessionId) return 'disconnected';

    try {
      const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return 'disconnected';
      const data = await res.json() as { status: string };
      // Map OpenWA statuses: ready=connected, qr_ready/connecting=connecting, else=disconnected
      this.status = data.status === 'ready' ? 'connected' :
                    ['qr_ready', 'initializing', 'authenticating'].includes(data.status) ? 'connecting' :
                    'disconnected';
      return this.status;
    } catch {
      return 'disconnected';
    }
  }

  async connect(): Promise<void> {
    // Provider-level connect is handled by the manager, but we can do a lightweight check
    const status = await this.getStatus();
    if (status === 'connected') return;
    throw new Error(`Session not ready (status: ${status}). Use the connection manager to start the session.`);
  }

  async disconnect(): Promise<void> {
    const sessionId = await this.resolveSessionId();
    if (!sessionId) return;

    try {
      await fetch(`${this.baseUrl}/api/sessions/${sessionId}/stop`, {
        method: 'POST',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(10000),
      });
      this.status = 'disconnected';
      this.sessionId = null;
    } catch (error) {
      throw new Error(`Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getQrCode(): Promise<string | null> {
    const sessionId = await this.resolveSessionId();
    if (!sessionId) return null;

    try {
      const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/qr`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const data = await res.json() as { qr?: string; image?: string };
      return data.qr || data.image || null;
    } catch {
      return null;
    }
  }
}

// ============ Meta Cloud API Provider ============

class MetaProvider implements WhatsAppProviderInterface {
  private accessToken: string;
  private phoneNumberId: string;
  private status: ConnectionStatus = 'connected';

  constructor(config: WhatsAppConfig) {
    this.accessToken = config.metaAccessToken || '';
    this.phoneNumberId = config.metaPhoneNumberId || '';
  }

  private formatPhone(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }

  async sendMessage(to: string, message: string, _options?: SendMessageOptions): Promise<SendMessageResult> {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: this.formatPhone(to),
            type: 'text',
            text: { body: message },
          }),
        }
      );
      const data = await res.json();
      if (data.error) {
        return { success: false, error: data.error.message, timestamp: new Date().toISOString() };
      }
      return { success: true, providerMessageId: data.messages?.[0]?.id, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() };
    }
  }

  async sendMedia(to: string, mediaUrl: string, caption?: string, type?: string): Promise<SendMessageResult> {
    try {
      const mediaType = type === 'video' ? 'video' : type === 'audio' ? 'audio' : 'image';
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        to: this.formatPhone(to),
        type: mediaType,
        [mediaType]: { link: mediaUrl },
      };
      if (caption && mediaType !== 'audio') {
        (payload[mediaType] as Record<string, unknown>).caption = caption;
      }
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (data.error) {
        return { success: false, error: data.error.message, timestamp: new Date().toISOString() };
      }
      return { success: true, providerMessageId: data.messages?.[0]?.id, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() };
    }
  }

  async getStatus(): Promise<ConnectionStatus> {
    return this.accessToken ? 'connected' : 'disconnected';
  }

  async connect(): Promise<void> {
    if (!this.accessToken) throw new Error('Meta access token not configured');
  }

  async disconnect(): Promise<void> {}

  async getQrCode(): Promise<string | null> {
    return null;
  }
}

// ============ Twilio Provider ============

class TwilioProvider implements WhatsAppProviderInterface {
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;
  private status: ConnectionStatus = 'connected';

  constructor(config: WhatsAppConfig) {
    this.accountSid = config.twilioAccountSid || '';
    this.authToken = config.twilioAuthToken || '';
    this.phoneNumber = config.twilioPhoneNumber || '';
  }

  private formatPhone(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }

  async sendMessage(to: string, message: string, _options?: SendMessageOptions): Promise<SendMessageResult> {
    try {
      const from = this.formatPhone(this.phoneNumber);
      const toFormatted = `whatsapp:${this.formatPhone(to)}`;
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From: `whatsapp:${from}`, To: toFormatted, Body: message }).toString(),
        }
      );
      const data = await res.json();
      if (data.code) {
        return { success: false, error: data.message, timestamp: new Date().toISOString() };
      }
      return { success: true, providerMessageId: data.sid, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() };
    }
  }

  async sendMedia(to: string, mediaUrl: string, caption?: string, _type?: string): Promise<SendMessageResult> {
    try {
      const from = this.formatPhone(this.phoneNumber);
      const toFormatted = `whatsapp:${this.formatPhone(to)}`;
      const params: Record<string, string> = {
        From: `whatsapp:${from}`,
        To: toFormatted,
        MediaUrl: mediaUrl,
      };
      if (caption) params.Body = caption;

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(params).toString(),
        }
      );
      const data = await res.json();
      if (data.code) {
        return { success: false, error: data.message, timestamp: new Date().toISOString() };
      }
      return { success: true, providerMessageId: data.sid, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() };
    }
  }

  async getStatus(): Promise<ConnectionStatus> {
    return this.accountSid && this.authToken ? 'connected' : 'disconnected';
  }

  async connect(): Promise<void> {
    if (!this.accountSid || !this.authToken) throw new Error('Twilio credentials not configured');
  }

  async disconnect(): Promise<void> {}

  async getQrCode(): Promise<string | null> {
    return null;
  }
}

// ============ Factory ============

export function createProvider(config: WhatsAppConfig): WhatsAppProviderInterface {
  switch (config.provider) {
    case 'openwa':
      return new OpenWAProvider(config);
    case 'meta':
      return new MetaProvider(config);
    case 'twilio':
      return new TwilioProvider(config);
    default:
      return new OpenWAProvider(config);
  }
}

// Helper: render a template string with variables
export function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}