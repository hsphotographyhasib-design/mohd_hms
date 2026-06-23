import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess, execSync } from 'child_process';

// ============ CONFIGURATION ============
const SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://127.0.0.1:3001';
const SERVICE_DIR = path.resolve(process.cwd(), 'mini-services', 'whatsapp-service');

// ============ CHROME PATH ============
function detectChromePath(): string {
  const envPath = process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const home = process.env.HOME || '/root';
  const candidates = [
    path.join(home, '.cache/puppeteer/chrome'),
  ];

  for (const base of candidates) {
    if (!fs.existsSync(base)) continue;
    try {
      const dirs = fs.readdirSync(base).sort().reverse();
      for (const d of dirs) {
        const cp = path.join(base, d, 'chrome-linux64', 'chrome');
        if (fs.existsSync(cp)) return cp;
        // Also try without chrome-linux64
        const cp2 = path.join(base, d, 'chrome');
        if (fs.existsSync(cp2)) return cp2;
      }
    } catch {}
  }

  const linuxPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
  ];
  for (const p of linuxPaths) {
    if (fs.existsSync(p)) return p;
  }

  return '/usr/bin/chromium-browser';
}

const CHROME_PATH = detectChromePath();

// ============ TYPES ============
export type WAStatus = 'offline' | 'connecting' | 'generating_qr' | 'connected' | 'disconnected' | 'reconnecting';

interface WALog {
  timestamp: string;
  level: string;
  event: string;
  message: string;
}

// ============ SINGLETON ============
class WhatsAppServiceManager {
  private serviceProcess: ChildProcess | null = null;
  private status: WAStatus = 'offline';
  private qrBase64: string | null = null;
  private phoneInfo: { phoneNumber?: string; pushName?: string } | null = null;
  private connectedAt: string | null = null;
  private messageCount = 0;
  private lastHeartbeat: string | null = null;
  private logs: WALog[] = [];
  private connecting = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.log('info', 'INIT', `Service URL: ${SERVICE_URL}`);
    this.log('info', 'INIT', `Chrome: ${CHROME_PATH}`);
  }

  private log(level: string, event: string, message: string): void {
    const entry: WALog = { timestamp: new Date().toISOString(), level, event, message };
    this.logs.push(entry);
    if (this.logs.length > 500) this.logs.splice(0, this.logs.length - 500);
    console.log(`[WA Manager] [${entry.timestamp.split('T')[1].split('.')[0]}] [${event}] ${message}`);
  }

  // ============ HTTP HELPERS ============
  private async httpGet<T>(endpoint: string, timeoutMs = 5000): Promise<T | null> {
    try {
      const res = await fetch(`${SERVICE_URL}${endpoint}`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return (await res.json()) as T;
      return null;
    } catch {
      return null;
    }
  }

  private async httpPost<T>(endpoint: string, body?: Record<string, unknown>, timeoutMs = 15000): Promise<T | null> {
    try {
      const res = await fetch(`${SERVICE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return (await res.json()) as T;
      const err = await res.json().catch(() => null);
      this.log('error', 'HTTP_POST', `${endpoint} → ${res.status}: ${JSON.stringify(err)}`);
      return null;
    } catch (err) {
      this.log('error', 'HTTP_POST', `${endpoint} → ${err instanceof Error ? err.message : 'Network error'}`);
      return null;
    }
  }

  // ============ ENSURE SERVICE IS RUNNING ============
  private async ensureService(): Promise<boolean> {
    // Check if service is already healthy
    const health = await this.httpGet<{ status: string }>('/health', 3000);
    if (health && health.status === 'online') {
      this.log('info', 'SERVICE_CHECK', 'Service already running');
      return true;
    }

    this.log('info', 'SERVICE_START', 'Starting WhatsApp service...');

    // Kill any existing process on port 3001
    try {
      execSync(`fuser -k 3001/tcp 2>/dev/null || true`, { timeout: 5000 });
    } catch {}

    // Check if index.ts exists
    const indexPath = path.join(SERVICE_DIR, 'index.ts');
    if (!fs.existsSync(indexPath)) {
      this.log('error', 'SERVICE_START', `Service not found at ${SERVICE_DIR}`);
      return false;
    }

    // Start the service
    this.serviceProcess = spawn('bun', ['run', 'index.ts'], {
      cwd: SERVICE_DIR,
      env: {
        ...process.env,
        CHROME_PATH,
        PORT: '3001',
        SESSION_ID: 'MOHDHMS',
        DISPLAY: process.env.DISPLAY || ':99',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    });

    const pid = this.serviceProcess.pid;
    this.log('info', 'SERVICE_START', `Process started, PID: ${pid}`);

    // Log service output
    this.serviceProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString().trim();
      if (text) {
        this.log('info', 'SERVICE_STDOUT', text.substring(0, 200));
      }
    });

    this.serviceProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString().trim();
      if (text) {
        this.log('warn', 'SERVICE_STDERR', text.substring(0, 200));
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
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const h = await this.httpGet<{ status: string }>('/health', 2000);
      if (h && h.status === 'online') {
        this.log('info', 'SERVICE_START', 'Service is healthy');
        return true;
      }
    }

    this.log('error', 'SERVICE_START', 'Service failed to start after 20s');
    return false;
  }

  // ============ POLL SERVICE STATE ============
  private startPolling(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(async () => {
      try {
        const statusData = await this.httpGet<{
          status: WAStatus;
          connected: boolean;
          phoneInfo: { phoneNumber?: string; pushName?: string } | null;
          connectedAt: string | null;
          lastHeartbeat: string | null;
          messageCount: number;
          qrAvailable: boolean;
        }>('/status', 3000);

        if (!statusData) return;

        // Update local state from service
        if (statusData.status !== this.status) {
          this.log('info', 'STATE_SYNC', `${this.status} → ${statusData.status}`);
          this.status = statusData.status;
        }
        this.phoneInfo = statusData.phoneInfo;
        this.connectedAt = statusData.connectedAt;
        this.lastHeartbeat = statusData.lastHeartbeat;
        this.messageCount = statusData.messageCount;

        // Fetch QR if status indicates it should be available
        if ((this.status === 'generating_qr' || this.status === 'connecting') && statusData.qrAvailable && !this.qrBase64) {
          const qrData = await this.httpGet<{ connected: boolean; qr: string | null }>('/qr', 3000);
          if (qrData && qrData.qr) {
            this.qrBase64 = qrData.qr;
            this.log('info', 'QR_FETCHED', 'QR code retrieved from service');
          }
        }

        // Clear QR when connected
        if (this.status === 'connected') {
          this.qrBase64 = null;
          this.connecting = false;
        }

        // If disconnected while we were connecting, stop polling
        if (this.status === 'disconnected' || this.status === 'offline') {
          this.connecting = false;
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
      lastHeartbeat: this.lastHeartbeat,
      messageCount: this.messageCount,
      chromePath: CHROME_PATH,
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
      session: 'MOHDHMS',
      status: this.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED',
      qrAvailable: !!this.qrBase64,
      phoneInfo: this.phoneInfo,
      connectedAt: this.connectedAt,
      lastHeartbeat: this.lastHeartbeat,
      messageCount: this.messageCount,
      uptime: this.connectedAt ? Math.round((Date.now() - new Date(this.connectedAt).getTime()) / 1000) : 0,
    };
  }

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
      this.log('error', 'CONNECT', 'Failed to start WhatsApp service');
      return { success: false, status: 'offline', message: 'Failed to start WhatsApp service. Check logs for details.' };
    }

    this.log('info', 'CONNECT', 'Service running, sending connect command...');

    // Send connect via HTTP
    const wUrl = webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/webhook`;
    const result = await this.httpPost<{
      success: boolean;
      status: string;
      message: string;
      qr?: string | null;
    }>('/connect', { webhookUrl: wUrl });

    if (!result) {
      this.connecting = false;
      this.status = 'offline';
      return { success: false, status: 'offline', message: 'Failed to reach WhatsApp service' };
    }

    // If QR came back immediately
    if (result.qr) {
      this.qrBase64 = result.qr;
      this.status = 'generating_qr';
    }

    // Start polling for status/QR updates
    this.startPolling();

    return {
      success: result.success,
      status: result.status as WAStatus,
      message: result.message,
    };
  }

  // ============ DISCONNECT ============
  async disconnect(): Promise<{ success: boolean; message: string }> {
    this.stopPolling();

    const result = await this.httpPost<{ success: boolean; message: string }>('/disconnect');

    this.status = 'disconnected';
    this.qrBase64 = null;
    this.connectedAt = null;
    this.phoneInfo = null;
    this.connecting = false;

    this.log('info', 'DISCONNECT', result ? result.message : 'Session stopped');
    return { success: result?.success ?? true, message: result?.message ?? 'Disconnected' };
  }

  // ============ SEND MESSAGE ============
  async send(chatId: string, text: string): Promise<{ success: boolean; id?: string; error?: string }> {
    const result = await this.httpPost<{ success: boolean; id?: string; error?: string; timestamp: string }>(
      '/send',
      { chatId, text },
    );
    if (!result) return { success: false, error: 'Service unreachable' };
    return result;
  }

  async sendTestMessage(chatId?: string): Promise<{ success: boolean; message: string; timestamp: string }> {
    const result = await this.httpPost<{
      success: boolean;
      message: string;
      timestamp: string;
    }>('/api/sendTestMessage', { session: 'MOHDHMS', chatId });
    if (!result) return { success: false, message: 'Service unreachable', timestamp: new Date().toISOString() };
    return result;
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