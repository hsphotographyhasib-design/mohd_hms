// Load root .env so DATABASE_URL and JWT_SECRET are available
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(import.meta.dir, "../../.env") });

import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// ---------------------------------------------------------------------------
// Prisma Client (uses libsql adapter like the main app)
// ---------------------------------------------------------------------------
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("[PRESENCE] FATAL: DATABASE_URL not set. Check .env file.");
  process.exit(1);
}

const adapter = new PrismaLibSql({ url: dbUrl });
const db = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// JWT Secret Resolution (self-contained, mirrors auth-lib.ts logic)
// ---------------------------------------------------------------------------
function resolveJwtSecret(): string {
  // 1. Check JWT_SECRET env var (must be ≥16 chars)
  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.length >= 16) {
    console.log("[PRESENCE] Using JWT secret from env: JWT_SECRET");
    return envSecret;
  }

  // 2. Derive from DATABASE_URL using SHA-256 (same salt as auth-lib.ts)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const derived = createHash("sha256")
      .update(`mohd-hms-jwt-derived:${dbUrl}`)
      .digest("hex");
    console.warn(
      "[PRESENCE] WARNING: No JWT_SECRET env var found. Using key derived from DATABASE_URL.\n" +
        "         Set JWT_SECRET (≥16 chars) for production."
    );
    return derived;
  }

  // 3. Last resort: random bytes (tokens invalidate on restart)
  console.error(
    "[PRESENCE] CRITICAL: No JWT secret and no DATABASE_URL. Using random secret. Tokens will invalidate on restart."
  );
  return randomBytes(32).toString("hex");
}

const JWT_SECRET = resolveJwtSecret();

// ---------------------------------------------------------------------------
// Connection tracking — supports multi-tab: only go offline when ALL sockets
// for a given userId are closed.
// ---------------------------------------------------------------------------
// userId → Set<socketId>
const activeConnections = new Map<string, Set<string>>();

function getSocketCount(userId: string): number {
  return activeConnections.get(userId)?.size ?? 0;
}

function addConnection(userId: string, socketId: string): number {
  let set = activeConnections.get(userId);
  if (!set) {
    set = new Set();
    activeConnections.set(userId, set);
  }
  set.add(socketId);
  return set.size;
}

function removeConnection(userId: string, socketId: string): number {
  const set = activeConnections.get(userId);
  if (!set) return 0;
  set.delete(socketId);
  if (set.size === 0) {
    activeConnections.delete(userId);
  }
  return set.size;
}

// ---------------------------------------------------------------------------
// HTTP + Socket.IO server
// ---------------------------------------------------------------------------
const PORT = 3004;
const httpServer = createServer();

const io = new Server(httpServer, {
  cors: { origin: "*" },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// ---------------------------------------------------------------------------
// Connection handling
// ---------------------------------------------------------------------------
io.on("connection", (socket) => {
  // --- Auth handshake ---
  const token = (socket.handshake.auth as { token?: string })?.token;

  if (!token) {
    console.log(`[PRESENCE] Connection rejected: no token provided (socket ${socket.id})`);
    socket.disconnect(true);
    return;
  }

  let userId: string;
  let tenantId: string;
  let name: string;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId?: string;
      tenantId?: string;
      role?: string;
      sub?: string;
      name?: string;
    };

    userId = payload.userId ?? payload.sub ?? "";
    tenantId = payload.tenantId ?? "";

    if (!userId || !tenantId) {
      console.log(`[PRESENCE] Connection rejected: missing userId/tenantId (socket ${socket.id})`);
      socket.disconnect(true);
      return;
    }

    name = payload.name ?? "";
  } catch (err) {
    console.log(`[PRESENCE] Connection rejected: invalid token (socket ${socket.id})`);
    socket.disconnect(true);
    return;
  }

  // Store on socket for use in disconnect
  (socket.data as { userId: string; tenantId: string; name: string }).userId = userId;
  (socket.data as { userId: string; tenantId: string; name: string }).tenantId = tenantId;
  (socket.data as { userId: string; tenantId: string; name: string }).name = name;

  // Join tenant room
  const room = `tenant:${tenantId}`;
  socket.join(room);

  // Track connection count for multi-tab support
  const count = addConnection(userId, socket.id);
  const isFirstConnection = count === 1;
  console.log(`[PRESENCE] User ${userId} (${name}) connected (socket ${socket.id}, total connections: ${count}) in room ${room}`);

  if (isFirstConnection) {
    // Set isOnline = true only on first connection (fire-and-forget)
    db.user
      .update({
        where: { id: userId },
        data: { isOnline: true },
      })
      .catch((err) => console.error(`[PRESENCE] Failed to set isOnline=true for ${userId}:`, err));

    // Notify tenant room of online status
    io.to(room).emit("user:status-change", { userId, isOnline: true, name });
  }

  // Send the full list of currently online users to the newly connected client
  // This ensures the admin UI has accurate presence data immediately
  sendOnlineSnapshot(socket, tenantId);

  // --- Disconnect ---
  socket.on("disconnect", (reason) => {
    const remaining = removeConnection(userId, socket.id);
    console.log(`[PRESENCE] User ${userId} disconnected (socket ${socket.id}, reason: ${reason}, remaining: ${remaining})`);

    if (remaining === 0) {
      // Only set offline when ALL connections for this user are gone
      db.user
        .update({
          where: { id: userId },
          data: { isOnline: false },
        })
        .catch((err) => console.error(`[PRESENCE] Failed to set isOnline=false for ${userId}:`, err));

      // Notify tenant room
      io.to(room).emit("user:status-change", { userId, isOnline: false, name });
    }
  });

  // --- admin:subscribe (implicit via room join, but accept the event for compatibility) ---
  socket.on("admin:subscribe", () => {
    console.log(`[PRESENCE] Admin ${userId} subscribed to presence updates in room ${room}`);
    // Re-send the snapshot
    sendOnlineSnapshot(socket, tenantId);
  });
});

// ---------------------------------------------------------------------------
// Send a full snapshot of online users to a specific socket
// ---------------------------------------------------------------------------
async function sendOnlineSnapshot(socket: import("socket.io").Socket, tenantId: string) {
  try {
    const onlineUsers = await db.user.findMany({
      where: { tenantId, isOnline: true },
      select: { id: true, name: true },
    });

    // For accuracy, cross-reference with our in-memory connection tracking
    // Only report users who are BOTH in DB isOnline=true AND have active WebSocket connections
    const trulyOnline = onlineUsers.filter((u) => getSocketCount(u.id) > 0);

    socket.emit("presence:snapshot", {
      users: trulyOnline.map((u) => ({ userId: u.id, name: u.name, isOnline: true })),
    });

    console.log(`[PRESENCE] Sent presence snapshot to socket ${socket.id}: ${trulyOnline.length} users online`);
  } catch (err) {
    console.error(`[PRESENCE] Failed to send presence snapshot:`, err);
  }
}

// ---------------------------------------------------------------------------
// Startup: reset all stale isOnline flags to false
// ---------------------------------------------------------------------------
async function resetStaleOnlineStatus() {
  try {
    const result = await db.user.updateMany({
      where: { isOnline: true },
      data: { isOnline: false },
    });
    console.log(`[PRESENCE] Startup cleanup: reset ${result.count} stale isOnline=true → false`);
  } catch (err) {
    console.error(`[PRESENCE] Failed to reset stale online status on startup:`, err);
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
resetStaleOnlineStatus()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`[PRESENCE] User presence Socket.IO server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[PRESENCE] Startup failed:", err);
    process.exit(1);
  });