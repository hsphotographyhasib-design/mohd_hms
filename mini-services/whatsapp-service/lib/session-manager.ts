import path from 'path';
import fs from 'fs';
import type { SessionState, SendMessageResult } from './types';
import { v4 as uuidv4 } from 'uuid';

// ============ SESSION STORE ============
const sessions: Map<string, SessionState> = new Map();

const SESSION_DIR = path.resolve(process.cwd(), 'storage', 'sessions');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ============ LOGGING HELPERS ============
function getLogManager() {
  return (globalThis as Record<string, unknown>).__waLogManager as import('./log-manager').LogManager;
}

function getEventRouter() {
  return (globalThis as Record<string, unknown>).__waEventRouter as import('./event-router').EventRouter;
}

function getQueue() {
  return (globalThis as Record<string, unknown>).__waMessageQueue as import('./message-queue').MessageQueue;
}

// ============ HEARTBEAT ============
function startHeartbeat(sessionId: string, intervalMs = 30000): void {
  const heartbeat = setInterval(async () => {
    const session = sessions.get(sessionId);
    if (!session || session.status !== 'CONNECTED') {
      clearInterval(heartbeat);
      return;
    }
    try {
      // Check if client is still alive
      if (session.client && typeof session.client.getState === 'function') {
        const state = await session.client.getState();
        if (state !== 'CONNECTED') {
          session.status = 'DISCONNECTED';
          session.lastHeartbeat = new Date().toISOString();
          getLogManager().log('warn', 'Session disconnected (heartbeat)', { session: sessionId, state });
          getEventRouter().forwardEvent('session.disconnected', { session: sessionId });
          // Auto-reconnect
          attemptReconnect(sessionId);
        } else {
          session.lastHeartbeat = new Date().toISOString();
        }
      }
    } catch (err) {
      session.errorCount++;
      session.lastError = err instanceof Error ? err.message : 'Heartbeat error';
      getLogManager().log('error', 'Heartbeat failed', {
        session: sessionId,
        error: session.lastError,
        errorCount: session.errorCount,
      });
      // If too many errors, try reconnect
      if (session.errorCount >= 3) {
        session.errorCount = 0;
        getLogManager().log('warn', 'Too many heartbeat errors, attempting reconnect', { session: sessionId });
        attemptReconnect(sessionId);
      }
    }
  }, intervalMs);
}

// ============ RECONNECT ============
function attemptReconnect(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session || session.status === 'CONNECTING') return;

  getLogManager().log('info', 'Attempting reconnect...', { session: sessionId });
  session.status = 'CONNECTING';

  // Try to restart the session after a delay
  setTimeout(async () => {
    try {
      if (session.client) {
        try { await session.client.kill(); } catch {}
      }
      sessions.delete(sessionId);
      await startSession(sessionId);
    } catch (err) {
      session.status = 'ERROR';
      session.lastError = err instanceof Error ? err.message : 'Reconnect failed';
      getLogManager().log('error', 'Reconnect failed', { session: sessionId, error: session.lastError });
    }
  }, 5000);
}

// ============ INCOMING MESSAGE HANDLER ============
function setupMessageHandlers(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session?.client) return;
  const client = session.client;
  const router = getEventRouter();

  // On any message
  client.onMessage(async (msg: any) => {
    session.messageCount++;
    getLogManager().log('debug', 'Message received', {
      session: sessionId,
      from: msg.from,
      type: msg.type,
      hasMedia: !!msg.hasMedia,
    });

    // Download media if present
    let mediaUrl: string | undefined;
    let mediaData: Record<string, unknown> | undefined;

    if (msg.hasMedia) {
      try {
        mediaData = await client.decryptMedia(msg, 'datauri');
        mediaUrl = mediaData?.data as string | undefined;
      } catch (err) {
        getLogManager().log('warn', 'Failed to decrypt media', {
          session: sessionId,
          error: err instanceof Error ? err.message : 'Unknown',
          messageId: msg.id,
        });
      }
    }

    // Extract location
    let location: Record<string, unknown> | undefined;
    if (msg.type === 'location' && msg.lat && msg.lng) {
      location = { lat: msg.lat, lng: msg.lng, address: msg.loc || undefined };
    }

    // Forward to Next.js webhook
    await router.forwardMessage({
      id: msg.id?.id || msg.id || uuidv4(),
      from: msg.from,
      to: msg.to,
      body: msg.body || msg.caption || '',
      type: msg.type,
      timestamp: msg.timestamp || Date.now(),
      hasMedia: msg.hasMedia || false,
      mediaUrl: mediaUrl,
      mimetype: msg.mimetype,
      caption: msg.caption,
      location,
      fileName: msg.filename,
      fileSize: msg.filesize,
      chatId: msg.chatId,
      chatName: msg.chat.name || undefined,
      senderName: msg.sender?.pushName || msg.pushName || undefined,
      isGroupMsg: msg.isGroupMsg || false,
      session: sessionId,
    });
  });

  // On session state changes
  client.onStateChanged((state: string) => {
    getLogManager().log('info', `Client state changed: ${state}`, { session: sessionId });
    if (state === 'CONFLICT' || state === 'UNLAUNCHED') {
      getLogManager().log('warn', 'Session conflict detected, will reconnect', { session: sessionId, state });
      session.status = 'DISCONNECTED';
      attemptReconnect(sessionId);
    }
  });

  // On socket closed / disconnected
  try {
    client.onStateChanged((state: string) => {
      if (state === 'DISCONNECTED' || state === 'UNPAIRED') {
        getLogManager().log('warn', 'Client disconnected (state change)', { session: sessionId, state });
        session.status = 'DISCONNECTED';
        session.connectedAt = null;
        getEventRouter().forwardEvent('session.disconnected', { session: sessionId, reason: state });
      }
    });
  } catch {
    // onStateChanged may already be bound above
  }
}

// ============ PUBLIC API ============

export async function startSession(sessionId: string = 'default'): Promise<{
  state: string;
  qr?: string;
  message?: string;
  phoneInfo?: SessionState['phoneInfo'];
}> {
  ensureDir(SESSION_DIR);
  const log = getLogManager();

  // Check if already running
  const existing = sessions.get(sessionId);
  if (existing && existing.status === 'CONNECTED') {
    log.log('info', 'Session already connected', { session: sessionId });
    return { state: 'CONNECTED', phoneInfo: existing.phoneInfo };
  }

  // Create session state
  const state: SessionState = {
    id: sessionId,
    status: 'CONNECTING',
    client: null as any,
    qrCode: null,
    phoneInfo: null,
    connectedAt: null,
    lastHeartbeat: null,
    messageCount: 0,
    errorCount: 0,
  };
  sessions.set(sessionId, state);
  log.log('info', 'Starting session...', { session: sessionId });

  try {
    // Dynamic import of wa-automate
    const { create, ev } = await import('@open-wa/wa-automate');

    // Session data path for persistence
    const sessionDataPath = path.join(SESSION_DIR, sessionId);

    const client = await create({
      sessionId,
      sessionDataPath,
      qrTimeout: 60,
      qrRefreshS: 20,
      killProcessOnBrowserClose: true,
      chromiumArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
      headless: true,
      autoRefresh: true,
      cacheEnabled: true,
      useChrome: false,
      executablePath: process.env.CHROME_PATH || undefined,
      // Disable multi-device features that may cause issues
      disableSpins: true,
      waitForLogin: true,
      restartOnCrash: true,
      licenseKey: process.env.OPENWA_LICENSE_KEY || undefined,
      // Logging
      logLevel: 'WARN',
    });

    state.client = client;

    // Wait for connection or QR
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        log.log('warn', 'Session start timeout (120s)', { session: sessionId });
        if (state.status === 'CONNECTING' || state.status === 'QR_READY') {
          // Keep the session running for QR scanning
          resolve({ state: state.status, qr: state.qrCode || undefined, message: 'QR code ready for scanning' });
        }
      }, 120000);

      // Listen for QR
      client.onQR((qr: string) => {
        state.status = 'QR_READY';
        state.qrCode = qr;
        log.log('info', 'QR code generated', { session: sessionId });
        getEventRouter().forwardEvent('session.qr', { session: sessionId, qr });
        // Don't resolve yet — wait for connection
      });

      // Listen for ready
      client.onReady(async () => {
        clearTimeout(timeout);
        state.status = 'CONNECTED';
        state.qrCode = null;
        state.connectedAt = new Date().toISOString();
        state.lastHeartbeat = new Date().toISOString();

        // Get phone info
        try {
          const me = await client.getMe();
          state.phoneInfo = {
            phoneNumber: me?.me?.user || me?.pushName || undefined,
            pushName: me?.pushName || undefined,
            platform: me?.platform || undefined,
          };
        } catch {
          // Phone info not critical
        }

        log.log('info', 'Session connected!', {
          session: sessionId,
          phone: state.phoneInfo?.phoneNumber,
          pushName: state.phoneInfo?.pushName,
        });

        getEventRouter().forwardEvent('session.connected', {
          session: sessionId,
          phoneInfo: state.phoneInfo,
        });

        // Setup message handlers
        setupMessageHandlers(sessionId);

        // Start heartbeat
        startHeartbeat(sessionId);

        resolve({
          state: 'CONNECTED',
          phoneInfo: state.phoneInfo,
          message: 'Session connected successfully',
        });
      });

      // Error handling
      client.onStateChanged((newState: string) => {
        if (newState === 'UNLAUNCHED') {
          clearTimeout(timeout);
          state.status = 'ERROR';
          state.lastError = 'Browser closed before QR scan';
          log.log('error', 'Session failed — browser closed', { session: sessionId });
          reject(new Error('Browser closed before QR scan completed'));
        }
      });
    });
  } catch (error) {
    state.status = 'ERROR';
    state.lastError = error instanceof Error ? error.message : 'Failed to create client';
    log.log('error', 'Failed to start session', {
      session: sessionId,
      error: state.lastError,
    });

    // Check if it's a Chrome/Puppeteer error
    const errMsg = String(error);
    if (errMsg.includes('Chrome') || errMsg.includes('chromium') || errMsg.includes('Executable') || errMsg.includes('browser')) {
      log.log('error', 'CHROME_NOT_FOUND', {
        session: sessionId,
        hint: 'Install Chromium: apt-get install -y chromium-browser or set CHROME_PATH env var',
      });
    }

    return {
      state: 'ERROR',
      message: state.lastError,
    };
  }
}

export async function stopSession(sessionId: string = 'default'): Promise<{
  success: boolean;
  state: string;
  message?: string;
}> {
  const session = sessions.get(sessionId);
  if (!session) {
    return { success: true, state: 'DISCONNECTED', message: 'Session not found' };
  }

  try {
    if (session.client && typeof session.client.kill === 'function') {
      await session.client.kill();
    }
  } catch (err) {
    getLogManager().log('warn', 'Error killing client', {
      session: sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  session.status = 'DISCONNECTED';
  session.client = null;
  session.connectedAt = null;
  session.qrCode = null;

  getLogManager().log('info', 'Session stopped', { session: sessionId });
  getEventRouter().forwardEvent('session.disconnected', { session: sessionId, reason: 'manual_stop' });

  return { success: true, state: 'DISCONNECTED', message: 'Session stopped' };
}

export function getSessionStatus(sessionId: string = 'default'): string {
  const session = sessions.get(sessionId);
  return session?.status || 'DISCONNECTED';
}

export function getQrCode(sessionId: string = 'default'): string | null {
  const session = sessions.get(sessionId);
  return session?.qrCode || null;
}

export async function sendMessage(
  sessionId: string,
  chatId: string,
  content: string,
  type: 'text' | 'image' | 'video' | 'audio' | 'document',
  options: Record<string, unknown> = {},
): Promise<SendMessageResult> {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'CONNECTED') {
    // Queue the message
    const queue = getQueue();
    if (queue) {
      queue.enqueue(sessionId, chatId, content, type, options, 'normal');
      return {
        success: false,
        error: 'Session not connected. Message queued for retry.',
        timestamp: new Date().toISOString(),
      };
    }
    return {
      success: false,
      error: 'Session not connected and queue unavailable',
      timestamp: new Date().toISOString(),
    };
  }

  const client = session.client;
  const log = getLogManager();

  try {
    let result: any;

    switch (type) {
      case 'text': {
        result = await client.sendText(chatId, content);
        break;
      }
      case 'image': {
        const buf = Buffer.from(content.split(',')[1] || content, 'base64');
        result = await client.sendImage(chatId, buf, 'image', options.caption as string || '');
        break;
      }
      case 'video': {
        const buf = Buffer.from(content.split(',')[1] || content, 'base64');
        result = await client.sendVideo(chatId, buf, 'video', options.caption as string || '');
        break;
      }
      case 'audio': {
        const buf = Buffer.from(content.split(',')[1] || content, 'base64');
        result = await client.sendAudio(chatId, buf);
        break;
      }
      case 'document': {
        const buf = Buffer.from(content.split(',')[1] || content, 'base64');
        result = await client.sendFile(chatId, buf, options.filename as string || 'document', options.caption as string || '');
        break;
      }
      default: {
        result = await client.sendText(chatId, content);
      }
    }

    log.log('info', 'Message sent', {
      session: sessionId,
      chatId,
      type,
      messageId: result?.id,
    });

    return {
      success: true,
      id: result?.id,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Send failed';
    log.log('error', 'Failed to send message', {
      session: sessionId,
      chatId,
      type,
      error: errMsg,
    });
    return {
      success: false,
      error: errMsg,
      timestamp: new Date().toISOString(),
    };
  }
}

export function getSessionInfo(sessionId: string = 'default'): Record<string, unknown> {
  const session = sessions.get(sessionId);
  if (!session) {
    return {
      session: sessionId,
      status: 'DISCONNECTED',
      exists: false,
    };
  }

  return {
    session: sessionId,
    status: session.status,
    qrAvailable: !!session.qrCode,
    phoneInfo: session.phoneInfo,
    connectedAt: session.connectedAt,
    lastHeartbeat: session.lastHeartbeat,
    messageCount: session.messageCount,
    errorCount: session.errorCount,
    lastError: session.lastError,
    uptime: session.connectedAt
      ? Math.round((Date.now() - new Date(session.connectedAt).getTime()) / 1000)
      : 0,
  };
}

export function listAllSessions(): { id: string; status: string; phoneInfo: SessionState['phoneInfo']; connectedAt: string | null }[] {
  return Array.from(sessions.entries()).map(([id, s]) => ({
    id,
    status: s.status,
    phoneInfo: s.phoneInfo,
    connectedAt: s.connectedAt,
  }));
}

export function getHealthStats(): { sessions: Record<string, string> } {
  const result: Record<string, string> = {};
  for (const [id, s] of sessions) {
    result[id] = s.status;
  }
  return { sessions: result };
}

export async function sendTestMessage(
  sessionId: string = 'default',
  chatId?: string,
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'CONNECTED') {
    return {
      success: false,
      message: 'Session not connected. Please connect WhatsApp first.',
      timestamp: new Date().toISOString(),
    };
  }

  // If no chatId, send to self (own number)
  let targetChatId = chatId;
  if (!targetChatId) {
    try {
      const me = await session.client.getMe();
      targetChatId = `${me.me.user || me.pushName}@s.whatsapp.net`;
    } catch {
      return {
        success: false,
        message: 'Could not determine self-chat ID',
        timestamp: new Date().toISOString(),
      };
    }
  }

  const result = await sendMessage(sessionId, targetChatId, '✅ WhatsApp connection successful!\n\nThis is a test message from FacilityPro CMMS.', 'text');
  return {
    success: result.success,
    message: result.success ? 'Test message sent successfully!' : `Failed: ${result.error}`,
    timestamp: new Date().toISOString(),
  };
}

export async function syncConversations(sessionId: string = 'default'): Promise<{
  success: boolean;
  count: number;
  message: string;
}> {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'CONNECTED') {
    return { success: false, count: 0, message: 'Session not connected' };
  }

  try {
    const chats = await session.client.getAllChats();
    const router = getEventRouter();

    // Forward recent messages from each chat to webhook
    let syncedCount = 0;
    for (const chat of chats.slice(0, 50)) { // Limit to 50 chats
      try {
        const messages = await session.client.getMessages(chat.id._serialized, { limit: 5 });
        for (const msg of messages) {
          if (msg.fromMe) continue; // Skip own messages
          await router.forwardMessage({
            id: msg.id?.id || uuidv4(),
            from: msg.from,
            to: msg.to,
            body: msg.body || '',
            type: msg.type,
            timestamp: msg.timestamp * 1000,
            hasMedia: msg.hasMedia,
            chatId: chat.id._serialized,
            chatName: chat.name || undefined,
            isGroupMsg: chat.isGroup || false,
            session: sessionId,
            sync: true,
          });
          syncedCount++;
        }
      } catch {
        // Skip chat if messages can't be fetched
      }
    }

    getLogManager().log('info', 'Conversations synced', { session: sessionId, chatsSynced: Math.min(50, chats.length), messagesSynced: syncedCount });

    return {
      success: true,
      count: syncedCount,
      message: `Synced ${syncedCount} messages from ${Math.min(50, chats.length)} conversations`,
    };
  } catch (error) {
    return {
      success: false,
      count: 0,
      message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}