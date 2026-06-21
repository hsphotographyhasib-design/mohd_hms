import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

// ============ CHROME PATH ============
function detectChromePath(): string {
  const home = process.env.HOME || '/root';
  const pb = path.join(home, '.cache/puppeteer/chrome');
  if (fs.existsSync(pb)) {
    try {
      const dirs = fs.readdirSync(pb).sort().reverse();
      for (const d of dirs) {
        const cp = path.join(pb, d, 'chrome-linux64', 'chrome');
        if (fs.existsSync(cp)) return cp;
      }
    } catch {}
  }
  return '/usr/bin/chromium-browser';
}

const CHROME_PATH = detectChromePath();
const SESSION_DIR = path.resolve(process.cwd(), 'storage', 'whatsapp', 'sessions');
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

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
  private onStdout: Buffer | null = null;

  private outBuffer = '';
  private outResolve: ((data: Buffer | null) => void = undefined;

  constructor() {
    this.log('info', 'INIT', `Chrome: ${CHROME_PATH}`);
  }

  private log(level: string, event: string, message: string): void {
    const entry: WALog = { timestamp: new Date().toISOString(), level, event, message };
    this.logs.push(entry);
    if (this.logs.length > 500) this.logs.splice(0, this.logs.length - 500);
    console.log(`[WA Service] [${entry.timestamp.split('T')[1].split('.')[0]}] [${event}] ${message}`);
  }

  // ============ ENSURE SERVICE IS RUNNING ============
  private async ensureService(): Promise<boolean> {
    // Check if already running
    try {
      const res = await fetch('http://127.0.0.1:3001/health', {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) return true;
    } catch {}

    this.log('info', 'SERVICE_START', 'Starting WhatsApp service on port 3001...');

    // Kill any existing process on the port
    try { execSync(`kill $(lsof -ti:3001 -t) 2>/dev/null || 'false').toString(); } catch {}

    // Check if Chrome exists
    if (!fs.existsSync(CHROME_PATH)) {
      this.log('error', 'SERVICE_START', `Chrome not found at ${CHROME_PATH}`);
      return false;
    }

    // Ensure session directory exists
    if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

    // Clean corrupted sessions
    try {
      const dirs = fs.readdirSync(SESSION_DIR);
      for (const dir of dirs) {
        const dirPath = path.join(SESSION_DIR, dir);
        if (dir !== '.' && fs.statSync(dirPath).isDirectory()) {
          fs.rmSync(dirPath, { recursive: true });
          this.log('info', 'SESSION_CLEAN', `Cleaned session: ${dir}`);
        }
      }
    } catch {}

    // Start the service
    this.serviceProcess = spawn('bun', ['run', 'index.ts'], {
      cwd: path.resolve(process.cwd(), 'mini-services', 'whatsapp-service'),
      env: {
        ...process.env,
        CHROME_PATH,
        PORT: '3001',
        DISPLAY: process.env.DISPLAY || ':98',
      },
      stdio: ['pipe', 'stderr', 'inherit'],
      detached: true,
    });

    this.log('info', 'SERVICE_START', `Process PID: ${this.serviceProcess.pid}`);

    // Wait for service to be healthy
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const res = await fetch('http://127.0.0.1:3001/health', {
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          this.log('info', 'SERVICE_START', 'Service is healthy');
          return true;
        }
      } catch {}
    }

    this.log('error', 'SERVICE_START', 'Service failed to start after 15s');
    return false;
  }

  private sendMessageToService(data: Record<string, unknown>): Promise<void> {
    if (!this.outBuffer || !this.serviceProcess) return;

    try {
      const jsonStr = JSON.stringify(data);
      if (this.outBuffer.length > 100000) this.outBuffer = Buffer.alloc(0);
      this.outBuffer.write(jsonStr + '\n');
      this.outBuffer.push('\n');
      fs.appendFileSync(path.join(process.cwd(), 'mini-services/whatsapp-service/stdout.log'), jsonStr + '\n');

      const written = fs.writeFileSyncSync(path.join(process.cwd(), 'mini-services/whatsapp-service/stdout.log'), this.outBuffer);

      // Flush stdout
      if (this.outBuffer.includes('\n')) {
        const lines = this.outBuffer.toString().split('\n');
        for (const line of lines) {
          if (line.includes('QR_GENERATED') || line.includes('QR_EXTRACTED') || line.includes('CONNECTED') || line.includes('SCREENSHOT') || line.includes('Waiting') || line.includes('ERROR')) {
            console.log(`[Service] ${line.trim()}`);
          }
        }
      }
    } catch {}
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
  async connect(): Promise<{ success: boolean; status: WAStatus; message: string }> {
    if (this.status === 'connected') return { success: true, status: 'connected', message: 'Already connected' };
    if (this.connecting) return { success: true, status: this.status, message: 'Connection in progress' };

    this.connecting = true;
    this.status = 'connecting';

    const started = await this.ensureService();
    if (!started) {
      this.log('error', 'CONNECT', 'Failed to start WhatsApp service');
      return { success: false, status: 'offline', message: 'Failed to start WhatsApp service. Check logs for details.' };
    }

    this.log('info', 'CONNECT', 'Service started, sending start command...');

    // Send start command via stdio
    this.sendMessageToService({ session: 'MOHDHMS' });

    return { success: true, status: 'connecting', message: 'Connection initiated. QR code will appear shortly.' };
  }

  // ============ DISCONNECT ============
  async disconnect(): Promise<{ success: boolean; message: string }> {
    this.sendMessageToService({ session: 'MOHDHMS', action: 'close' });

    // Wait for service to stop
    await new Promise(r => setTimeout(r, 3000));

    this.status = 'disconnected';
    this.qrBase64 = null;
    this.connectedAt = null;
    this.phoneInfo = null;
    this.connecting = false;
    this.log('info', 'DISCONNECT', 'Session stopped');
    return { success: true, message: 'Disconnected' };
  }

  async send(chatId: string, text: string): Promise<{ success: boolean; id?: string; error?: string }> {
    return this.sendMessageToService({ session: 'MOHDHMS', type: 'text', chatId, text });
  }

  async sendTestMessage(chatId?: string): Promise<{ success: boolean; message: string; timestamp: string }> {
    return this.sendMessageToService({ session: 'MOHDHMS', action: 'test-message', chatId });
  }

  // ============ PRIVATE ============
  private sendMessageToService(data: Record<string, unknown>): Promise<void> {
    try {
      if (!this.outBuffer || !this.serviceProcess) {
        this.outBuffer = Buffer.alloc(0);
      }

      const jsonStr = JSON.stringify(data);
      this.outBuffer.write(jsonStr + '\n');
      this.outBuffer.push('\n');

      const written = fs.writeFileSyncSync(
        path.join(process.cwd(), 'mini-services/whatsapp-service/stdout.log'),
        this.outBuffer,
      );

      // Flush stdout
      if (this.outBuffer.includes('\n')) {
        const lines = this.outBuffer.toString().split('\n');
        for (const line of lines) {
          if (line.includes('GENERATED') || line.includes('EXTRACTED') || line.includes('SCREENSHOT') || line.includes('Waiting') || line.includes('ERROR')) {
            console.log(`[Service] ${line.trim()}`);
          }
        }
      }
    } catch {}
  }

  // ============ CLEANUP ============
  private cleanup(): Promise<void> {
    try {
      if (this.serviceProcess) {
        this.serviceProcess.kill('SIGTERM');
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch {}

    if (this.outBuffer) this.outBuffer = Buffer.alloc(0);
    try { fs.unlinkSync(path.join(process.cwd(), 'mini-services/whatsapp-service/stdout.log')); } catch {}
  }

  // ============ GRACEFUL SHUTDOWN ============
  private async gracefulShutdown(): Promise<void> {
    this.log('info', 'SHUTDOWN', 'Graceful shutdown starting...');

    // 1. Send disconnect
    try { await this.disconnect(); } catch {}

    // 2. Save session data
    this.saveSessionData();

    // 3. Close browser
    try { if (this.browser) await this.browser.close(); } catch {}

    // 4. Kill service process
    if (this.serviceProcess) {
      try { this.serviceProcess.kill('SIGTERM'); } catch {}
      await new Promise(r => setTimeout(r, 3000));
    }

    // 5. Kill Xvfb
    if (this.xvfbProcess) {
      try { this.xvfbProcess.kill('SIGTERM'); } catch {}
    }

    process.exit(0);
  }

  private saveSessionData(): void {
    try {
      const sessionDataPath = path.join(SESSION_DIR, 'MOHDHMS');
      const dataPath = path.join(sessionDataPath, 'sessionData.json');
      if (fs.existsSync(dataPath)) {
        const prev = fs.readFileSync(dataPath, 'utf-8');
        this.log('info', 'SESSION_SAVE', `Restoring session from ${dataPath}`);
        // In production, parse and use the saved session data
      }
    } catch {}
  }
  }
}

// ============ EXPORT SINGLETON ============
const globalForWA = globalThis as unknown as { _waServiceManager?: WhatsAppServiceManager };
export const waManager = globalForWA._waServiceManager || (globalForWA._waServiceManager = new WhatsAppServiceManager());