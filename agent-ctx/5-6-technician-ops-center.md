---
Task ID: 5-6
Agent: Main Agent
Task: Build Enterprise Technician Operations Center frontend component

Work Log:
- Read worklog.md and studied existing module patterns (complaint-assignment-screen.tsx, UI components)
- Created `/home/z/my-project/src/components/modules/technicians/` directory
- Built `technician-ops-center.tsx` (~1369 lines) with all 4 required sections:

  **SECTION 1 — KPI Cards Row:**
  - 6 responsive cards (2/3/6 cols at sm/md/xl breakpoints)
  - Total, Available, Busy, On Leave, Emergency, Offline
  - Each card has: themed icon, label, count, % of total (except Total)
  - Subtle hover effects with shadow and translate

  **SECTION 2 — Search Bar + Filters:**
  - Full-text search input (name, ID, phone, department, skill) with 250ms debounce
  - Status filter dropdown (11 statuses including all custom ones)
  - Department filter dropdown (fetched from /api/departments)
  - Sort dropdown (Name, Availability, Workload, Recently Active)
  - View toggle (Grid/List) with emerald active state
  - Refresh button with spinning animation during load

  **SECTION 3 — Technician Cards (Grid) / Table (List):**
  - Grid View: 1/2/3/4 cols responsive, each card has:
    - Avatar with status-colored ring + online indicator dot
    - Name, Employee ID, Status badge (exact colors per spec)
    - Department & Role icons
    - Current Assignment section (complaint #, customer, site, category, priority badge, progress bar)
    - Stats row (Active Jobs/Max, Completion Rate, Avg Time)
    - Skills tags (emerald-100 pills, max 4 + overflow)
    - Footer (Last Login via date-fns, Actions dropdown: View Detail, Assign Job, Call)
    - Left border color matching technician status
  - List View: Compact table with responsive column visibility
  - Skeleton loading states for both views
  - Empty state with clear-filters button

  **SECTION 4 — Technician Detail Panel (Sheet/Drawer):**
  - Right-side Sheet (sm:max-w-lg) with 6 tabs:
    1. Overview: Profile header, contact info (email, phone, dept, location), 4 summary cards, current assignments list, skills
    2. Complaints: Active complaints + recently completed, fetched from /api/technicians/[id]?include=complaints
    3. Work Orders: Active WOs + recently completed, fetched from /api/technicians/[id]?include=workOrders
    4. Timeline: Vertical timeline with colored dots/lines, fetched from /api/technicians/[id]/timeline
    5. Performance: 10-metric grid (completed jobs, avg SLA, rating, FTFR, rework, attendance, punctuality, travel time, revenue, labor hours), fetched from /api/technicians/[id]/performance
    6. Attendance: Monthly table with check-in/out, hours, status badges
  - Tab navigation with emerald active indicator

- All API calls include `Authorization: Bearer <token>` header
- Used `useCallback` for fetch functions, `useMemo` for sorting
- Fixed React 19 lint errors (set-state-in-effect) using render-phase state sync pattern
- ESLint: 0 errors, 7 warnings (all in generated Prisma files)
- Green emerald theme applied throughout
- All status colors match the exact spec (bg-emerald-500, bg-blue-500, bg-amber-500, bg-yellow-500, bg-red-500, bg-purple-500, bg-gray-300, bg-gray-500, bg-gray-400)

Stage Summary:
- Technician Operations Center fully built as a single comprehensive component
- Named export: `TechnicianOpsCenter`
- File: `src/components/modules/technicians/technician-ops-center.tsx` (1369 lines)
- Zero lint errors