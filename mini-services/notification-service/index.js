/**
 * WebSocket Notification Service — Port 3010
 *
 * Provides real-time notification delivery via Socket.IO.
 *
 * Client connection: io('/?XTransformPort=3010')
 *
 * Events:
 * - Client -> Server:
 *   'join'           { tenantId, userId }  — join user's personal room
 *   'notification:read'   { id }          — broadcast read state to user's other tabs
 *   'notification:allRead' {}             — broadcast all-read to user's other tabs
 *
 * - Server -> Client:
 *   'notification:new'    { notification } — new notification pushed to user
 *
 * HTTP endpoint:
 *   POST /send  { userId, tenantId, notification }
 *   Called by the main Next.js NotificationService to push to a specific user.
 */

const { Server } = require('socket.io');
const http = require('http');

const PORT = 3010;

// ─────────────────────────────────────────────────────────────────────────────
// Create HTTP + Socket.IO server
// ─────────────────────────────────────────────────────────────────────────────

const httpServer = http.createServer((req, res) => {
  // Handle HTTP POST /send for server-to-server notification push
  if (req.method === 'POST' && req.url === '/send') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { userId, tenantId, notification } = data;

        if (!userId || !tenantId || !notification) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'userId, tenantId, and notification are required' }));
          return;
        }

        // Emit to the user's personal room: `tenant:{tenantId}:user:{userId}`
        const roomName = `tenant:${tenantId}:user:${userId}`;
        const count = io.to(roomName).emit('notification:new', { notification });

        console.log(
          `[WS] Pushed notification ${notification.id} to room ${roomName} (${count} sockets)`,
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, room: roomName }));
      } catch (err) {
        console.error('[WS] /send error:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
  } else {
    // Health check / default
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ service: 'notification-ws', port: PORT, status: 'running' }));
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  // Allow Caddy to proxy WebSocket connections
  allowRequest: (_req, callback) => {
    // Accept all connections — auth is handled by the client sending 'join'
    callback(null, true);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Connection handling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map of socketId -> { tenantId, userId } for cleanup
 */
const socketUserMap = new Map();

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // ── 'join' event: client identifies itself ──
  socket.on('join', ({ tenantId, userId }) => {
    if (!tenantId || !userId) {
      console.warn(`[WS] Invalid join from ${socket.id}: missing tenantId/userId`);
      return;
    }

    // Leave any previous rooms
    const prev = socketUserMap.get(socket.id);
    if (prev) {
      socket.leave(`tenant:${prev.tenantId}:user:${prev.userId}`);
    }

    // Join the user's personal room
    const roomName = `tenant:${tenantId}:user:${userId}`;
    socket.join(roomName);
    socketUserMap.set(socket.id, { tenantId, userId });

    console.log(`[WS] ${socket.id} joined ${roomName}`);
  });

  // ── 'notification:read' event: broadcast to user's other tabs ──
  socket.on('notification:read', ({ id }) => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;

    const roomName = `tenant:${user.tenantId}:user:${user.userId}`;
    // Broadcast to all OTHER sockets in the room (not the sender)
    socket.to(roomName).emit('notification:read', { id });
  });

  // ── 'notification:allRead' event: broadcast to user's other tabs ──
  socket.on('notification:allRead', () => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;

    const roomName = `tenant:${user.tenantId}:user:${user.userId}`;
    socket.to(roomName).emit('notification:allRead', {});
  });

  // ── Disconnect ──
  socket.on('disconnect', (reason) => {
    const user = socketUserMap.get(socket.id);
    if (user) {
      console.log(`[WS] ${socket.id} disconnected (was ${user.userId}). Reason: ${reason}`);
    }
    socketUserMap.delete(socket.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, '127.0.0.1', () => {
  console.log(`[WS] Notification WebSocket service running on http://127.0.0.1:${PORT}`);
  console.log(`[WS] HTTP POST /send endpoint available for server-to-server push`);
});