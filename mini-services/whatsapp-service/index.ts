import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import {
  startSession,
  stopSession,
  getSessionStatus,
  getQrCode,
  sendMessage,
  getSessionInfo,
  restartSession,
  listAllSessions,
  getHealthStats,
  sendTestMessage,
  syncConversations,
} from './lib/session-manager';
import { MessageQueue } from './lib/message-queue';
import { EventRouter } from './lib/event-router';
import { LogManager } from './lib/log-manager';
import type { SessionState } from './lib/types';

const PORT = 3001;
const app = express();

// ============ MIDDLEWARE ============
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// ============ GLOBALS ============
const messageQueue = new MessageQueue();
const eventRouter = new EventRouter();
const logManager = new LogManager();

// Initialize event router with webhook URL (Next.js backend)
const WEBHOOK_BASE = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000';
eventRouter.setWebhookUrl(`${WEBHOOK_BASE}/api/whatsapp/webhook`);

// Expose globals for session-manager callbacks
(globalThis as Record<string, unknown>).__waMessageQueue = messageQueue;
(globalThis as Record<string, unknown>).__waEventRouter = eventRouter;
(globalThis as Record<string, unknown>).__waLogManager = logManager;

// ============ ROUTES ============

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    sessions: Object.keys(getHealthStats().sessions),
  });
});

// Get state of a session
app.get('/api/getState', (req, res) => {
  const key = req.query.key as string;
  const session = req.query.session as string || 'default';
  const state = getSessionStatus(session);
  res.json({ state, session, timestamp: new Date().toISOString() });
});

// Get QR code for a session
app.get('/api/getQrCode', (req, res) => {
  const key = req.query.key as string;
  const session = req.query.session as string || 'default';
  const qr = getQrCode(session);
  if (qr) {
    res.json({ qr, session, timestamp: new Date().toISOString() });
  } else {
    res.json({ qr: null, session, message: 'No QR available. Session may already be connected or not started.', timestamp: new Date().toISOString() });
  }
});

// Start/connect session (generates QR if needed)
app.post('/api/startSession', async (req, res) => {
  try {
    const { session = 'default', webhookUrl } = req.body as { session?: string; webhookUrl?: string };
    if (webhookUrl) eventRouter.setWebhookUrl(webhookUrl);
    const result = await startSession(session);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to start session';
    res.status(500).json({ error: msg, state: 'ERROR' });
  }
});

// Close/stop session
app.delete('/api/closeSession', async (req, res) => {
  try {
    const session = req.query.session as string || 'default';
    const result = await stopSession(session);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to close session';
    res.status(500).json({ error: msg });
  }
});

// Restart session
app.post('/api/restartSession', async (req, res) => {
  try {
    const { session = 'default' } = req.body as { session?: string };
    await stopSession(session);
    // Wait 2 seconds before restarting
    await new Promise(resolve => setTimeout(resolve, 2000));
    const result = await startSession(session);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to restart session';
    res.status(500).json({ error: msg, state: 'ERROR' });
  }
});

// Send text message
app.post('/api/sendTextMessage', async (req, res) => {
  try {
    const { session = 'default', chatId, text, options } = req.body as {
      session?: string;
      chatId: string;
      text: string;
      options?: Record<string, unknown>;
    };
    if (!chatId || !text) {
      return res.status(400).json({ error: 'chatId and text are required' });
    }
    const result = await sendMessage(session, chatId, text, 'text', options);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to send message';
    res.status(500).json({ error: msg, success: false });
  }
});

// Send image message
app.post('/api/sendImageMessage', async (req, res) => {
  try {
    const { session = 'default', chatId, media, caption } = req.body as {
      session?: string;
      chatId: string;
      media: string;
      caption?: string;
    };
    if (!chatId || !media) {
      return res.status(400).json({ error: 'chatId and media are required' });
    }
    const result = await sendMessage(session, chatId, media, 'image', { caption });
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to send image';
    res.status(500).json({ error: msg, success: false });
  }
});

// Send video message
app.post('/api/sendVideoMessage', async (req, res) => {
  try {
    const { session = 'default', chatId, media, caption } = req.body as {
      session?: string;
      chatId: string;
      media: string;
      caption?: string;
    };
    if (!chatId || !media) {
      return res.status(400).json({ error: 'chatId and media are required' });
    }
    const result = await sendMessage(session, chatId, media, 'video', { caption });
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to send video';
    res.status(500).json({ error: msg, success: false });
  }
});

// Send audio message
app.post('/api/sendAudioMessage', async (req, res) => {
  try {
    const { session = 'default', chatId, media } = req.body as {
      session?: string;
      chatId: string;
      media: string;
    };
    if (!chatId || !media) {
      return res.status(400).json({ error: 'chatId and media are required' });
    }
    const result = await sendMessage(session, chatId, media, 'audio', {});
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to send audio';
    res.status(500).json({ error: msg, success: false });
  }
});

// Send document message
app.post('/api/sendDocumentMessage', async (req, res) => {
  try {
    const { session = 'default', chatId, media, caption, filename } = req.body as {
      session?: string;
      chatId: string;
      media: string;
      caption?: string;
      filename?: string;
    };
    if (!chatId || !media) {
      return res.status(400).json({ error: 'chatId and media are required' });
    }
    const result = await sendMessage(session, chatId, media, 'document', { caption, filename });
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to send document';
    res.status(500).json({ error: msg, success: false });
  }
});

// Get session info
app.get('/api/sessionInfo', (req, res) => {
  const session = req.query.session as string || 'default';
  const info = getSessionInfo(session);
  res.json(info);
});

// List all sessions
app.get('/api/listSessions', (_req, res) => {
  const sessions = listAllSessions();
  res.json({ sessions, timestamp: new Date().toISOString() });
});

// Send test message
app.post('/api/sendTestMessage', async (req, res) => {
  try {
    const { session = 'default', chatId } = req.body as { session?: string; chatId?: string };
    const result = await sendTestMessage(session, chatId);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Test message failed';
    res.status(500).json({ error: msg, success: false });
  }
});

// Sync conversations
app.post('/api/syncConversations', async (req, res) => {
  try {
    const { session = 'default' } = req.body as { session?: string };
    const result = await syncConversations(session);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Sync failed';
    res.status(500).json({ error: msg });
  }
});

// Get message queue status
app.get('/api/queueStatus', (_req, res) => {
  res.json(messageQueue.getStatus());
});

// Get logs
app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const session = req.query.session as string;
  const logs = logManager.getLogs(limit, session);
  res.json({ logs, total: logManager.count() });
});

// Clear logs
app.delete('/api/logs', (_req, res) => {
  logManager.clear();
  res.json({ success: true });
});

// ============ START SERVER ============
const server = createServer(app);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[WhatsApp Service] Running on port ${PORT}`);
  console.log(`[WhatsApp Service] Session storage: ${process.cwd()}/storage/sessions`);
  console.log(`[WhatsApp Service] Webhook target: ${eventRouter.getWebhookUrl()}`);
  logManager.log('system', 'Service started', { port: PORT });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[WhatsApp Service] SIGTERM received, shutting down...');
  const sessions = listAllSessions();
  for (const s of sessions) {
    try { await stopSession(s.id); } catch {}
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
});

process.on('uncaughtException', (err) => {
  console.error('[WhatsApp Service] Uncaught exception:', err);
  logManager.log('error', 'Uncaught exception', { error: err.message });
});

process.on('unhandledRejection', (reason) => {
  console.error('[WhatsApp Service] Unhandled rejection:', reason);
  logManager.log('error', 'Unhandled rejection', { reason: String(reason) });
});