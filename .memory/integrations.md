# External Integrations

> Auto-generated from codebase scan.

## WhatsApp Business API

### Providers:
1. **OpenWA** - Open-WA web WhatsApp wrapper (primary)
   - Session files stored in `mini-services/whatsapp-service/storage/sessions/`
   - QR code scanning for authentication
   
2. **Meta WhatsApp Business API**
   - Access token, phone number ID, business account
   - Webhook verification with verify token
   
3. **Twilio WhatsApp**
   - Account SID, auth token, phone number

### Integration Pattern:
- Separate Bun mini-service on port 3003
- REST API + Socket.IO
- Next.js communicates via Caddy gateway (`?XTransformPort=3003`)
- Conversation engine handles automated flows

## QR Code Generation

### Library: `qrcode.react` v4
- Used for: Equipment QR codes, Invoice/Quotation verification QR
- SVG and Canvas rendering supported
- Public equipment page QR links to `/equipment/{qrId}`

### Library: `jsbarcode` v3
- Used for: Invoice barcode (Code128 format)
- Renders to SVG element

## PDF Generation

### Library: `puppeteer-core` v25
- Available for server-side PDF generation
- Used for: Service reports, equipment labels

### Custom Label PDF (src/lib/label-pdf.ts)
- Generates A4 sheets with equipment labels
- Includes QR code, company branding, asset details
- 10 template layouts across 5 sizes

## Content Management (CMS)

### Landing Page:
- Public landing page served via `/api/cms/public/landing`
- Separate from the main SPA (public route)
- CMS data drives the public website

### Markdown Editor:
- `@mdxeditor/editor` v3 - Rich text/MDX editor
- Used for: Blog posts, service descriptions, page content

### Image Processing:
- `sharp` v0.34 - Server-side image processing
- Used for: Thumbnail generation, image optimization

## Date/Time

### Library: `date-fns` v4
- All date formatting and manipulation
- Functions: format, formatDistanceToNow, isAfter, isBefore, addDays, etc.

## Charts & Visualization

### Library: `recharts` v2
- Dashboard charts: revenue trends, complaint status distribution, category breakdown
- Finance charts: aging reports, expense breakdown

## Utility Libraries

| Library | Purpose |
|---------|---------|
| `uuid` v11 | Generating unique IDs |
| `zod` v4 | Schema validation for forms |
| `react-hook-form` v7 | Form state management |
| `@tanstack/react-table` v8 | Advanced table features |
| `@tanstack/react-query` v5 | Server state management |
| `@dnd-kit/core` v6 | Drag and drop |
| `embla-carousel-react` v8 | Carousels |
| `react-markdown` v10 | Markdown rendering |
| `react-syntax-highlighter` v15 | Code highlighting |
| `input-otp` v1 | OTP input component |
| `vaul` v1 | Drawer component |
| `next-themes` v0.4 | Light/dark mode |
| `next-intl` v4 | Internationalization (installed, usage TBD) |

## AI/SDK

### z-ai-web-dev-sdk
- AI capabilities (LLM, VLM, TTS, ASR, image generation, web search)
- **CRITICAL**: Must only be used in backend (server-side)
- Never import in client components
- Used via API routes only

## Gateway Configuration (Caddyfile)

```
:81 {
  @transform_port_query { query XTransformPort=* }
  handle @transform_port_query {
    reverse_proxy 127.0.0.1:{query.XTransformPort}
  }
  handle {
    reverse_proxy 127.0.0.1:3000
  }
}
```

- Port 81 exposed externally (Caddy)
- All traffic defaults to Next.js :3000
- `XTransformPort` query param routes to mini-services
- WebSocket support for Socket.IO (via Caddy proxy)