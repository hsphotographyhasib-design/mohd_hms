# Authentication System

> Auto-generated from codebase scan.

## Overview

Custom JWT-based authentication (NOT NextAuth for primary auth). NextAuth.js v4 is installed but the app uses a custom JWT implementation for simplicity.

## Auth Flow

```
Login Request
  → POST /api/auth/login { email, password }
  → Verify password with bcrypt (12 salt rounds)
  → Generate JWT (7-day expiry)
  → Return { user, token }
  → Store in localStorage: cmms_token, cmms_user
```

## JWT Implementation (src/lib/auth.ts)

```ts
const JWT_SECRET = process.env.JWT_SECRET || 'cmms-enterprise-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// Functions:
hashPassword(password) → string       // bcrypt hash
verifyPassword(password, hash) → bool // bcrypt compare
generateToken(payload) → string       // jwt.sign
verifyToken(token) → JwtPayload|null  // jwt.verify
```

## JWT Payload

```ts
{
  userId: string,
  tenantId: string,
  email: string,
  role: string,
  name: string
}
```

## Client-Side Auth (src/store/index.ts - useAuthStore)

### State:
- `user: AuthUser | null`
- `token: string | null`
- `isAuthenticated: boolean`
- `isLoading: boolean`

### Actions:
- `login(email, password)` → POST /api/auth/login → store in localStorage
- `register({ name, email, password, role })` → POST /api/auth/register
- `logout()` → Clear localStorage + sessionStorage + reset state
- `secureLogout(reason?)` → BroadcastChannel logout + clear all + history protection
- `updateProfile(data)` → Update user in store + localStorage
- `loadFromStorage()` → Restore from localStorage on page load

## Auth Guards

### Session Provider (src/components/session/session-provider.tsx)
- Calls `loadFromStorage()` on mount
- Sets up fetch interceptor via `setupFetchInterceptor()`
- Manages idle timer via `useIdleTimer()`

### Auth Guard (src/components/session/auth-guard.tsx)
- Protects views that require authentication
- Redirects to landing/dashboard if not authenticated

### Idle Timer (src/components/session/idle-timer.tsx)
- Tracks user activity (mouse, keyboard, scroll)
- Logs out after inactivity period
- Shows warning modal before logout

### Broadcast Logout (src/components/session/broadcast-logout.tsx)
- Uses `BroadcastChannel('cmms-logout')` for cross-tab logout
- Falls back to localStorage event for Safari compatibility

### Session Heartbeat (src/components/session/session-heartbeat.tsx)
- Periodic API calls to keep session alive
- Updates `lastLogin` timestamp

## Secure Fetch (src/hooks/use-secure-fetch.ts)

### `useSecureFetch()` hook:
- Automatically adds `Authorization: Bearer {token}` header
- Handles 401/403 with full session cleanup
- Broadcasts logout event to other tabs

### `setupFetchInterceptor()`:
- Patches `window.fetch` globally
- Auto-injects auth header for `/api/` calls (excluding login/register)
- Schedules cleanup on 401/403 via setTimeout (non-blocking)

## Middleware (src/middleware.ts)

- Adds security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- Cache control: no-store, no-cache, must-revalidate
- Matches all routes except static assets
- Does NOT handle auth (auth is client-side)

## Registration

- POST /api/auth/register
- Creates User with hashed password
- Assigns to default tenant
- Returns JWT token
- Auto-creates default department if needed

## Password Security

- bcrypt with 12 salt rounds
- JWT secret from environment variable (with fallback)
- 7-day token expiry
- No refresh token mechanism (simplified)

## Session Storage

- `localStorage.cmms_token` - JWT token string
- `localStorage.cmms_user` - JSON.stringify(AuthUser)
- No httpOnly cookies (client-side auth)
- Cleared on logout (both localStorage and sessionStorage)

## Multi-Tab Behavior

- BroadcastChannel API for instant cross-tab logout
- Fallback: localStorage events for Safari
- History pushState prevents back-button after logout
- `window.history.replaceState` on session expiry