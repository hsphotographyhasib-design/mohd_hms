# Task 5 — Three Mobile Detail Screens

## Files Created

### 1. `/src/components/mobile/mobile-complaint-detail.tsx`
**Exported:** `MobileComplaintDetail`

- **Header:** Back arrow (`setView('complaints')`) + "Complaint Details" title
- **Status Badge:** Color-coded per status (NEW=slate, ASSIGNED=blue, IN_PROGRESS=amber, etc.)
- **Info Card:** Complaint Ref (generated `CMP-YYYY-DDD`), Title, Customer, Equipment, Category, Date
- **Description:** Full text with `whitespace-pre-wrap`
- **Status Timeline:** 6 vertical steps (Created → Technician Assigned → Accepted → In Progress → Completed → Feedback Pending) with green checkmarks for completed, green dot for current, gray circles for pending
- **Technician Card:** Avatar with initials, name, role, call button
- **Attachments:** Horizontal scrollable image thumbnails with fallback for non-image files
- **Linked Work Orders:** Clickable cards navigating to work-order-detail
- **Action Buttons:** "Call Technician" (green), "WhatsApp Technician" (green outline), "View Work Order", "Chat"
- **Data:** Fetches from `GET /api/complaints/${complaintId}` with Bearer token; `complaintId` from `useAppStore().viewParams.id`
- **Loading/Error states:** Skeleton loading, red error card
- **Animation:** Framer Motion staggered fade-in on each section

### 2. `/src/components/mobile/mobile-work-order-detail.tsx`
**Exported:** `MobileWorkOrderDetail`

- **Header:** Back arrow (`setView('work-orders')`) + "Work Order Details" title
- **Badges:** Status badge + Priority badge + Type badge (in a row)
- **Info Card:** WO Ref, Title, linked Complaint (clickable → complaint-detail), Equipment, Date, Scheduled date, Labor hours, Total cost
- **Description:** Full text
- **Team Section:** Assigned Technician (avatar + phone button) and Creator
- **Timeline:** 5 steps (Draft → Pending → Assigned → In Progress → Completed) with progress tracking
- **Materials Used:** List with quantity and cost
- **Notes:** Section with sticky note icon
- **Attachments:** Horizontal scrollable image thumbnails
- **Action Buttons:** "Contact Technician" (green), "View Timeline" (outline)
- **Data:** Fetches from `GET /api/work-orders/${workOrderId}`; `workOrderId` from `useAppStore().viewParams.id`

### 3. `/src/components/mobile/mobile-rate-feedback.tsx`
**Exported:** `MobileRateFeedback`

- **Header:** Back arrow + "Rate & Feedback" title
- **Success Animation:** Framer Motion animated checkmark — green circle scales in with spring physics, SVG path draws checkmark, glow pulse effect, "Work Completed!" text fades in
- **Work Order Info Card:** WO ref number + date
- **Star Rating:** 5 interactive stars (Lucide `Star` icon), hover preview, tap to select, rating label (Very Poor → Excellent), displays `X/5` on selection
- **Feedback Textarea:** Optional, 500 char limit with counter, placeholder text
- **Photo Upload:** Optional, file input for images, thumbnail preview with remove button, dashed "Add Photo" button
- **Submit Button:** Green when rating selected, gray/disabled when no rating, loading spinner on submit
- **Skip Button:** Text button below submit
- **Submitted State:** Shows success checkmark animation + "Back to Work Orders" button
- **API:** POSTs to `/api/work-orders/${workOrderId}/feedback` with `{ rating, feedback }`, falls back to PUT on linked complaint if feedback endpoint fails

### 4. `/src/app/api/work-orders/[id]/feedback/route.ts` (bonus)
- POST endpoint accepting `{ rating: number, feedback?: string }`
- Validates rating 1-5
- Updates linked complaint's `customerRating` and `customerFeedback`
- Returns success response

## Technical Notes
- All 3 components use `'use client'` and shadcn/ui components (Badge, Button, Card, Skeleton, Avatar, Textarea)
- ESLint: 0 errors, 7 pre-existing warnings (all from generated Prisma files)
- Uses existing patterns: `getToken()`, `useAppStore`, `useAuthStore`, `toast` from sonner, `cn` utility
- Framer Motion for entry animations and the feedback checkmark
- Mobile-first responsive design with proper touch targets (min 44px)