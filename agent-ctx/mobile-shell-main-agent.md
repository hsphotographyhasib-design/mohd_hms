# Task ID: mobile-shell
# Agent: Main Agent
# Task: Build mobile-responsive shell infrastructure for MOHD.HMS ENTERPRISE

## Work Log
- Read `worklog.md` for project context: Next.js 16 SPA, Zustand view-switching, emerald theme, shadcn/ui
- Examined existing files: `types/index.ts` (AppView union), `store/index.ts` (useAppStore/useAuthStore/useNotificationStore), `app-shell.tsx` (ViewRouter pattern), `sheet.tsx` (bottom sheet support), `button.tsx` (shadcn button), `sonner.tsx` (toast provider)
- Updated `src/hooks/use-mobile.ts` — replaced old shadcn-style hook with simplified version accepting a customizable `breakpoint` parameter (default 768)
- Created `src/components/mobile/mobile-shell.tsx` (~310 lines) with:
  - **MobileHeader**: sticky h-14 white header with MOHD.HMS text logo (emerald-600), search toggle (animated slide-down input via framer-motion AnimatePresence), notification bell with red badge (unreadCount), profile avatar circle
  - **MobileBottomNav**: fixed h-16 bottom bar with 5 positions (Dashboard, Complaints, FAB, Work Orders, More), safe-area-inset-bottom padding, emerald active dot indicator with spring animation via layoutId, 44px minimum touch targets
  - **QuickActionsSheet**: bottom Sheet with 4 actions (New Complaint, New Work Order, Scan QR Code, New Quotation), icon + label + arrow rows, Scan QR shows toast placeholder
  - **MoreMenuSheet**: bottom Sheet with categorized 3-column grid (Operations: Equipment/PM/Inventory/Customers; Business: Invoices/Quotations/Finance/Purchases; People: Employees/Technicians; Fleet: Vehicles; System: Reports/Settings), scrollable, rounded top corners
  - **MobileShell**: main export accepting `children: React.ReactNode`, full-screen fixed layout (header + scrollable main with pb-20 + bottom nav)
- ESLint: 0 errors, 7 warnings (all prisma-generated, unchanged)

## Files Created/Modified
- **Modified**: `src/hooks/use-mobile.ts` — simplified hook with customizable breakpoint
- **Created**: `src/components/mobile/mobile-shell.tsx` — complete mobile shell component (~310 lines)

## Design Decisions
- FAB is a raised green circle (-mt-6, size-14, emerald-600, shadow) centered in the bottom nav
- Search slides down from header with framer-motion height/opacity animation
- Active tab indicator uses `layoutId` for smooth spring transitions between tabs
- More menu uses 3-column grid (per spec for wider phones/tablets)
- All icons from lucide-react, no external dependencies added
- Uses `toast` from sonner for QR scan placeholder
- Bottom nav has `pb-20` on main content to prevent content hiding behind nav