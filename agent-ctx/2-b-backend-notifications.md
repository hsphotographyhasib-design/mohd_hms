# Task 2-b: Enterprise Notification Backend Rebuild

## Work Log

### Files Created / Modified

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `src/lib/notifications/notification-service.ts` | **Created** | Centralized server-side notification creation service. All modules call this single point. Features: dedup (30s window), role-based targeting, batch creation, WebSocket push, 5 convenience helpers. |
| 2 | `src/app/api/notifications/route.ts` | **Rewritten** | Enhanced API: GET with pagination/type/search/isRead filters + unreadCount; POST delegates to NotificationService; PUT for markAllRead / mark specific read / archive / archiveAll; DELETE for batch deletion. |
| 3 | `src/app/api/notifications/[id]/route.ts` | **Created** | Single-notification CRUD: GET (with ownership check), PUT (mark read / archive), DELETE (with ownership check). |
| 4 | `mini-services/notification-service/index.js` | **Created** | Socket.IO WebSocket service on port 3010. Client connects via `io('/?XTransformPort=3010')`. Events: join, notification:new, notification:read, notification:allRead. HTTP POST /send endpoint for server-to-server push. |
| 5 | `src/lib/notifications/realtime.ts` | **Created** | Client-side `useNotificationRealtime()` hook. Connects via socket.io-client, auto-reconnects with exponential backoff, syncs to in-memory store + shows sonner toast. Exports `realtimeNotificationStore` for external consumers. |
| 6 | `package.json` | **Modified** | Added `socket.io-client@4.8.3` dependency. |
| 7 | `eslint.config.mjs` | **Modified** | Added `mini-services/**`, `spawn-server.js`, `generated/**` to ESLint ignores. |

### Key Design Decisions

1. **NotificationService** is the single entry point for all notification creation. It resolves target user IDs (direct or role-based), performs 30-second dedup, creates DB records, and fire-and-forget pushes to the WebSocket service.

2. **WebSocket mini-service** uses Socket.IO with room-based routing: `tenant:{tenantId}:user:{userId}`. The HTTP `/send` endpoint allows the main Next.js server to push notifications to specific users without being a Socket.IO client itself.

3. **Realtime hook** manages its own in-memory store (`realtimeNotificationStore`) separate from the existing Zustand toast notification store, keeping DB notifications (persistent) and UI toasts (ephemeral) as separate concerns.

4. **API rewrite** adds: search query, type filter, archivedAt support (archive/archiveAll), batch delete, and proper ownership checks (non-admin users can only touch their own notifications).

5. **Lint** passes clean for all new files. Pre-existing errors in hr-leave.tsx and inventory-item-form.tsx are unrelated.

### How to Start the WebSocket Service

```bash
cd mini-services/notification-service && npm run dev
```

This starts the service on `http://127.0.0.1:3010`. The Caddy proxy routes requests with `?XTransformPort=3010` to this service.

### Integration Points

- **Server-side**: Import `createNotification` (or convenience helpers) from `@/lib/notifications/notification-service`
- **Client-side**: Call `useNotificationRealtime()` in your app shell/layout to enable real-time notifications
- **Cross-tab sync**: The hook broadcasts `notification:read` and `notification:allRead` events to all tabs for the same user