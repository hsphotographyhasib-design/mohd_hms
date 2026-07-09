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

// ============ OpenWA Provider ============

class OpenWAProvider implements WhatsAppProviderInterface {
  private baseUrl: string;
  private session: string;
  private apiKey: string;
  private status: ConnectionStatus = 'disconnected';

  constructor(config: WhatsAppConfig) {
    this.baseUrl = config.openwaBaseUrl || 'http://localhost:3001';
    this.session = config.openwaSession || 'default';
    this.apiKey = config.openwaApiKey || '';
    if (config.openwaStatus === 'connected') this.status = 'connected';
  }

  private formatPhone(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return cleaned.includes('@') ? cleaned : `${cleaned}@s.whatsapp.net`;
  }

  async sendMessage(to: string, message: string, options?: SendMessageOptions): Promise<SendMessageResult> {
    try {
      const chatId = this.formatPhone(to);
      const res = await fetch(`${this.baseUrl}/api/sendTextMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: this.apiKey },
        body: JSON.stringify({ session: this.session, chatId, text: message }),
      });
      const data = await res.json();
      if (data.error) {
        return { success: false, error: data.error, timestamp: new Date().toISOString() };
      }
      return { success: true, providerMessageId: data.id || data.key?.id, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() };
    }
  }

  async sendMedia(to: string, mediaUrl: string, caption?: string, type?: string): Promise<SendMessageResult> {
    try {
      const chatId = this.formatPhone(to);
      const endpoint = type === 'video' ? 'sendVideoMessage' : type === 'audio' ? 'sendAudioMessage' : 'sendImageMessage';
      const res = await fetch(`${this.baseUrl}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: this.apiKey },
        body: JSON.stringify({ session: this.session, chatId, media: mediaUrl, caption: caption || '' }),
      });
      const data = await res.json();
      if (data.error) {
        return { success: false, error: data.error, timestamp: new Date().toISOString() };
      }
      return { success: true, providerMessageId: data.id || data.key?.id, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() };
    }
  }

  async getStatus(): Promise<ConnectionStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/api/getState?key=${this.apiKey}&session=${this.session}`);
      const data = await res.json();
      this.status = data.state === 'CONNECTED' ? 'connected' : 'disconnected';
      return this.status;
    } catch {
      return 'disconnected';
    }
  }

  async connect(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/api/startSession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: this.apiKey },
        body: JSON.stringify({ session: this.session }),
      });
      const data = await res.json();
      if (data.state === 'CONNECTED') {
        this.status = 'connected';
      } else if (data.qr) {
        this.status = 'connecting';
      }
    } catch (error) {
      this.status = 'disconnected';
      throw new Error(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/closeSession`, {
        method: 'DELETE',
        headers: { apikey: this.apiKey },
      });
      this.status = 'disconnected';
    } catch (error) {
      throw new Error(`Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getQrCode(): Promise<string | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/getQrCode?key=${this.apiKey}&session=${this.session}`);
      const data = await res.json();
      return data.qr || null;
    } catch {
      return null;
    }
  }
}

// ============ Meta Cloud API Provider ============

class MetaProvider implements WhatsAppProviderInterface {
  private accessToken: string;
  private phoneNumberId: string;
  private status: ConnectionStatus = 'connected'; // Meta is always connected if token valid

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
    // Meta uses token-based auth — no session to connect
    if (!this.accessToken) throw new Error('Meta access token not configured');
  }

  async disconnect(): Promise<void> {
    // Meta uses token-based auth — no session to disconnect
  }

  async getQrCode(): Promise<string | null> {
    return null; // Meta doesn't use QR codes
  }
}

// ============ Twilio Provider ============

class TwilioProvider implements WhatsAppProviderInterface {
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;
  private status: ConnectionStatus = 'connected'; // Twilio is always connected if creds valid

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

  async disconnect(): Promise<void> {
    // Twilio doesn't need session management
  }

  async getQrCode(): Promise<string | null> {
    return null; // Twilio doesn't use QR codes
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