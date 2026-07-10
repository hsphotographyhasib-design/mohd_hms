import path from 'node:path';
import fs from 'node:fs';
import { spawn, ChildProcess, execSync } from 'node:child_process';

// ============ CONFIGURATION ============
const SERVICE_URL = process.env.OPENWA_SERVICE_URL || 'http://127.0.0.1:3002';
const SERVICE_DIR = path.resolve(process.cwd(), 'mini-services', 'openwa');
const DEFAULT_SESSION_NAME = process.env.OPENWA_SESSION_NAME || 'MOHDHMS';
const DEFAULT_API_KEY = process.env.OPENWA_API_KEY || 'dev-admin-key';

// ============ TYPES ============
export type WAStatus = 'offline' | 'connecting' | 'generating_qr' | 'connected' | 'disconnected' | 'reconnecting';

interface WALog {
  timestamp: string;
  level: string;
  event: string;
  message: string;
}

/** OpenWA session object from /api/sessions/:id */
interface OpenWASession {
  id: string;
  name: string;
  status: string; // created | initializing | qr_ready | authenticating | ready | disconnected | failed
  phone?: string;
  pushName?: string;
  createdAt?: string;
}

// ============ SINGLETON ============
class WhatsAppServiceManager {
  private serviceProcess: ChildProcess | null = null;
  private status: WAStatus = 'offline';
  private qrBase64: string | null = null;
  private sessionId: string | null = null;
  private phoneInfo: { phoneNumber?: string; pushName?: string } | null = null;
  private connectedAt: string | null = null;
  private messageCount = 0;
  private logs: WALog[] = [];
  private connecting = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private apiKey = DEFAULT_API_KEY;

  constructor() {
    this.log('info', 'INIT', `OpenWA Service URL: ${SERVICE_URL}`);
    this.log('info', 'INIT', `Session name: ${DEFAULT_SESSION_NAME}`);
  }

  private log(level: string, event: string, message: string): void {
    const entry: WALog = { timestamp: new Date().toISOString(), level, event, message };
    this.logs.push(entry);
    if (this.logs.length > 500) this.logs.splice(0, this.logs.length - 500);
    console.log(`[WA Manager] [${entry.timestamp.split('T')[1].split('.')[0]}] [${event}] ${message}`);
  }

  // ============ HTTP HELPERS (new OpenWA API) ============
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
  }

  private async httpGet<T>(endpoint: string, timeoutMs = 5000): Promise<T | null> {
    try {
      const res = await fetch(`${SERVICE_URL}${endpoint}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return (await res.json()) as T;
      const err = await res.text().catch(() => '');
      this.log('error', 'HTTP_GET', `${endpoint} → ${res.status}: ${err.substring(0, 200)}`);
      return null;
    } catch (err) {
      this.log('error', 'HTTP_GET', `${endpoint} → ${err instanceof Error ? err.message : 'Network error'}`);
      return null;
    }
  }

  private async httpPost<T>(endpoint: string, body?: Record<string, unknown>, timeoutMs = 15000): Promise<{ data: T | null; status: number }> {
    try {
      const res = await fetch(`${SERVICE_URL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) as T : null;
        return { data, status: res.status };
      }
      const err = await res.text().catch(() => '');
      this.log('error', 'HTTP_POST', `${endpoint} → ${res.status}: ${err.substring(0, 200)}`);
      return { data: null, status: res.status };
    } catch (err) {
      this.log('error', 'HTTP_POST', `${endpoint} → ${err instanceof Error ? err.message : 'Network error'}`);
      return { data: null, status: 0 };
    }
  }

  private async httpDelete(endpoint: string, timeoutMs = 5000): Promise<boolean> {
    try {
      const res = await fetch(`${SERVICE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(timeoutMs),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ============ ENSURE SERVICE IS RUNNING ============
  private async ensureService(): Promise<boolean> {
    // Check if service is already healthy
    const health = await this.httpGet<{ status: string }>('/api/health', 3000);
    if (health && health.status === 'ok') {
      this.log('info', 'SERVICE_CHECK', 'OpenWA service already running');
      return true;
    }

    this.log('info', 'SERVICE_START', 'Starting OpenWA service...');

    // Kill any existing process on port 3002
    try {
      execSync('fuser -k 3002/tcp 2>/dev/null || true', { timeout: 5000 });
    } catch {}

    // Check if dist/main.js exists (built OpenWA)
    const mainPath = path.join(SERVICE_DIR, 'dist', 'main.js');
    const indexPath = path.join(SERVICE_DIR, 'index.ts');

    if (!fs.existsSync(mainPath) && !fs.existsSync(indexPath)) {
      this.log('error', 'SERVICE_START', `OpenWA service not found at ${SERVICE_DIR}`);
      return false;
    }

    // Start the service
    const useNode = fs.existsSync(mainPath);
    const cmd = useNode ? 'node' : 'npm';
    const args = useNode ? ['dist/main.js'] : ['run', 'start:prod'];

    this.serviceProcess = spawn(cmd, args, {
      cwd: SERVICE_DIR,
      env: {
        ...process.env,
        PORT: '3002',
        ENGINE_TYPE: 'baileys',
        DATABASE_TYPE: 'sqlite',
        ALLOW_DEV_API_KEY: 'true',
        AUTO_START_SESSIONS: 'true',
        CORS_ORIGINS: '*',
        SERVE_DASHBOARD: 'false',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    });

    const pid = this.serviceProcess.pid;
    this.log('info', 'SERVICE_START', `Process started (PID: ${pid}), using ${useNode ? 'node dist/main.js' : 'npm run start:prod'}`);

    // Log service output
    this.serviceProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString().trim();
      if (text) {
        this.log('info', 'SERVICE_STDOUT', text.substring(0, 300));
      }
    });

    this.serviceProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString().trim();
      if (text) {
        this.log('warn', 'SERVICE_STDERR', text.substring(0, 300));
      }
    });

    this.serviceProcess.on('exit', (code) => {
      this.log('warn', 'SERVICE_EXIT', `Process exited with code ${code}`);
      if (this.status === 'connected') {
        this.status = 'disconnected';
      }
      this.serviceProcess = null;
    });

    // Wait for service to be healthy
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const h = await this.httpGet<{ status: string }>('/api/health', 2000);
      if (h && h.status === 'ok') {
        this.log('info', 'SERVICE_START', 'OpenWA service is healthy');
        return true;
      }
    }

    this.log('error', 'SERVICE_START', 'OpenWA service failed to start after 30s');
    return false;
  }

  // ============ FIND OR CREATE SESSION ============
  private async findOrCreateSession(): Promise<string | null> {
    // Try to find existing session by name
    const sessions = await this.httpGet<OpenWASession[]>('/api/sessions', 5000);
    if (sessions && Array.isArray(sessions)) {
      const existing = sessions.find(s => s.name === DEFAULT_SESSION_NAME);
      if (existing) {
        this.log('info', 'SESSION', `Found existing session: ${existing.id} (${existing.name})`);
        return existing.id;
      }
    }

    // Create new session
    this.log('info', 'SESSION', `Creating new session: ${DEFAULT_SESSION_NAME}`);
    const { data } = await this.httpPost<OpenWASession>('/api/sessions', {
      name: DEFAULT_SESSION_NAME,
    });

    if (data && 'id' in data) {
      this.log('info', 'SESSION', `Session created: ${data.id}`);
      return (data as OpenWASession).id;
    }

    this.log('error', 'SESSION', 'Failed to create session');
    return null;
  }

  // ============ MAP OPENWA STATUS TO INTERNAL STATUS ============
  private mapStatus(openwaStatus: string): WAStatus {
    switch (openwaStatus) {
      case 'ready': return 'connected';
      case 'qr_ready': return 'generating_qr';
      case 'initializing': return 'connecting';
      case 'authenticating': return 'connecting';
      case 'disconnected': return 'disconnected';
      case 'failed': return 'offline';
      case 'created': return 'connecting';
      default: return 'offline';
    }
  }

  // ============ POLL SESSION STATE ============
  private startPolling(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(async () => {
      try {
        if (!this.sessionId) return;

        const session = await this.httpGet<OpenWASession>(`/api/sessions/${this.sessionId}`, 3000);
        if (!session) return;

        const newStatus = this.mapStatus(session.status);
        if (newStatus !== this.status) {
          this.log('info', 'STATE_SYNC', `${this.status} → ${newStatus} (OpenWA: ${session.status})`);
          this.status = newStatus;
        }

        // Update phone info
        if (session.phone) {
          this.phoneInfo = { phoneNumber: session.phone, pushName: session.pushName };
        }

        // Fetch QR if in qr_ready state
        if ((this.status === 'generating_qr' || this.status === 'connecting') && !this.qrBase64) {
          const qrResult = await this.httpGet<{ qr: string | null; image?: string }>(
            `/api/sessions/${this.sessionId}/qr`, 5000
          );
          // OpenWA returns { qr: "base64data" } or { image: "base64data" }
          if (qrResult) {
            const qrData = qrResult.qr || qrResult.image;
            if (qrData) {
              this.qrBase64 = qrData;
              this.log('info', 'QR_FETCHED', 'QR code retrieved from OpenWA');
            }
          }
        }

        // Clear QR and set connected time when connected
        if (this.status === 'connected') {
          if (this.qrBase64) {
            this.qrBase64 = null;
          }
          if (!this.connectedAt) {
            this.connectedAt = new Date().toISOString();
          }
          this.connecting = false;
        }

        // If disconnected or failed
        if (this.status === 'disconnected' || this.status === 'offline') {
          this.connecting = false;
          if (this.status === 'offline') {
            this.connectedAt = null;
          }
        }
      } catch {}
    }, 3000);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ============ PUBLIC API ============
  health() { return { status: 'online' }; }

  getStatus() {
    return {
      status: this.status,
      connected: this.status === 'connected',
      phoneInfo: this.phoneInfo,
      connectedAt: this.connectedAt,
      lastHeartbeat: new Date().toISOString(),
      messageCount: this.messageCount,
      sessionId: this.sessionId,
      sessionName: DEFAULT_SESSION_NAME,
      qrAvailable: !!this.qrBase64,
    };
  }

  getQr() {
    if (this.status === 'connected') return { connected: true, qr: null };
    if (this.qrBase64) return { connected: false, qr: this.qrBase64 };
    return { connected: false, qr: null, message: 'No QR available. Start a connection first.' };
  }

  getLogs(limit = 50): WALog[] { return this.logs.slice(-limit).reverse(); }

  getSessionInfo() {
    return {
      session: DEFAULT_SESSION_NAME,
      sessionId: this.sessionId,
      status: this.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED',
      qrAvailable: !!this.qrBase64,
      phoneInfo: this.phoneInfo,
      connectedAt: this.connectedAt,
      messageCount: this.messageCount,
      uptime: this.connectedAt ? Math.round((Date.now() - new Date(this.connectedAt).getTime()) / 1000) : 0,
    };
  }

  /** Get the raw session ID (used by provider for API calls) */
  getSessionId(): string | null { return this.sessionId; }

  /** Get the service URL */
  getServiceUrl(): string { return SERVICE_URL; }

  /** Get the API key */
  getApiKey(): string { return this.apiKey; }

  // ============ CONNECT ============
  async connect(webhookUrl?: string): Promise<{ success: boolean; status: WAStatus; message: string }> {
    if (this.status === 'connected') {
      return { success: true, status: 'connected', message: 'Already connected' };
    }
    if (this.connecting) {
      return { success: true, status: this.status, message: 'Connection in progress' };
    }

    this.connecting = true;
    this.status = 'connecting';

    const started = await this.ensureService();
    if (!started) {
      this.connecting = false;
      this.status = 'offline';
      this.log('error', 'CONNECT', 'Failed to start OpenWA service');
      return { success: false, status: 'offline', message: 'Failed to start OpenWA service. Check logs for details.' };
    }

    this.log('info', 'CONNECT', 'Service running, finding/creating session...');

    // Find or create session
    const sessionId = await this.findOrCreateSession();
    if (!sessionId) {
      this.connecting = false;
      this.status = 'offline';
      return { success: false, status: 'offline', message: 'Failed to create WhatsApp session.' };
    }

    this.sessionId = sessionId;

    // Register webhook if URL provided
    if (webhookUrl) {
      await this.registerWebhook(sessionId, webhookUrl);
    }

    // Start the session
    this.log('info', 'CONNECT', `Starting session ${sessionId}...`);
    const { data, status: httpStatus } = await this.httpPost<OpenWASession>(
      `/api/sessions/${sessionId}/start`
    );

    if (!data && httpStatus !== 200) {
      this.connecting = false;
      return { success: false, status: 'offline', message: 'Failed to start session.' };
    }

    // Map the response status
    const sessionStatus = data ? (data as OpenWASession).status : 'initializing';
    this.status = this.mapStatus(sessionStatus);

    if (this.status === 'generating_qr') {
      this.log('info', 'CONNECT', 'Session started, QR code will be available shortly');
    } else if (this.status === 'connected') {
      this.connectedAt = new Date().toISOString();
      this.log('info', 'CONNECT', 'Session connected (was already authenticated)');
    }

    // Start polling for status/QR updates
    this.startPolling();

    return {
      success: true,
      status: this.status,
      message: this.status === 'generating_qr'
        ? 'QR code generating. Scan with WhatsApp app.'
        : this.status === 'connected'
          ? 'Connected to WhatsApp.'
          : `Session status: ${sessionStatus}`,
    };
  }

  // ============ REGISTER WEBHOOK ============
  private async registerWebhook(sessionId: string, webhookUrl: string): Promise<void> {
    try {
      // First, list existing webhooks
      const webhooks = await this.httpGet<Array<{ id: string; url: string }>>(
        `/api/sessions/${sessionId}/webhooks`, 3000
      );

      // Check if our webhook already exists
      if (webhooks && Array.isArray(webhooks)) {
        const existing = webhooks.find(w => w.url === webhookUrl);
        if (existing) {
          this.log('info', 'WEBHOOK', `Webhook already registered: ${webhookUrl}`);
          return;
        }
      }

      // Create webhook
      const { data } = await this.httpPost<{ id: string }>(
        `/api/sessions/${sessionId}/webhooks`,
        {
          url: webhookUrl,
          events: ['message.received', 'message.sent', 'message.ack', 'session.status'],
          secret: process.env.OPENWA_WEBHOOK_SECRET || 'cmms-webhook-secret',
        }
      );

      if (data) {
        this.log('info', 'WEBHOOK', `Webhook registered: ${webhookUrl}`);
      }
    } catch (err) {
      this.log('warn', 'WEBHOOK', `Failed to register webhook: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // ============ DISCONNECT ============
  async disconnect(): Promise<{ success: boolean; message: string }> {
    this.stopPolling();

    if (this.sessionId) {
      const ok = await this.httpPost(`/api/sessions/${this.sessionId}/stop`);
      this.log('info', 'DISCONNECT', ok.status === 200 ? 'Session stopped' : 'Failed to stop session');
    }

    this.status = 'disconnected';
    this.qrBase64 = null;
    this.connectedAt = null;
    this.phoneInfo = null;
    this.connecting = false;

    return { success: true, message: 'Disconnected' };
  }

  // ============ SEND MESSAGE ============
  async send(chatId: string, text: string): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!this.sessionId) {
      return { success: false, error: 'No active session' };
    }

    const formattedChatId = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;

    const { data, status: httpStatus } = await this.httpPost<{ id?: string; key?: { id?: string }; error?: string }>(
      `/api/sessions/${this.sessionId}/messages/send-text`,
      { chatId: formattedChatId, text },
    );

    if (!data && httpStatus !== 200) {
      return { success: false, error: 'Failed to send message' };
    }

    const msg = data as { id?: string; key?: { id?: string } } | null;
    const msgId = msg?.id || msg?.key?.id;

    if (msgId) {
      this.messageCount++;
    }

    return { success: !!msgId, id: msgId };
  }

  async sendTestMessage(chatId?: string): Promise<{ success: boolean; message: string; timestamp: string }> {
    const testChatId = chatId || this.phoneInfo?.phoneNumber;
    if (!testChatId) {
      return {
        success: false,
        message: 'No phone number available. Connect first or provide a chatId.',
        timestamp: new Date().toISOString(),
      };
    }

    const result = await this.send(testChatId, '🧪 Test message from MOHD.HMS CMMS — OpenWA integration is working!');
    return {
      success: result.success,
      message: result.success ? `Test message sent (ID: ${result.id})` : `Failed: ${result.error}`,
      timestamp: new Date().toISOString(),
    };
  }

  // ============ CLEANUP ============
  async cleanup(): Promise<void> {
    this.stopPolling();
    try {
      if (this.serviceProcess) {
        this.serviceProcess.kill('SIGTERM');
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch {}
    this.serviceProcess = null;
  }
}

// ============ EXPORT SINGLETON ============
const globalForWA = globalThis as unknown as { _waServiceManager?: WhatsAppServiceManager };
export const waManager = globalForWA._waServiceManager || (globalForWA._waServiceManager = new WhatsAppServiceManager());