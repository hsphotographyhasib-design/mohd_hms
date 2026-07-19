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
// Type definitions
// ---------------------------------------------------------------------------
type UserPresenceStatus = "online" | "away";

interface PresenceUser {
  userId: string;
  name: string;
  status: "online" | "away";
  lastSeen: string;
}

// ---------------------------------------------------------------------------
// Connection tracking — supports multi-tab: only go offline when ALL sockets
// for a given userId are closed.
// ---------------------------------------------------------------------------
// userId → Set<socketId>
const activeConnections = new Map<string, Set<string>>();

// userId → last heartbeat timestamp (ms)
const lastHeartbeat = new Map<string, number>();

// userId → 'online' | 'away'
const userStatus = new Map<string, UserPresenceStatus>();

// userId → Date (in-memory lastSeen for quick reads)
const lastSeenMap = new Map<string, Date>();

// userId → name (so we can emit name on status changes without DB lookups)
const userNameMap = new Map<string, string>();

// userId → tenantId (for stale cleanup)
const userTenantMap = new Map<string, string>();

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

/**
 * Get the effective status for a user (returns undefined if user has no status)
 */
function getUserStatus(userId: string): "online" | "away" | "offline" {
  if (!activeConnections.has(userId) || getSocketCount(userId) === 0) {
    return "offline";
  }
  return userStatus.get(userId) ?? "online";
}

/**
 * Get the lastSeen time for a user as an ISO string
 */
function getLastSeenISO(userId: string): string {
  return (lastSeenMap.get(userId) ?? new Date()).toISOString();
}

// ---------------------------------------------------------------------------
// DB flush timer — batch write lastSeen to DB every 60 seconds
// ---------------------------------------------------------------------------
let dirtyUsers = new Set<string>();

function markDirty(userId: string): void {
  dirtyUsers.add(userId);
}

async function flushLastSeenToDB(): Promise<void> {
  if (dirtyUsers.size === 0) return;

  // Snapshot and clear the dirty set so new heartbeats don't get lost
  const usersToFlush = new Set(dirtyUsers);
  dirtyUsers = new Set<string>();

  const now = new Date();
  const promises: Promise<void>[] = [];

  for (const userId of usersToFlush) {
    // Only flush users who are still actively connected
    if (getSocketCount(userId) > 0) {
      lastSeenMap.set(userId, now);
      const p = db.user
        .update({
          where: { id: userId },
          data: { lastSeen: now },
        })
        .catch((err) =>
          console.error(`[PRESENCE] Failed to flush lastSeen for ${userId}:`, err)
        );
      promises.push(p);
    }
  }

  if (promises.length > 0) {
    await Promise.allSettled(promises);
    console.log(`[PRESENCE] Flushed lastSeen for ${promises.length} users to DB`);
  }
}

// ---------------------------------------------------------------------------
// Stale connection cleanup — every 120 seconds
// ---------------------------------------------------------------------------
function cleanupStaleConnections(): void {
  const now = Date.now();
  const STALE_THRESHOLD = 120_000; // 120 seconds

  const staleUserIds: string[] = [];

  for (const [userId, lastHb] of lastHeartbeat) {
    if (now - lastHb > STALE_THRESHOLD && getSocketCount(userId) > 0) {
      staleUserIds.push(userId);
    }
  }

  for (const userId of staleUserIds) {
    const sockets = activeConnections.get(userId);
    if (sockets) {
      const tenantId = userTenantMap.get(userId) ?? "";
      console.log(
        `[PRESENCE] Stale cleanup: force-disconnecting user ${userId} (${sockets.size} sockets) in tenant ${tenantId}`
      );
      for (const socketId of sockets) {
        const sock = io.sockets.sockets.get(socketId);
        if (sock) {
          sock.disconnect(true);
        }
      }
    }
  }

  if (staleUserIds.length > 0) {
    console.log(`[PRESENCE] Stale cleanup: disconnected ${staleUserIds.length} users`);
  }
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

  // Update in-memory tracking
  const now = new Date();
  lastSeenMap.set(userId, now);
  lastHeartbeat.set(userId, Date.now());
  userNameMap.set(userId, name);
  userTenantMap.set(userId, tenantId);

  if (isFirstConnection) {
    // Set status to online (default)
    userStatus.set(userId, "online");

    // Set isOnline = true and lastSeen in DB (fire-and-forget)
    db.user
      .update({
        where: { id: userId },
        data: { isOnline: true, lastSeen: now },
      })
      .catch((err) =>
        console.error(`[PRESENCE] Failed to set isOnline=true/lastSeen for ${userId}:`, err)
      );

    // Notify tenant room of online status
    io.to(room).emit("user:status-change", {
      userId,
      isOnline: true,
      status: "online",
      lastSeen: now.toISOString(),
      name,
    });
  }

  // Send the full list of currently online users to the newly connected client
  sendOnlineSnapshot(socket, tenantId);

  // --- Heartbeat event ---
  socket.on("presence:heartbeat", () => {
    lastHeartbeat.set(userId, Date.now());
    markDirty(userId);
    // DB write is batched via flush timer
  });

  // --- Idle event (user went away) ---
  socket.on("presence:idle", () => {
    const prevStatus = userStatus.get(userId);
    if (prevStatus !== "away") {
      userStatus.set(userId, "away");
      const seen = getLastSeenISO(userId);
      console.log(`[PRESENCE] User ${userId} (${name}) is now away`);

      io.to(room).emit("user:status-change", {
        userId,
        isOnline: true,
        status: "away",
        lastSeen: seen,
        name,
      });
    }
  });

  // --- Active event (user returned from idle) ---
  socket.on("presence:active", () => {
    lastHeartbeat.set(userId, Date.now());
    const prevStatus = userStatus.get(userId);
    if (prevStatus !== "online") {
      userStatus.set(userId, "online");
      const nowActive = new Date();
      lastSeenMap.set(userId, nowActive);
      markDirty(userId);
      console.log(`[PRESENCE] User ${userId} (${name}) is now active`);

      io.to(room).emit("user:status-change", {
        userId,
        isOnline: true,
        status: "online",
        lastSeen: nowActive.toISOString(),
        name,
      });
    }
  });

  // --- Disconnect ---
  socket.on("disconnect", (reason) => {
    const remaining = removeConnection(userId, socket.id);
    console.log(`[PRESENCE] User ${userId} disconnected (socket ${socket.id}, reason: ${reason}, remaining: ${remaining})`);

    if (remaining === 0) {
      // Only set offline when ALL connections for this user are gone
      const now = new Date();
      lastSeenMap.set(userId, now);
      userStatus.delete(userId);
      lastHeartbeat.delete(userId);

      // Final lastSeen write + isOnline = false (fire-and-forget)
      db.user
        .update({
          where: { id: userId },
          data: { isOnline: false, lastSeen: now },
        })
        .catch((err) =>
          console.error(`[PRESENCE] Failed to set offline/lastSeen for ${userId}:`, err)
        );

      // Notify tenant room
      io.to(room).emit("user:status-change", {
        userId,
        isOnline: false,
        status: "offline",
        lastSeen: now.toISOString(),
        name,
      });

      // Clean up maps (keep userNameMap for potential reconnection)
      userTenantMap.delete(userId);
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
      select: { id: true, name: true, lastSeen: true },
    });

    // For accuracy, cross-reference with our in-memory connection tracking
    // Only report users who are BOTH in DB isOnline=true AND have active WebSocket connections
    const trulyOnline = onlineUsers.filter((u) => getSocketCount(u.id) > 0);

    const users: PresenceUser[] = trulyOnline.map((u) => ({
      userId: u.id,
      name: u.name,
      status: getUserStatus(u.id) as "online" | "away",
      lastSeen: u.lastSeen?.toISOString() ?? getLastSeenISO(u.id),
    }));

    socket.emit("presence:snapshot", { users });

    console.log(`[PRESENCE] Sent presence snapshot to socket ${socket.id}: ${users.length} users online`);
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

      // Start the batched lastSeen DB flush timer (every 60 seconds)
      setInterval(() => {
        flushLastSeenToDB().catch((err) =>
          console.error("[PRESENCE] Error in flushLastSeenToDB timer:", err)
        );
      }, 60_000);

      // Start the stale connection cleanup timer (every 120 seconds)
      setInterval(() => {
        cleanupStaleConnections();
      }, 120_000);

      console.log("[PRESENCE] Timers started: lastSeen flush every 60s, stale cleanup every 120s");
    });
  })
  .catch((err) => {
    console.error("[PRESENCE] Startup failed:", err);
    process.exit(1);
  });