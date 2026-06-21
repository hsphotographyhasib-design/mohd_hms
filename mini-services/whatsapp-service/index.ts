import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';

// ============ CHROME PATH DETECTION ============
function detectChromePath(): string | undefined {
  // 1. Environment variable
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    console.log(`[Chrome] Using CHROME_PATH: ${process.env.CHROME_PATH}`);
    return process.env.CHROME_PATH;
  }

  // 2. Common Linux paths
  const linuxPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
  ];

  for (const p of linuxPaths) {
    if (fs.existsSync(p)) {
      console.log(`[Chrome] Found at: ${p}`);
      return p;
    }
  }

  // 3. Playwright bundled
  const playwrightPaths = [
    path.join(process.env.HOME || '/root', '.cache/ms-playwright/chromium-1228/chrome-linux64/chrome'),
    path.join(process.env.HOME || '/root', '.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'),
  ];

  for (const p of playwrightPaths) {
    if (fs.existsSync(p)) {
      console.log(`[Chrome] Found Playwright Chrome at: ${p}`);
      return p;
    }
  }

  // 4. Puppeteer bundled
  const puppeteerBase = path.join(process.env.HOME || '/root', '.cache/puppeteer/chrome');
  if (fs.existsSync(puppeteerBase)) {
    try {
      const dirs = fs.readdirSync(puppeteerBase);
      // Sort to get latest version
      dirs.sort().reverse();
      for (const dir of dirs) {
        const chromePath = path.join(puppeteerBase, dir, 'chrome-linux64', 'chrome');
        if (fs.existsSync(chromePath)) {
          console.log(`[Chrome] Found Puppeteer Chrome at: ${chromePath}`);
          return chromePath;
        }
      }
    } catch {}
  }

  console.error('[Chrome] NO CHROME/CHROMIUM FOUND. Set CHROME_PATH env variable.');
  return undefined;
}

const CHROME_PATH = detectChromePath();

// ============ APP SETUP ============
const PORT = parseInt(process.env.PORT || '3001', 10);
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// ============ STATE ============
type ConnectionStatus = 'offline' | 'connecting' | 'generating_qr' | 'connected' | 'disconnected' | 'reconnecting';

let globalStatus: ConnectionStatus = 'offline';
let qrBase64: string | null = null;
let phoneInfo: { phoneNumber?: string; pushName?: string; platform?: string } | null = null;
let connectedAt: string | null = null;
let messageCount = 0;
let lastHeartbeat: string | null = null;
let clientInstance: any = null;
let healthInterval: ReturnType<typeof setInterval> | null = null;
let qrInterval: ReturnType<typeof setInterval> | null = null;

// Simple in-memory log
const logs: Array<{ timestamp: string; level: string; event: string; message: string }> = [];

function log(level: string, event: string, message: string) {
  const entry = { timestamp: new Date().toISOString(), level, event, message };
  logs.push(entry);
  if (logs.length > 500) logs.splice(0, logs.length - 500);
  const prefix = `[${entry.timestamp.split('T')[1].split('.')[0]}]`;
  if (level === 'error') console.error(`${prefix} [ERROR] ${event}: ${message}`);
  else if (level === 'warn') console.warn(`${prefix} [WARN] ${event}: ${message}`);
  else console.log(`${prefix} [INFO] ${event}: ${message}`);
}

// ============ SESSION STORAGE ============
const SESSION_DIR = path.resolve(process.cwd(), 'storage', 'sessions');
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

// ============ ENDPOINTS (User spec) ============

// GET /health
app.get('/health', (_req, res) => {
  res.json({ status: 'online' });
});

// GET /status
app.get('/status', (_req, res) => {
  res.json({
    status: globalStatus,
    connected: globalStatus === 'connected',
    phoneInfo,
    connectedAt,
    lastHeartbeat,
    messageCount,
    chromePath: CHROME_PATH || null,
    qrAvailable: !!qrBase64,
  });
});

// GET /qr
app.get('/qr', (_req, res) => {
  if (globalStatus === 'connected') {
    res.json({ connected: true });
  } else if (qrBase64) {
    res.json({ connected: false, qr: qrBase64 });
  } else {
    res.json({ connected: false, qr: null, message: 'No QR available. Start a connection first.' });
  }
});

// POST /connect — returns immediately, client polls /qr and /status
app.post('/connect', (_req, res) => {
  try {
    if (globalStatus === 'connected') {
      return res.json({ success: true, status: 'connected', message: 'Already connected', phoneInfo });
    }
    if (globalStatus === 'connecting' || globalStatus === 'generating_qr') {
      return res.json({ success: true, status: globalStatus, message: 'Connection in progress', qr: qrBase64 });
    }

    // Start connection in background
    globalStatus = 'connecting';
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3000'}/api/whatsapp/webhook`;
    startConnection(webhookUrl).then((result) => {
      log('info', 'CONNECT_RESULT', `Status: ${result.status}`);
    }).catch((err) => {
      log('error', 'CONNECT_BG_FAIL', err instanceof Error ? err.message : String(err));
    });

    res.json({ success: true, status: 'connecting', message: 'Connection initiated. Poll /qr for QR code and /status for updates.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Connection failed';
    log('error', 'CONNECT', msg);
    res.status(500).json({ success: false, error: msg, status: 'offline' });
  }
});

// POST /disconnect
app.post('/disconnect', async (_req, res) => {
  try {
    await stopConnection();
    res.json({ success: true, status: 'disconnected', message: 'Disconnected' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Disconnect failed';
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /send
app.post('/send', async (req, res) => {
  try {
    const { chatId, text, sessionId: sid } = req.body as { chatId: string; text: string; sessionId?: string };
    if (!chatId || !text) {
      return res.status(400).json({ success: false, error: 'chatId and text are required' });
    }
    if (globalStatus !== 'connected' || !clientInstance) {
      return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
    }

    const result = await clientInstance.sendText(chatId, text);
    messageCount++;
    log('info', 'MESSAGE_SENT', `To ${chatId}, ID: ${result?.id}`);
    res.json({ success: true, id: result?.id, timestamp: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Send failed';
    log('error', 'MESSAGE_SEND_FAIL', msg);
    res.status(500).json({ success: false, error: msg });
  }
});

// ============ LEGACY ENDPOINTS (kept for backwards compat with Next.js API routes) ============

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    sessions: globalStatus === 'connected' ? ['MOHDHMS'] : [],
  });
});

app.get('/api/getState', (_req, res) => {
  res.json({ state: mapStatus(globalStatus), session: process.env.SESSION_ID || 'MOHDHMS', timestamp: new Date().toISOString() });
});

app.get('/api/getQrCode', (req, res) => {
  const session = (req.query.session as string) || 'MOHDHMS';
  if (qrBase64) {
    res.json({ qr: qrBase64, session, timestamp: new Date().toISOString() });
  } else {
    res.json({ qr: null, session, message: 'No QR available. Session may already be connected or not started.', timestamp: new Date().toISOString() });
  }
});

app.post('/api/startSession', (req, res) => {
  try {
    const { session = 'MOHDHMS', webhookUrl } = req.body as { session?: string; webhookUrl?: string };
    if (globalStatus === 'connected') {
      return res.json({ state: 'CONNECTED', phoneInfo, message: 'Already connected' });
    }
    if (globalStatus === 'connecting' || globalStatus === 'generating_qr') {
      return res.json({ state: 'QR_READY', qr: qrBase64, message: 'Connection in progress' });
    }

    // Start in background, return immediately
    globalStatus = 'connecting';
    const wUrl = webhookUrl || `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3000'}/api/whatsapp/webhook`;
    startConnection(wUrl).catch((err) => {
      log('error', 'START_SESSION_BG_FAIL', err instanceof Error ? err.message : String(err));
    });

    res.json({ state: 'CONNECTING', qr: null, message: 'Session starting. Poll /api/getQrCode for QR.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to start session';
    log('error', 'START_SESSION', msg);
    res.status(500).json({ error: msg, state: 'ERROR' });
  }
});

app.delete('/api/closeSession', async (req, res) => {
  try {
    await stopConnection();
    res.json({ success: true, state: 'DISCONNECTED', message: 'Session stopped' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to close session';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/restartSession', async (req, res) => {
  try {
    await stopConnection();
    await new Promise(r => setTimeout(r, 2000));
    const result = await startConnection();
    res.json({
      state: result.status === 'connected' ? 'CONNECTED' : 'QR_READY',
      qr: result.qr || null,
      phoneInfo: result.status === 'connected' ? phoneInfo : undefined,
      message: result.message,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to restart session';
    res.status(500).json({ error: msg, state: 'ERROR' });
  }
});

app.post('/api/sendTextMessage', async (req, res) => {
  try {
    const { session = 'MOHDHMS', chatId, text } = req.body as { session?: string; chatId: string; text: string };
    if (!chatId || !text) return res.status(400).json({ error: 'chatId and text are required' });
    if (globalStatus !== 'connected' || !clientInstance) return res.status(503).json({ error: 'Session not connected' });
    const result = await clientInstance.sendText(chatId, text);
    messageCount++;
    log('info', 'MESSAGE_SENT', `To ${chatId}`);
    res.json({ success: true, id: result?.id, timestamp: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Send failed';
    res.status(500).json({ error: msg, success: false });
  }
});

app.post('/api/sendTestMessage', async (req, res) => {
  try {
    const { session = 'MOHDHMS', chatId } = req.body as { session?: string; chatId?: string };
    if (globalStatus !== 'connected' || !clientInstance) {
      return res.json({ success: false, message: 'Session not connected. Please connect WhatsApp first.' });
    }
    let targetChatId = chatId;
    if (!targetChatId) {
      const me = await clientInstance.getMe();
      targetChatId = `${me.me.user}@s.whatsapp.net`;
    }
    const result = await clientInstance.sendText(targetChatId, '✅ WhatsApp connection successful!\n\nThis is a test message from MOHD.HMS Enterprise CMMS.');
    messageCount++;
    res.json({ success: true, message: 'Test message sent successfully!', timestamp: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Test message failed';
    res.status(500).json({ success: false, message: msg });
  }
});

app.get('/api/sessionInfo', (_req, res) => {
  res.json({
    session: process.env.SESSION_ID || 'MOHDHMS',
    status: mapStatus(globalStatus),
    qrAvailable: !!qrBase64,
    phoneInfo,
    connectedAt,
    lastHeartbeat,
    messageCount,
    uptime: connectedAt ? Math.round((Date.now() - new Date(connectedAt).getTime()) / 1000) : 0,
  });
});

app.get('/api/listSessions', (_req, res) => {
  res.json({
    sessions: globalStatus === 'connected' ? [{ id: process.env.SESSION_ID || 'MOHDHMS', status: 'CONNECTED', phoneInfo, connectedAt }] : [],
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/syncConversations', async (_req, res) => {
  try {
    if (globalStatus !== 'connected' || !clientInstance) {
      return res.json({ success: false, count: 0, message: 'Session not connected' });
    }
    const chats = await clientInstance.getAllChats();
    res.json({ success: true, count: chats.length, message: `Found ${chats.length} conversations` });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Sync failed';
    res.status(500).json({ success: false, count: 0, message: msg });
  }
});

app.get('/api/queueStatus', (_req, res) => {
  res.json({ total: 0, pending: 0, processing: 0, failed: 0, items: [] });
});

app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ logs: logs.slice(-limit).reverse(), total: logs.length });
});

app.delete('/api/logs', (_req, res) => {
  logs.length = 0;
  res.json({ success: true });
});

// ============ CORE CONNECTION LOGIC ============

function mapStatus(s: ConnectionStatus): string {
  const map: Record<ConnectionStatus, string> = {
    offline: 'DISCONNECTED',
    connecting: 'CONNECTING',
    generating_qr: 'QR_READY',
    connected: 'CONNECTED',
    disconnected: 'DISCONNECTED',
    reconnecting: 'CONNECTING',
  };
  return map[s];
}

async function startConnection(webhookUrl?: string): Promise<{ success: boolean; status: ConnectionStatus; qr?: string | null; message: string }> {
  if (!CHROME_PATH) {
    log('error', 'CONNECT', 'No Chrome/Chromium found. Set CHROME_PATH env variable.');
    return { success: false, status: 'offline', message: 'CHROME_NOT_FOUND: Install Chromium or set CHROME_PATH' };
  }

  globalStatus = 'connecting';
  log('info', 'CONNECT', 'Starting WhatsApp connection...');

  try {
    const { create } = await import('@open-wa/wa-automate');

    const sessionId = process.env.SESSION_ID || 'MOHDHMS';
    const sessionDataPath = path.join(SESSION_DIR, sessionId);

    globalStatus = 'connecting';
    log('info', 'CONNECT', `Creating OpenWA client (session: ${sessionId}, chrome: ${CHROME_PATH})`);

    const client = await create({
      sessionId,
      sessionDataPath,
      qrTimeout: 0, // infinite QR wait
      qrRefreshS: 20, // refresh QR every 20s
      killProcessOnBrowserClose: true,
      chromiumArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-extensions',
      ],
      headless: true,
      useChrome: true,
      executablePath: CHROME_PATH,
      autoRefresh: true,
      cacheEnabled: true,
      restartOnCrash: true,
      disableSpins: true,
      waitForLogin: true,
      logLevel: 'WARN',
    });

    clientInstance = client;
    log('info', 'CONNECT', 'OpenWA client created, waiting for QR or session restore...');

    return new Promise((resolve, reject) => {
      // QR code received
      client.onQR((qr: string) => {
        globalStatus = 'generating_qr';
        qrBase64 = qr;
        log('info', 'QR_GENERATED', 'QR code received, ready for scanning');

        // Forward QR to webhook
        if (webhookUrl) {
          forwardToWebhook(webhookUrl, 'session.qr', { qr, session: sessionId }).catch(() => {});
        }
      });

      // Session authenticated and ready
      client.onReady(async () => {
        globalStatus = 'connected';
        qrBase64 = null;
        connectedAt = new Date().toISOString();
        lastHeartbeat = new Date().toISOString();
        log('info', 'CONNECTED', 'WhatsApp session is connected and ready!');

        // Get phone info
        try {
          const me = await client.getMe();
          phoneInfo = {
            phoneNumber: me?.me?.user || undefined,
            pushName: me?.pushName || undefined,
            platform: me?.platform || undefined,
          };
          log('info', 'CONNECTED', `Phone: ${phoneInfo.phoneNumber}, PushName: ${phoneInfo.pushName}`);
        } catch {}

        // Forward to webhook
        if (webhookUrl) {
          forwardToWebhook(webhookUrl, 'session.connected', { phoneInfo, session: sessionId }).catch(() => {});
        }

        // Setup incoming message handler
        setupMessageHandler(client, webhookUrl);

        // Start health monitor
        startHealthMonitor();

        resolve({ success: true, status: 'connected', qr: null, message: 'WhatsApp connected successfully!' });
      });

      // Handle state changes
      client.onStateChanged((state: string) => {
        log('info', 'STATE_CHANGE', `New state: ${state}`);
        if (state === 'UNLAUNCHED') {
          globalStatus = 'disconnected';
          log('error', 'STATE_CHANGE', 'Browser closed before QR scan');
          reject(new Error('Browser closed before QR scan completed'));
        }
        if (state === 'CONFLICT' || state === 'DISCONNECTED' || state === 'UNPAIRED') {
          globalStatus = 'disconnected';
          log('warn', 'STATE_CHANGE', `Session state: ${state}, will attempt reconnect`);
          if (webhookUrl) {
            forwardToWebhook(webhookUrl, 'session.disconnected', { reason: state, session: sessionId }).catch(() => {});
          }
          setTimeout(() => attemptReconnect(webhookUrl), 5000);
        }
      });
    });
  } catch (error) {
    globalStatus = 'disconnected';
    const msg = error instanceof Error ? error.message : 'Failed to create OpenWA client';
    log('error', 'CONNECT_FAIL', msg);

    // Provide helpful error for Chrome issues
    const errStr = String(error);
    if (errStr.includes('Chrome') || errStr.includes('chromium') || errStr.includes('Executable') || errStr.includes('browser') || errStr.includes('ENOENT')) {
      log('error', 'CONNECT_FAIL', `HINT: Set CHROME_PATH=${CHROME_PATH || '/path/to/chrome'}`);
    }

    return { success: false, status: 'offline', message: msg };
  }
}

async function stopConnection(): Promise<void> {
  try {
    if (clientInstance && typeof clientInstance.kill === 'function') {
      await clientInstance.kill();
    }
  } catch (err) {
    log('warn', 'DISCONNECT', `Error killing client: ${err instanceof Error ? err.message : String(err)}`);
  }

  clientInstance = null;
  globalStatus = 'disconnected';
  qrBase64 = null;
  connectedAt = null;
  phoneInfo = null;

  if (healthInterval) {
    clearInterval(healthInterval);
    healthInterval = null;
  }
  if (qrInterval) {
    clearInterval(qrInterval);
    qrInterval = null;
  }

  log('info', 'DISCONNECT', 'WhatsApp session stopped');
}

// ============ INCOMING MESSAGE HANDLER ============

function setupMessageHandler(client: any, webhookUrl?: string): void {
  client.onMessage(async (msg: any) => {
    messageCount++;
    log('info', 'MESSAGE_RECEIVED', `From: ${msg.from}, Type: ${msg.type}, HasMedia: ${!!msg.hasMedia}`);

    if (webhookUrl) {
      try {
        await forwardToWebhook(webhookUrl, 'message', {
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
      } catch (err) {
        log('error', 'WEBHOOK_FAIL', `Failed to forward message: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  });
}

// ============ HEALTH MONITOR ============

function startHealthMonitor(): void {
  if (healthInterval) clearInterval(healthInterval);

  healthInterval = setInterval(async () => {
    if (globalStatus !== 'connected' || !clientInstance) {
      return;
    }

    try {
      if (typeof clientInstance.getState === 'function') {
        const state = await clientInstance.getState();
        if (state !== 'CONNECTED') {
          log('warn', 'HEALTH_CHECK', `Unexpected state: ${state}`);
          globalStatus = 'disconnected';
          attemptReconnect();
        } else {
          lastHeartbeat = new Date().toISOString();
        }
      }
    } catch (err) {
      log('error', 'HEALTH_CHECK', `Failed: ${err instanceof Error ? err.message : String(err)}`);
      attemptReconnect();
    }
  }, 30000); // 30 seconds
}

// ============ AUTO RECONNECT ============

function attemptReconnect(webhookUrl?: string): void {
  if (globalStatus === 'connecting' || globalStatus === 'reconnecting' || globalStatus === 'generating_qr') return;

  globalStatus = 'reconnecting';
  log('info', 'RECONNECT', 'Attempting to reconnect...');

  setTimeout(async () => {
    try {
      if (clientInstance) {
        try { await clientInstance.kill(); } catch {}
      }
      clientInstance = null;
      await startConnection(webhookUrl);
    } catch (err) {
      globalStatus = 'disconnected';
      log('error', 'RECONNECT_FAIL', err instanceof Error ? err.message : String(err));
    }
  }, 5000);
}

// ============ WEBHOOK FORWARDER ============

async function forwardToWebhook(url: string, event: string, data: Record<string, unknown>): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, type: event, data, timestamp: new Date().toISOString() }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return true;
      log('warn', 'WEBHOOK', `Attempt ${attempt} returned ${res.status}`);
    } catch (err) {
      log('warn', 'WEBHOOK', `Attempt ${attempt} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
  }
  return false;
}

// ============ START SERVER ============

const server = createServer(app);
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     WHATSAPP SERVICE - ONLINE                ║');
  console.log(`║     Port: ${PORT}                                ║`);
  console.log(`║     Chrome: ${CHROME_PATH ? 'FOUND' : 'NOT FOUND'}                        ║`);
  console.log(`║     Session Dir: ${SESSION_DIR.substring(-20).padEnd(27)}║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  GET  http://localhost:${PORT}/status`);
  console.log(`  GET  http://localhost:${PORT}/qr`);
  console.log(`  POST http://localhost:${PORT}/connect`);
  console.log(`  POST http://localhost:${PORT}/disconnect`);
  console.log(`  POST http://localhost:${PORT}/send`);
  console.log('');
  log('system', 'SERVICE_START', `WhatsApp service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  log('info', 'SHUTDOWN', 'SIGTERM received');
  await stopConnection();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
});

process.on('uncaughtException', (err) => {
  log('error', 'UNCAUGHT_EXCEPTION', err.message);
});

process.on('unhandledRejection', (reason) => {
  log('error', 'UNHANDLED_REJECTION', String(reason));
});