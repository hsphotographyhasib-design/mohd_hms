# Task ID: 3-4 — Enterprise Technician Management Backend API

## Agent: Main Agent

## Task
Build 4 API routes for the Enterprise Technician Management Module backend.

## Files Created

### 1. `/src/app/api/technicians/route.ts`
- **GET** handler with query params: `page`, `pageSize`, `search`, `status`, `department`, `skill`, `sortBy`
- **KPI stats** (not paginated): totalTechnicians, activeCount, inactiveCount, availableCount, busyCount, onLeaveCount, offlineCount, emergencyCount
- **Paginated technician list** enriched via `Promise.all` with 6 parallel queries:
  - Leave check (APPROVED leave requests spanning today)
  - Emergency detection (critical/high IN_PROGRESS complaints)
  - Completed complaint stats (avg completion time)
  - Today's completed complaints count
  - Today's attendance (hours worked)
  - Skills (distinct complaint categories, max 8)
- Each technician includes: basic info, department, availabilityStatus, workload metrics, currentComplaint, currentWorkOrder, performance stats, skills, onLeave/leaveType, completedToday, hoursWorkedToday
- Post-filtering by status and skill after enrichment
- Sorting by name/availability/workload/recently_active
- Pagination response

### 2. `/src/app/api/technicians/[id]/route.ts`
- **GET** single technician with full detail
- 11 parallel Prisma queries for enrichment
- Returns: basic info, department with head name, active complaints (with customer + equipment), active work orders, today's attendance, today's complaint timeline, performance summary (monthly completed, avg time, ratings), inventory issued (stock movements), leave history (last 10), current leave status

### 3. `/src/app/api/technicians/[id]/performance/route.ts`
- **GET** performance metrics for a single technician
- 10 parallel queries covering: completed jobs (all time/month/week/today), pending jobs, cancelled jobs, SLA compliance (priority-based thresholds), customer ratings, first-time fix rate (via timeline REWORK_REQUIRED check), rework rate, attendance % (working days calc excluding weekends), punctuality (9 AM check-in), avg completion time, revenue generated (invoices linked to tech's complaints/WOs), labor hours/material costs

### 4. `/src/app/api/technicians/[id]/timeline/route.ts`
- **GET** today's activity timeline
- Merges attendance check-in/out with complaint timeline entries
- Unified chronological sort
- Each entry: time, actionType, description, entityId, entityType, metadata
- Summary with total activities, check-ins/outs, complaint activities

## Design Decisions
- All routes use `export const dynamic = 'force-dynamic'`
- All routes use the standard auth pattern: `verifyToken` → 401 if invalid
- All routes use `import { db } from '@/lib/db'` (Prisma query builder only, zero raw SQL)
- SLA thresholds: critical=4h, high=8h, medium=24h, low=48h
- Punctuality threshold: check-in before or at 9:00 AM
- Working days exclude weekends (Saturday/Sunday)
- First-time fix rate: complaints that reached CLOSED/PAID without ever entering REWORK_REQUIRED status (checked via ComplaintTimeline)
- Max active jobs per technician: 5

## Lint Results
- 0 errors in the 4 new API route files
- 6 pre-existing errors in `technician-ops-center.tsx` (frontend component, not part of this task)
- 8 warnings in prisma-generated files (standard)