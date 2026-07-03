# Task 4 — Mobile Screens Agent

## Work Log
- Read worklog.md and explored existing codebase: mobile-shell.tsx, complaint-list.tsx, new-complaint.tsx, types, store, API routes
- Identified store pattern: `useAppStore().setView(view, params)` with `viewParams` for navigation
- Identified auth pattern: `useAuthStore().token` for Bearer token
- Identified API shape: `GET /api/complaints?page=&pageSize=&search=&status=` returns `{ data, total, page, pageSize, totalPages }`
- Identified POST API: `POST /api/complaints` requires `{ customerId, title, description, priority, category, ... }`, returns `{ id, complaintNumber, ... }`

## Files Created

### 1. `/src/components/mobile/mobile-complaints.tsx`
- `'use client'` component exporting `MobileComplaints`
- **Header**: "My Complaints" title with total count badge
- **Search bar**: With clear button, debounced (400ms) search
- **Filter tabs**: Horizontally scrollable (All, Open, Assigned, In Progress, Completed, Closed) with counts in emerald pills
- **Complaint cards**: Left colored status dot (red=NEW, orange=ASSIGNED, blue=IN_PROGRESS, green=PAID, gray=CLOSED, etc.), title, customer name, category, date, status badge, right chevron
- **Pull-to-refresh**: Touch-based (80px threshold), shows spinning refresh indicator
- **Infinite scroll**: Loads 20 per page, detects scroll-to-bottom (120px threshold), shows loading spinner
- **Empty state**: AlertTriangle icon with contextual message for search/no-data
- **Skeleton loading**: 6 skeleton cards during initial load
- **End-of-list**: "Showing all N complaints" indicator
- Navigation: `setView('complaint-detail', { id })` on card tap

### 2. `/src/components/mobile/mobile-new-complaint.tsx`
- `'use client'` component exporting `MobileNewComplaint`
- **Header**: Back arrow (→ `setView('complaints')`), "New Complaint" title
- **Customer dropdown**: Fetches from `/api/customers?pageSize=200`, shows warning card if empty
- **Category dropdown**: HVAC, Electrical, Plumbing, Generator, Mechanical, Fire Protection, Civil, General
- **Location/Building dropdown**: 8 preset buildings, mapped to `gpsLocation` field in API
- **Title input**: Max 200 chars with counter
- **Description textarea**: Min-height 120px, max 2000 chars with counter
- **Priority selector**: Low/Medium/High as colored radio-button-style cards with dot indicators and descriptions
- **Photo upload area**: Gallery + Camera buttons (both trigger file input), thumbnail grid with remove on hover, 10MB limit per file
- **Submit button**: Fixed bottom, emerald-600, disabled until valid (customer + 3-char title + 10-char desc + category), shows spinner during submit
- **Toast**: Success with complaint number, error with message
- **Safe area**: Submit bar respects `env(safe-area-inset-bottom)`

## Lint Results
- 0 errors, 7 pre-existing warnings (all from generated Prisma files)
- Both new files pass cleanly