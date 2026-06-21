import path from 'path';
import fs from 'fs';

// ============ CHROME PATH DETECTION ============
function detectChromePath(): string | undefined {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const linuxPaths = [
    '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
  ];
  for (const p of linuxPaths) {
    if (fs.existsSync(p)) return p;
  }

  const home = process.env.HOME || '/root';

  // Playwright
  const pwPaths = [
    path.join(home, '.cache/ms-playwright/chromium-1228/chrome-linux64/chrome'),
    path.join(home, '.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'),
  ];
  for (const p of pwPaths) {
    if (fs.existsSync(p)) return p;
  }

  // Puppeteer
  const puppeteerBase = path.join(home, '.cache/puppeteer/chrome');
  if (fs.existsSync(puppeteerBase)) {
    try {
      const dirs = fs.readdirSync(puppeteerBase).sort().reverse();
      for (const dir of dirs) {
        const chromePath = path.join(puppeteerBase, dir, 'chrome-linux64', 'chrome');
        if (fs.existsSync(chromePath)) return chromePath;
      }
    } catch {}
  }

  return undefined;
}

// ============ TYPES ============
export type WAStatus = 'offline' | 'connecting' | 'generating_qr' | 'connected' | 'disconnected' | 'reconnecting';

export interface WALog {
  timestamp: string;
  level: string;
  event: string;
  message: string;
}

// ============ SINGLETON ============
class WhatsAppManager {
  private client: any = null;
  private status: WAStatus = 'offline';
  private qrBase64: string | null = null;
  private phoneInfo: { phoneNumber?: string; pushName?: string; platform?: string } | null = null;
  private connectedAt: string | null = null;
  private messageCount = 0;
  private lastHeartbeat: string | null = null;
  private healthInterval: ReturnType<typeof setInterval> | null = null;
  private logs: WALog[] = [];
  private chromePath: string | undefined;
  private webhookUrl: string = '';
  private connectingPromise: Promise<{ success: boolean; status: WAStatus; message: string }> | null = null;

  constructor() {
    this.chromePath = detectChromePath();
    this.log('info', 'MANAGER_INIT', `Chrome: ${this.chromePath || 'NOT FOUND'}`);
  }

  // ============ LOGGING ============
  private log(level: string, event: string, message: string): void {
    const entry: WALog = { timestamp: new Date().toISOString(), level, event, message };
    this.logs.push(entry);
    if (this.logs.length > 500) this.logs.splice(0, this.logs.length - 500);
    const prefix = `[${entry.timestamp.split('T')[1].split('.')[0]}]`;
    if (level === 'error') console.error(`${prefix} [WA] ${event}: ${message}`);
    else if (level === 'warn') console.warn(`${prefix} [WA] ${event}: ${message}`);
    else console.log(`${prefix} [WA] ${event}: ${message}`);
  }

  // ============ SESSION STORAGE ============
  private getSessionDir(): string {
    const dir = path.join(process.cwd(), 'storage', 'whatsapp', 'sessions');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  // ============ PUBLIC API ============

  health(): { status: string } {
    return { status: 'online' };
  }

  getStatus(): {
    status: WAStatus;
    connected: boolean;
    phoneInfo: typeof this.phoneInfo;
    connectedAt: string | null;
    lastHeartbeat: string | null;
    messageCount: number;
    chromePath: string | null;
    qrAvailable: boolean;
  } {
    return {
      status: this.status,
      connected: this.status === 'connected',
      phoneInfo: this.phoneInfo,
      connectedAt: this.connectedAt,
      lastHeartbeat: this.lastHeartbeat,
      messageCount: this.messageCount,
      chromePath: this.chromePath || null,
      qrAvailable: !!this.qrBase64,
    };
  }

  getQr(): { connected: boolean; qr: string | null; message?: string } {
    if (this.status === 'connected') {
      return { connected: true, qr: null };
    }
    if (this.qrBase64) {
      return { connected: false, qr: this.qrBase64 };
    }
    return { connected: false, qr: null, message: 'No QR available. Start a connection first.' };
  }

  getLogs(limit = 50): WALog[] {
    return this.logs.slice(-limit).reverse();
  }

  // ============ CONNECT (async, returns immediately) ============

  async connect(webhookUrl?: string): Promise<{ success: boolean; status: WAStatus; message: string; qr?: string | null }> {
    if (this.status === 'connected') {
      return { success: true, status: 'connected', message: 'Already connected' };
    }
    if (this.status === 'connecting' || this.status === 'generating_qr' || this.status === 'reconnecting') {
      return { success: true, status: this.status, message: 'Connection in progress', qr: this.qrBase64 };
    }

    if (!this.chromePath) {
      this.log('error', 'CONNECT', 'No Chrome/Chromium found');
      return { success: false, status: 'offline', message: 'CHROME_NOT_FOUND: Install Chromium or set CHROME_PATH' };
    }

    if (this.connectingPromise) {
      return { success: true, status: this.status, message: 'Connection already in progress' };
    }

    this.webhookUrl = webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/webhook`;
    this.status = 'connecting';
    this.log('info', 'CONNECT', 'Starting connection...');

    this.connectingPromise = this.doConnect();
    this.connectingPromise.finally(() => { this.connectingPromise = null; });

    return { success: true, status: 'connecting', message: 'Connection initiated. Poll /api/whatsapp/connection?action=get-qr for QR code.' };
  }

  private async doConnect(): Promise<{ success: boolean; status: WAStatus; message: string }> {
    try {
      const { create } = await import('@open-wa/wa-automate');
      const sessionDir = this.getSessionDir();
      const sessionId = 'MOHDHMS';

      this.log('info', 'CONNECT', `Creating OpenWA client (session: ${sessionId})`);

      const client = await create({
        sessionId,
        sessionDataPath: path.join(sessionDir, sessionId),
        qrTimeout: 0,
        qrRefreshS: 20,
        killProcessOnBrowserClose: true,
        headless: true,
        useChrome: true,
        executablePath: this.chromePath,
        autoRefresh: true,
        cacheEnabled: true,
        restartOnCrash: true,
        disableSpins: true,
        waitForLogin: true,
        logLevel: 'WARN',
      });

      this.client = client;
      this.log('info', 'CONNECT', 'Client created, waiting for QR or session restore...');

      return new Promise((resolve, reject) => {
        // QR received
        client.onQR((qr: string) => {
          this.status = 'generating_qr';
          this.qrBase64 = qr;
          this.log('info', 'QR_GENERATED', 'QR code ready for scanning');
          this.forwardWebhook('session.qr', { qr, session: sessionId }).catch(() => {});
        });

        // Connected
        client.onReady(async () => {
          this.status = 'connected';
          this.qrBase64 = null;
          this.connectedAt = new Date().toISOString();
          this.lastHeartbeat = new Date().toISOString();
          this.log('info', 'CONNECTED', 'WhatsApp session connected!');

          try {
            const me = await client.getMe();
            this.phoneInfo = {
              phoneNumber: me?.me?.user || undefined,
              pushName: me?.pushName || undefined,
              platform: me?.platform || undefined,
            };
            this.log('info', 'CONNECTED', `Phone: ${this.phoneInfo.phoneNumber}, Name: ${this.phoneInfo.pushName}`);
          } catch {}

          this.forwardWebhook('session.connected', { phoneInfo: this.phoneInfo, session: sessionId }).catch(() => {});
          this.setupMessageHandler();
          this.startHealthMonitor();

          resolve({ success: true, status: 'connected', message: 'WhatsApp connected successfully!' });
        });

        // State changes
        client.onStateChanged((state: string) => {
          this.log('info', 'STATE_CHANGE', `New state: ${state}`);
          if (state === 'UNLAUNCHED') {
            this.status = 'disconnected';
            this.log('error', 'STATE_CHANGE', 'Browser closed before QR scan');
            reject(new Error('Browser closed before QR scan'));
          }
          if (state === 'CONFLICT' || state === 'DISCONNECTED' || state === 'UNPAIRED') {
            this.status = 'disconnected';
            this.log('warn', 'STATE_CHANGE', `Session: ${state}`);
            this.forwardWebhook('session.disconnected', { reason: state }).catch(() => {});
            this.attemptReconnect();
          }
        });
      });
    } catch (error) {
      this.status = 'disconnected';
      const msg = error instanceof Error ? error.message : 'Failed to create client';
      this.log('error', 'CONNECT_FAIL', msg);
      return { success: false, status: 'offline', message: msg };
    }
  }

  // ============ DISCONNECT ============

  async disconnect(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.client && typeof this.client.kill === 'function') {
        await this.client.kill();
      }
    } catch (err) {
      this.log('warn', 'DISCONNECT', `Kill error: ${err instanceof Error ? err.message : String(err)}`);
    }

    this.client = null;
    this.status = 'disconnected';
    this.qrBase64 = null;
    this.connectedAt = null;
    this.phoneInfo = null;

    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }

    this.log('info', 'DISCONNECT', 'Session stopped');
    return { success: true, message: 'Disconnected' };
  }

  // ============ SEND MESSAGE ============

  async send(chatId: string, text: string): Promise<{ success: boolean; id?: string; error?: string }> {
    if (this.status !== 'connected' || !this.client) {
      return { success: false, error: 'WhatsApp not connected' };
    }
    try {
      const result = await this.client.sendText(chatId, text);
      this.messageCount++;
      this.log('info', 'MESSAGE_SENT', `To ${chatId}, ID: ${result?.id}`);
      return { success: true, id: result?.id };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Send failed';
      this.log('error', 'SEND_FAIL', msg);
      return { success: false, error: msg };
    }
  }

  // ============ MESSAGE HANDLER ============

  private setupMessageHandler(): void {
    if (!this.client) return;

    this.client.onMessage(async (msg: any) => {
      this.messageCount++;
      this.log('info', 'MESSAGE_RECEIVED', `From: ${msg.from}, Type: ${msg.type}`);

      await this.forwardWebhook('message', {
        id: msg.id?.id || msg.id || undefined,
        from: msg.from,
        to: msg.to,
        body: msg.body || msg.caption || '',
        type: msg.type,
        timestamp: msg.timestamp || Date.now(),
        hasMedia: msg.hasMedia || false,
        mimetype: msg.mimetype,
        caption: msg.caption,
        chatId: msg.chatId,
        chatName: msg.chat?.name || undefined,
        senderName: msg.sender?.pushName || msg.pushName || undefined,
        isGroupMsg: msg.isGroupMsg || false,
        location: (msg.type === 'location' && msg.lat && msg.lng) ? { lat: msg.lat, lng: msg.lng, address: msg.loc } : undefined,
        fileName: msg.filename,
        fileSize: msg.filesize,
      });
    });
  }

  // ============ HEALTH MONITOR ============

  private startHealthMonitor(): void {
    if (this.healthInterval) clearInterval(this.healthInterval);
    this.healthInterval = setInterval(async () => {
      if (this.status !== 'connected' || !this.client) return;
      try {
        if (typeof this.client.getState === 'function') {
          const state = await this.client.getState();
          if (state !== 'CONNECTED') {
            this.log('warn', 'HEALTH_CHECK', `Unexpected state: ${state}`);
            this.status = 'disconnected';
            this.attemptReconnect();
          } else {
            this.lastHeartbeat = new Date().toISOString();
          }
        }
      } catch (err) {
        this.log('error', 'HEALTH_CHECK', `Failed: ${err instanceof Error ? err.message : String(err)}`);
        this.attemptReconnect();
      }
    }, 30000);
  }

  // ============ AUTO RECONNECT ============

  private attemptReconnect(): void {
    if (this.status === 'connecting' || this.status === 'reconnecting' || this.status === 'generating_qr') return;
    this.status = 'reconnecting';
    this.log('info', 'RECONNECT', 'Attempting reconnect...');
    setTimeout(async () => {
      try {
        if (this.client) {
          try { await this.client.kill(); } catch {}
        }
        this.client = null;
        await this.doConnect();
      } catch (err) {
        this.status = 'disconnected';
        this.log('error', 'RECONNECT_FAIL', err instanceof Error ? err.message : String(err));
      }
    }, 5000);
  }

  // ============ WEBHOOK ============

  private async forwardWebhook(event: string, data: Record<string, unknown>): Promise<boolean> {
    if (!this.webhookUrl) return false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, type: event, data, timestamp: new Date().toISOString() }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) return true;
      } catch {}
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
    return false;
  }

  // ============ LEGACY API COMPAT ============

  getSessionInfo() {
    return {
      session: 'MOHDHMS',
      status: this.mapStatus(this.status),
      qrAvailable: !!this.qrBase64,
      phoneInfo: this.phoneInfo,
      connectedAt: this.connectedAt,
      lastHeartbeat: this.lastHeartbeat,
      messageCount: this.messageCount,
      uptime: this.connectedAt ? Math.round((Date.now() - new Date(this.connectedAt).getTime()) / 1000) : 0,
    };
  }

  getQrCode() {
    return {
      qr: this.qrBase64,
      session: 'MOHDHMS',
      timestamp: new Date().toISOString(),
    };
  }

  getState() {
    return {
      state: this.mapStatus(this.status),
      session: 'MOHDHMS',
      timestamp: new Date().toISOString(),
    };
  }

  getHealthStats() {
    return { sessions: this.status === 'connected' ? { MOHDHMS: 'CONNECTED' } : {} };
  }

  private mapStatus(s: WAStatus): string {
    const map: Record<WAStatus, string> = {
      offline: 'DISCONNECTED', connecting: 'CONNECTING', generating_qr: 'QR_READY',
      connected: 'CONNECTED', disconnected: 'DISCONNECTED', reconnecting: 'CONNECTING',
    };
    return map[s];
  }

  async sendTestMessage(chatId?: string) {
    if (this.status !== 'connected' || !this.client) {
      return { success: false, message: 'Session not connected. Please connect WhatsApp first.', timestamp: new Date().toISOString() };
    }
    let targetChatId = chatId;
    if (!targetChatId) {
      try {
        const me = await this.client.getMe();
        targetChatId = `${me.me.user}@s.whatsapp.net`;
      } catch {
        return { success: false, message: 'Could not determine self-chat ID', timestamp: new Date().toISOString() };
      }
    }
    const result = await this.send(targetChatId, '✅ WhatsApp connection successful!\n\nThis is a test message from MOHD.HMS Enterprise CMMS.');
    return {
      success: result.success,
      message: result.success ? 'Test message sent successfully!' : `Failed: ${result.error}`,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============ EXPORT SINGLETON ============
// This persists across requests in the same process
const globalForWA = globalThis as unknown as { _whatsappManager?: WhatsAppManager };
export const waManager = globalForWA._whatsappManager || (globalForWA._whatsappManager = new WhatsAppManager());