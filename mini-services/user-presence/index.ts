import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import { PrismaClient } from "../../generated/prisma/client.js";

const db = new PrismaClient();

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
  console.log(`[PRESENCE] User ${userId} (${name}) connected in room ${room}`);

  // Set isOnline = true (fire-and-forget)
  db.user
    .update({
      where: { id: userId },
      data: { isOnline: true, lastLogin: new Date() },
    })
    .catch((err) => console.error(`[PRESENCE] Failed to set isOnline=true for ${userId}:`, err));

  // Notify tenant room of online status
  io.to(room).emit("user:status-change", { userId, isOnline: true, name });

  // --- Disconnect ---
  socket.on("disconnect", (reason) => {
    console.log(`[PRESENCE] User ${userId} disconnected (${reason})`);

    // Set isOnline = false (fire-and-forget)
    db.user
      .update({
        where: { id: userId },
        data: { isOnline: false },
      })
      .catch((err) => console.error(`[PRESENCE] Failed to set isOnline=false for ${userId}:`, err));

    // Notify tenant room
    io.to(room).emit("user:status-change", { userId, isOnline: false, name });
  });

  // --- admin:subscribe (implicit via room join, but accept the event for compatibility) ---
  socket.on("admin:subscribe", () => {
    // Already in the tenant room, so the client will receive all
    // user:status-change events broadcast to that room.
    console.log(`[PRESENCE] Admin ${userId} subscribed to presence updates in room ${room}`);
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
httpServer.listen(PORT, () => {
  console.log(`[PRESENCE] User presence Socket.IO server listening on port ${PORT}`);
});