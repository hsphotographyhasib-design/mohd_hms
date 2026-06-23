# FacilityPro — Dependencies

## Core Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | ^16.1.1 | React framework (App Router) |
| `react` | ^19.0.0 | UI library |
| `react-dom` | ^19.0.0 | React DOM renderer |
| `typescript` | ^5 | Type safety |

## Database & ORM

| Package | Version | Purpose |
|---------|---------|---------|
| `@prisma/client` | ^6.11.1 | Database client (generated) |
| `prisma` | ^6.11.1 | ORM CLI & schema |

Database: SQLite (file-based, zero config)

## Auth & Security

| Package | Version | Purpose |
|---------|---------|---------|
| `bcryptjs` | ^3.0.3 | Password hashing (12 salt rounds) |
| `jsonwebtoken` | ^9.0.3 | JWT token generation/verification (7-day expiry) |
| `next-auth` | ^4.24.11 | Installed but NOT actively used (custom JWT auth instead) |

## UI & Styling

| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | ^4 | Utility-first CSS framework |
| `@tailwindcss/postcss` | ^4 | PostCSS integration |
| `tailwindcss-animate` | ^1.0.7 | Animation utilities for Tailwind |
| `tw-animate-css` | ^1.3.5 | CSS animation classes |
| `class-variance-authority` | ^0.7.1 | Component variant styling (cva) |
| `clsx` | ^2.1.1 | Conditional class names |
| `tailwind-merge` | ^3.3.1 | Smart Tailwind class merging |
| `lucide-react` | ^0.525.0 | Icon library (Lucide icons) |
| `framer-motion` | ^12.23.2 | Animation library |
| `next-themes` | ^0.4.6 | Dark/light theme switching |

## shadcn/ui Components (Radix UI primitives)

| Package | Purpose |
|---------|---------|
| `@radix-ui/react-dialog` | Dialogs/modals |
| `@radix-ui/react-dropdown-menu` | Dropdown menus |
| `@radix-ui/react-select` | Select inputs |
| `@radix-ui/react-tabs` | Tab navigation |
| `@radix-ui/react-toast` | Toast notifications |
| `@radix-ui/react-tooltip` | Tooltips |
| `@radix-ui/react-popover` | Popovers |
| `@radix-ui/react-checkbox` | Checkboxes |
| `@radix-ui/react-switch` | Toggle switches |
| `@radix-ui/react-accordion` | Accordions |
| `@radix-ui/react-alert-dialog` | Alert dialogs |
| `@radix-ui/react-avatar` | User avatars |
| `@radix-ui/react-collapsible` | Collapsible sections |
| `@radix-ui/react-context-menu` | Context menus |
| `@radix-ui/react-hover-card` | Hover cards |
| `@radix-ui/react-label` | Form labels |
| `@radix-ui/react-menubar` | Menu bars |
| `@radix-ui/react-navigation-menu` | Navigation menus |
| `@radix-ui/react-progress` | Progress bars |
| `@radix-ui/react-radio-group` | Radio button groups |
| `@radix-ui/react-scroll-area` | Custom scrollbars |
| `@radix-ui/react-separator` | Visual separators |
| `@radix-ui/react-slider` | Range sliders |
| `@radix-ui/react-slot` | Component slot composition |
| `@radix-ui/react-toggle` | Toggle buttons |
| `@radix-ui/react-toggle-group` | Toggle button groups |
| `@radix-ui/react-aspect-ratio` | Aspect ratio containers |

## Additional UI Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| `cmdk` | ^1.1.1 | Command palette (Cmd+K) |
| `sonner` | ^2.0.6 | Toast notifications (alternative to radix toast) |
| `vaul` | ^1.1.2 | Drawer components (mobile-friendly) |
| `embla-carousel-react` | ^8.6.0 | Carousel/slider |
| `react-resizable-panels` | ^3.0.3 | Resizable panel layouts |
| `@dnd-kit/core` | ^6.3.1 | Drag and drop |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable lists |
| `input-otp` | ^1.4.2 | OTP input fields |

## Data & Forms

| Package | Version | Purpose |
|---------|---------|---------|
| `react-hook-form` | ^7.60.0 | Form state management |
| `@hookform/resolvers` | ^5.1.1 | Form validation resolvers (Zod) |
| `zod` | ^4.0.2 | Schema validation |
| `@tanstack/react-table` | ^8.21.3 | Data tables |
| `@tanstack/react-query` | ^5.82.0 | Server state management (installed, not actively used yet) |

## Charts & Visualization

| Package | Version | Purpose |
|---------|---------|---------|
| `recharts` | ^2.15.4 | Chart library (bar, line, pie, area) |
| `@radix-ui/react-charts` (via chart.tsx) | — | Chart components wrapper |

## Date & Time

| Package | Version | Purpose |
|---------|---------|---------|
| `date-fns` | ^4.1.0 | Date formatting, manipulation |
| `react-day-picker` | ^9.8.0 | Calendar date picker |

## Rich Text & Content

| Package | Version | Purpose |
|---------|---------|---------|
| `@mdxeditor/editor` | ^3.39.1 | MDX/rich text editor (CMS) |
| `react-markdown` | ^10.1.0 | Markdown rendering |
| `react-syntax-highlighter` | ^15.6.1 | Code syntax highlighting |

## QR Codes & Barcodes

| Package | Version | Purpose |
|---------|---------|---------|
| `qrcode` | ^1.5.4 | QR code generation (Node.js) |
| `qrcode.react` | ^4.2.0 | QR code React component |
| `jsbarcode` | ^3.12.3 | Barcode generation |

## PDF & Image

| Package | Version | Purpose |
|---------|---------|---------|
| `puppeteer-core` | ^25.1.0 | Headless browser for PDF generation |
| `sharp` | ^0.34.3 | Image processing |

## Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| `zustand` | ^5.0.6 | Lightweight state management |
| `uuid` | ^11.1.0 | UUID generation |
| `@reactuses/core` | ^6.0.5 | React utility hooks |
| `next-intl` | ^4.3.4 | Internationalization (installed, not actively used yet) |

## AI/SDK

| Package | Version | Purpose |
|---------|---------|---------|
| `z-ai-web-dev-sdk` | ^0.0.18 | AI development SDK |

## Runtime

| Tool | Purpose |
|------|---------|
| `bun` | JavaScript runtime (used for `dev`, `start`, `db:*` scripts) |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@tailwindcss/postcss` | ^4 | PostCSS plugin |
| `@types/react` | ^19 | React type definitions |
| `@types/react-dom` | ^19 | React DOM types |
| `@types/bcryptjs` | ^3.0.0 | bcryptjs types |
| `@types/jsonwebtoken` | ^9.0.10 | JWT types |
| `@types/qrcode` | ^1.5.6 | qrcode types |
| `bun-types` | ^1.3.4 | Bun runtime types |
| `eslint` | ^9 | Linter |
| `eslint-config-next` | ^16.1.1 | Next.js ESLint config |
