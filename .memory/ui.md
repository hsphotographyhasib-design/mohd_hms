# UI Design Patterns & Standards

> Auto-generated from codebase scan.

## Design System

- **Component Library**: shadcn/ui (New York style)
- **Icons**: Lucide React (always use Lucide, never custom SVGs)
- **Animations**: Framer Motion (AnimatePresence, motion.div/motion.aside)
- **Charts**: Recharts
- **Toasts**: sonner (toast()) + custom window events
- **Forms**: react-hook-form + zod validation
- **Date Formatting**: date-fns
- **Color Theme**: Emerald green primary (emerald-600), no indigo/blue unless specified

## Layout Structure

```
┌──────────────────────────────────────────┐
│ AppHeader (sticky top, z-50)             │
│ - Logo, Search, Quick Actions,           │
│   Notifications, User Avatar             │
├──────────────────────────────────────────┤
│ FloatingNavBar (secondary nav)           │
├──────────────────────────────────────────┤
│                                          │
│  Main Content Area                       │
│  (max-w-7xl, mx-auto, px-4/6/8)         │
│  pt-2 pb-8                               │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ ViewRouter (conditional render)  │    │
│  │ - Lazy-loaded via Suspense       │    │
│  │ - Skeleton loading state         │    │
│  └──────────────────────────────────┘    │
│                                          │
└──────────────────────────────────────────┘
```

### Sidebar (Desktop):
- Fixed left, z-40
- Collapsible: 256px (open) ↔ 68px (collapsed) via Framer Motion
- Active item: `bg-emerald-600 text-white shadow-sm shadow-emerald-600/25`
- Inactive: `text-sidebar-foreground/70 hover:bg-sidebar-accent`
- Section divider for CMS nav items

### Sidebar (Mobile):
- Sheet component (slide-in drawer)
- Triggered on screens < 1024px
- Full-width overlay

## Component Patterns

### List Views (standard pattern):
```
1. Page header: title + "New" button (if permitted)
2. Stats cards row (4 columns: total, active, pending, etc.)
3. Filter bar: search, status dropdown, category dropdown, sort
4. Data table with:
   - Colored type icons
   - Status badges (from STATUS_CONFIG or status→color maps)
   - Priority badges
   - Action dropdown (Edit, Delete, etc.)
5. Pagination (page numbers)
6. Empty state with call-to-action
```

### Detail Views (standard pattern):
```
1. Back button + title + status badge
2. Tab navigation (Details, Timeline/History, Related)
3. Main content area with sections
4. Side info panels (metadata, dates, links)
5. Action buttons (workflow actions, edit, delete)
```

### Forms (standard pattern):
```
1. Form fields in Card components
2. Grid layout: 1-col mobile, 2-col desktop
3. Select components for dropdowns
4. Auto-complete/search for entity selection (customers, equipment, employees)
5. JSON fields for arrays (items, photos, etc.)
6. Save/Cancel buttons at bottom
```

## Status Badge Colors

### Complaints (from STATUS_CONFIG):
| Status | Color |
|--------|-------|
| NEW | slate |
| ASSIGNED | blue |
| ACCEPTED | cyan |
| WORK_ORDER_CREATED | indigo |
| IN_PROGRESS | amber |
| WAITING_CLIENT | orange |
| CLIENT_CONFIRMED | emerald |
| DRAFT_INVOICE | violet |
| INVOICE_APPROVED | purple |
| INVOICE_SENT | sky |
| PAID | green |
| CLOSED | zinc |
| REWORK_REQUIRED | rose |

### Priority:
- low: blue/gray
- medium: amber
- high: orange
- critical: red

## Common UI Elements

### Skeleton Loading:
```tsx
<Skeleton className="h-8 w-64" />
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
</div>
```

### Empty States:
- Centered layout with icon, title, description, action button
- Consistent across all list views

### Dialog/Sheet Patterns:
- Dialog: For forms and confirmations
- Sheet: For mobile-friendly side panels
- AlertDialog: For destructive actions (delete, cancel)

### Table Patterns:
- shadcn/ui Table component
- Responsive: horizontal scroll on mobile
- Hover effects on rows
- Sticky header if long tables

## Color Rules

- **NEVER use indigo or blue as primary** (unless explicitly requested)
- **Primary accent**: emerald-600 (#059669)
- **Danger**: rose/red
- **Warning**: amber/orange
- **Success**: green/emerald
- **Info**: sky/cyan
- **Neutral**: slate/gray/zinc

## Typography

- Font weights: font-semibold for headers, font-medium for subheaders
- Text sizes: text-lg for page titles, text-sm for body, text-xs for labels
- Truncation: `truncate` class for long text
- Uppercase tracking: `text-[11px] font-semibold uppercase tracking-wider`

## Spacing

- Card padding: p-4 or p-6
- Gap between cards: gap-4 or gap-6
- Section margins: space-y-4 or space-y-6
- Max content width: max-w-7xl
- Responsive padding: px-4 md:px-6 lg:px-8

## Responsive Design

- Mobile-first approach
- Breakpoints: sm (640), md (768), lg (1024), xl (1280)
- Minimum touch target: 44px
- Collapsible sidebar on mobile
- Stacked layouts on mobile, grid on desktop
- max-h-96 overflow-y-auto for long lists with custom scrollbar

## Print Styles (globals.css)

- A4 width: max-width 210mm
- print-color-adjust: exact (preserve colors)
- print:hidden for screen-only elements
- Hide sidebar, header, floating nav on print
- Inline summary panels (no sidebar)

## Sticky Footer Pattern

```html
<div class="min-h-screen flex flex-col">
  <header>...</header>
  <main class="flex-1">...</main>
  <footer class="mt-auto">...</footer>
</div>
```

## Animation Patterns (Framer Motion)

### Sidebar collapse:
```tsx
<motion.aside animate={{ width: isOpen ? 256 : 68 }} transition={{ duration: 0.2, ease: 'easeInOut' }}>
```

### Text reveal:
```tsx
<AnimatePresence>
  {!collapsed && (
    <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="whitespace-nowrap overflow-hidden" />
  )}
</AnimatePresence>
```

### Page transitions (optional):
```tsx
<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
```