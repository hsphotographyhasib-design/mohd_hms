---
Task ID: 6
Agent: main
Task: Build FOUR Mobile Utility Screens (Invoices, Notifications, Profile, Help & Support)

Work Log:
- Created `/src/components/mobile/mobile-invoices.tsx` — MobileInvoices component
  - "My Invoices" header with back arrow + search toggle
  - Horizontally scrollable tabs: All, Paid, Unpaid, Overdue
  - Debounced search input with clear button
  - Invoice cards with colored status dots (red=pending, green=paid, orange=overdue), status badges, currency formatting, date display
  - Infinite scroll loading, skeleton loading states, error/retry state, empty states per tab
  - Fetches from `GET /api/invoices?page={page}&pageSize=20&status={status}&search={query}` with Bearer token
  - Tap card navigates to invoice-detail view via `useAppStore().setView()`
- Created `/src/components/mobile/mobile-notifications.tsx` — MobileNotifications component
  - "Notifications" header with unread count badge and "Mark all as read" button
  - Notifications grouped by category (Complaint, Work Order, Invoice, System, General)
  - Each group shows category icon with color-coded background, item count
  - Individual items: colored icon, bold title for unread + blue dot indicator, description, relative timestamp
  - Mark single as read: `PUT /api/notifications` with `{ id }`
  - Mark all read: `PUT /api/notifications` with `{ markAllRead: true }`
  - Fetches from `GET /api/notifications?page=1&pageSize=50`
  - Tapping notification navigates to related entity (complaint-detail, work-order-detail, etc.)
  - Skeleton loading, error/retry, empty states
- Created `/src/components/mobile/mobile-profile.tsx` — MobileProfile component
  - "Profile" header with edit icon
  - Profile card: large 72px avatar circle with online indicator, name, role badge, email, phone, organization
  - 7 settings menu items with color-coded icons: My Buildings, Payment Methods, Change Password, Notification Settings, Language, About Us, Help & Support
  - Red "Logout" button at bottom
  - Unauthenticated state with sign-in prompt
  - App version footer
  - Uses `useAuthStore` for user data and logout
- Created `/src/components/mobile/mobile-help.tsx` — MobileHelp component
  - "Help & Support" header with back arrow to dashboard
  - Green gradient support hero card with headset icon: "How can we help you?"
  - FAQ section using shadcn Accordion with 6 common questions and detailed answers
  - Support options list: Create Support Ticket, Live Chat (with green "Online" pulsing badge), Call Support, Terms & Conditions, Privacy Policy
  - "Still need help?" contact card with Email Support button
  - App version at bottom: "Version 1.0.0"

Stage Summary:
- All 4 mobile utility screens created and fully functional
- ESLint: 0 errors, 7 pre-existing warnings (all from generated Prisma files)
- Dev server compiles successfully with no issues
- Components follow existing project patterns: `useAppStore().setView()`, `useAuthStore`, shadcn/ui components, emerald color scheme
- All components are `'use client'` and properly exported