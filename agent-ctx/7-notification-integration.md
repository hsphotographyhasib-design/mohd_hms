# Task 7 — Integrate Enterprise Notification Service into Existing Modules

## Agent: Main Agent
## Status: ✅ Completed

## Objective
Replace direct `toast` from `sonner` imports with the enterprise `useNotification()` hook in 7 files, keeping exact same behavior.

## Files Modified (7 total)

### 1. `src/modules/complaints/components/new-complaint.tsx`
- Replaced `import { toast } from 'sonner'` → `import { useNotification } from '@/modules/notifications'`
- Added `const notify = useNotification()` in `NewComplaint()` component
- `toast.success(...)` → `notify.showSuccess('Complaint submitted successfully!', { description: ..., recordNumber: result.complaintNumber })`
- `toast.error(...)` → `notify.showError('Submission failed', { description: err.message })`

### 2. `src/modules/complaints/components/complaint-detail.tsx`
- Replaced import and added hook in `ComplaintDetail()` component
- 7 toast calls replaced:
  - `toast.error('Failed to load workflow data')` → `notify.showError(...)`
  - `toast.error('Failed to load complaint')` → `notify.showError(...)`
  - `toast.success(data.message)` → `notify.showSuccess(data.message, { recordNumber: complaint?.complaintNumber })`
  - `toast.error(err.message)` → `notify.showError('Action failed', { description: err.message })`
  - 4 validation `toast.error(...)` calls → `notify.showError(...)`

### 3. `src/modules/complaints/components/complaint-list.tsx`
- Replaced import and added hook in `ComplaintList()` component
- 3 toast calls replaced: error for load, error for title required, success/error for create

### 4. `src/modules/work-orders/components/work-order-form.tsx`
- Replaced import and added hook in `NewWorkOrderForm()` component
- 6 toast calls replaced:
  - `toast.info('Draft restored')` → `notify.showInfo(...)`
  - `toast.info('QR Scanner...')` → `notify.showInfo(...)`
  - `toast.warning(...)` → `notify.showWarning(...)`
  - `toast.error(...)` for validation → `notify.showError(...)`
  - `toast.success(...)` for draft → `notify.showDraftSaved('Work order draft saved', { recordNumber })`
  - `toast.success(...)` for creation → `notify.showSuccess('Work order created', { recordNumber: data.workOrderNumber })`
  - `toast.error(...)` for catch → `notify.showError(...)`

### 5. `src/modules/invoices/components/invoice-list.tsx`
- Replaced import and added hook in `InvoiceList()` component
- 5 toast calls replaced: load error, validation x2, success, create error

### 6. `src/modules/inventory/components/inventory-items.tsx`
- Replaced import and added hook in `InventoryItems()` component
- 3 toast calls replaced: load error, archive success, archive error

### 7. `src/app-shell/nav/app-header.tsx`
- Replaced import and added hook in `AppHeader()` component
- 2 toast calls replaced: language toggle info, QR scanner info
- Added `notify` to `handleLanguageToggle` dependency array to fix React Compiler memoization error

## Verification
- **No remaining `toast.` calls** in any of the 7 edited files
- **No remaining `from 'sonner'` imports** in any of the 7 edited files
- **ESLint: 0 errors, 11 warnings** (all pre-existing, none from our changes)
- **Dev server compiles successfully**

## Rules Followed
- ✅ No business logic, API calls, or data flow changed
- ✅ No component props, state management, or rendering logic changed
- ✅ Only `toast.xxx()` → `notify.xxx()` replacements
- ✅ `useNotification` hook called inside each component function body
- ✅ Hook at top level of each component
- ✅ No `toast.promise()` or `toast.custom()` calls existed to preserve
- ✅ No files outside the list were modified
- ✅ No new files created