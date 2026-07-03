# Architecture

> Auto-generated from codebase scan.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Caddy Gateway (:80/:443)          │
│  - XTransformPort query → routes to mini-services   │
│  - Default → port 3000 (Next.js)                    │
└──────────────┬──────────────────────┬───────────────┘
               │                      │
    ┌──────────▼──────────┐  ┌───────▼──────────┐
    │   Next.js :3000     │  │ WhatsApp :3003   │
    │   (App Router)      │  │ (Bun service)    │
    │                     │  │ (Socket.IO)      │
    │   - API Routes      │  └──────────────────┘
    │   - Public Pages    │
    │   - SPA Shell       │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │   SQLite (Prisma)   │
    │   db/prisma.db      │
    └─────────────────────┘
```

## SPA View Routing (NOT file-based routing)

This is a **Single Page Application** that uses Zustand for view management, NOT Next.js file-based routing. All user-facing views render on the `/` route.

### How it works:
1. `useAppStore` manages `currentView: AppView` and `viewParams: Record<string, string>`
2. `setView(viewName, { id: 'xxx' })` changes the visible component
3. `app-shell.tsx` conditionally renders the matching lazy-loaded component
4. `sidebar.tsx` and `app-header.tsx` use `setView()` for navigation

### Navigation Example:
```ts
// Navigate to equipment detail
useAppStore.getState().setView('equipment-detail', { id: equipmentId });

// Read params in the component
const { viewParams } = useAppStore();
const id = viewParams?.id; // ALWAYS string type
```

### View Registry (app-shell.tsx):
- All views are lazy-loaded with `React.lazy()`
- `Suspense` wrapper shows skeleton loading state
- Each view maps from `AppView` union type to a component

## State Management

### Zustand Stores (src/store/index.ts)

| Store | Purpose | Key State |
|-------|---------|-----------|
| `useAuthStore` | Authentication | user, token, isAuthenticated, login(), logout() |
| `useAppStore` | Navigation & UI | currentView, viewParams, sidebarOpen, searchOpen |
| `useNotificationStore` | Notifications | unreadCount, notifications[], markAsRead() |

### Permission System (store/index.ts)

```ts
canAccess(userRole, feature) → boolean  // Feature-level access
hasMinRole(userRole, minRole) → boolean // Role hierarchy check
hasPermission(userRole, requiredRoles) → boolean // Role list check
```

Role hierarchy: super_admin(100) > admin(90) > manager(80) > supervisor(70) > finance(60) > technician(50) > customer(10)

## API Route Patterns

### Standard Authenticated Route:
```ts
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  // 1. Verify JWT
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Get tenant from payload
  const tenantId = payload.tenantId;

  // 3. Query with tenant isolation
  const data = await db.model.findMany({ where: { tenantId, ... } });

  // 4. Return
  return NextResponse.json({ data });
}
```

### Standard Public Route (QR/WhatsApp):
```ts
// No auth verification, but still tenant-scoped via URL/domain
```

## Component Architecture

### Module Pattern:
```
src/components/modules/{module}/
  {module}-list.tsx      # List view with table, filters, pagination
  {module}-detail.tsx    # Detail view with tabs, actions
  {module}-form.tsx      # Create/edit form (optional)
```

### UI Component Usage:
- **shadcn/ui** (New York style) for ALL UI components
- **Lucide React** for ALL icons
- **Framer Motion** for animations (AnimatePresence, motion.div)
- **Recharts** for charts
- **date-fns** for date formatting
- **sonner** for toast notifications
- **zod** for form validation
- **react-hook-form** for form state

### Layout Structure:
```
AppShell
├── AppHeader (sticky top, with search, notifications, user menu)
├── FloatingNavBar (secondary navigation)
└── ViewRouter
    └── [Lazy-loaded Module View]
```

### Sidebar:
- Desktop: Fixed left, collapsible (256px ↔ 68px) with Framer Motion
- Mobile: Sheet (slide-in drawer) on screens < 1024px
- Active item: emerald-600 bg with white text
- Section dividers for main nav vs CMS

## File Storage Architecture

```
storage/
  tenants/
    {tenantId}/
      {module}/
        {folder}/
          {filename}
```

- Storage abstraction via `src/lib/storage/provider.ts`
- `LocalStorageProvider` implements chunk-based read/write
- Supports: chunk upload, file assembly, directory listing, copy, move, stat
- SHA256 checksum for deduplication

## Print System

Invoice and quotation detail pages have print-optimized CSS:
- A4 paper width (210mm max-width)
- `print-color-adjust: exact` for green headers
- `print:hidden` class for screen-only elements
- Inline summary on print (no sidebar)