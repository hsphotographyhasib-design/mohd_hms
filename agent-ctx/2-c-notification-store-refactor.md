# Task 2-c: Unified Notification Store Refactor

## Summary
Eliminated the dual Zustand store conflict by consolidating all notification state into a single unified store at `@/lib/notifications/store`.

## Changes Made

### 1. `/src/lib/notifications/store.ts` — REWRITTEN
- Unified store with both `dbNotifications` (API-synced) and `toasts` (client-side popups)
- DB actions: `fetchNotifications`, `fetchUnreadCount`, `markAsRead`, `markAllAsRead`, `archiveNotification`, `deleteNotification`
- Toast actions: `addToast`, `updateToast`, `dismissToast`, `dismissAllToasts`
- Toast dedup: skips same title+type within 2 seconds
- Max 5 visible toasts with auto-dismiss (default 4500ms)
- BroadcastChannel cross-tab sync: NOTIFICATION_UPDATE, ALL_READ, NEW_TOAST
- Settings management: `updateSettings` with localStorage persistence
- Exports: `NotificationItem`, `ClientToast`, `NotificationSettings`, `useNotificationStore`

### 2. `/src/store/index.ts` — CLEANED
- Removed entire `NotificationState` interface and `useNotificationStore` export
- Kept `notificationPanelOpen` in `useAppStore` (used by mobile-dashboard.tsx)
- Kept all other stores intact

### 3. `/src/app/page.tsx` — FIXED
- Toast bridge now only fires unified store's `addToast()`
- Removed sonner import from the bridge
- Imports `useNotificationStore` from `@/lib/notifications/store`

### 4. `/src/hooks/use-notification-polling.ts` — UPDATED
- Imports from unified store
- Uses `fetchUnreadCount()` and `fetchNotifications()` from unified store
- BroadcastChannel sync uses `_updateUnreadCount()`

### 5. `/src/components/nav/app-header.tsx` — UPDATED
- Imports from unified store
- Uses `dbNotifications` and `unreadCount`
- "Mark all read" calls API via `markAllAsRead()`
- Notification click supports `actionUrl` navigation and `relatedEntityType/relatedEntityId`

### 6. `/src/components/notifications/notification-provider.tsx` — UPDATED
- Imports from unified store (no API change needed, `updateSettings` still exists)

### 7. `/src/components/notifications/notification-toast.tsx` — REWRITTEN
- Renders `toasts` from unified store (not `visible` from old enterprise store)
- Supports `actionLabel`/`actionUrl` on toasts with navigation button
- Keeps timer bar, hover behavior, animations

### 8. `/src/components/notifications/notification-history.tsx` — REWRITTEN
- Shows `dbNotifications` from unified store (not localStorage history)
- Supports `actionUrl` navigation on click
- Keeps search, filter, relative time formatting

### 9. `/src/components/modules/notifications/notification-list.tsx` — UPDATED
- Uses unified store for `dbNotifications`, `fetchNotifications`, `markAsRead`, `markAllAsRead`

### 10. `/src/hooks/use-notification.ts` — REWRITTEN
- Developer API: `success`, `error`, `warning`, `info`, `loading`, `dismiss`, `dismissAll`
- Each calls `useNotificationStore.getState().addToast(...)` directly

### 11. Additional files fixed:
- `/src/components/app/header.tsx` — Import moved to unified store
- `/src/components/app/sidebar.tsx` — Import moved to unified store
- `/src/components/mobile/mobile-notifications.tsx` — Uses `dbNotifications` from unified store
- `/src/components/mobile/mobile-shell.tsx` — Import moved to unified store

## Verification
- All lint checks pass (0 errors in modified files)
- No remaining `useNotificationStore` imports from `@/store`
- `@/store/index.ts` no longer exports `useNotificationStore`