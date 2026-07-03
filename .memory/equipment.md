# Equipment & QR Code System

> Auto-generated from codebase scan.

## Overview

Equipment/asset management with real scannable QR codes. Each equipment has a unique QR ID that opens a public page with live asset data, maintenance history, and service request capability.

## Files

| File | Purpose |
|------|---------|
| `src/components/modules/equipment/equipment-list.tsx` | Equipment list with filters, category badges, QR status |
| `src/components/modules/equipment/equipment-detail.tsx` | Equipment detail with QR manager, scan analytics, related complaints/WOs |
| `src/app/equipment/[qrId]/page.tsx` | **PUBLIC PAGE** - Equipment info page for QR scans |
| `src/app/api/equipment/route.ts` | CRUD |
| `src/app/api/equipment/[id]/route.ts` | Detail, update |
| `src/app/api/equipment/qr/[id]/route.ts` | Get/regenerate QR codes |
| `src/app/api/equipment/qr-analytics/route.ts` | Scan analytics |
| `src/app/api/equipment/bulk-qr/route.ts` | Batch QR generation |
| `src/app/api/qr/lookup/[qrId]/route.ts` | **PUBLIC** - Lookup by QR ID |
| `src/app/api/qr/scan/route.ts` | **PUBLIC** - Log scan event |
| `src/app/api/qr/service-request/route.ts` | **PUBLIC** - Submit service request |
| `src/lib/qr-utils.ts` | QR utility functions |
| `src/lib/label-templates.ts` | Label template definitions (10 templates, 5 sizes) |
| `src/lib/label-pdf.ts` | PDF label generator |

## Equipment Categories

| Category | Prefix | Color |
|----------|--------|-------|
| HVAC | HVC | blue |
| Electrical | ELC | amber |
| Plumbing | PLB | cyan |
| Generator | GEN | red |
| Mechanical | MEC | purple |
| FireProtection | FIR | orange |

## Equipment Status Values

| Status | Display | Icon | Color |
|--------|---------|------|-------|
| active | Active | CheckCircle2 | emerald |
| inactive | Inactive | XCircle | gray |
| under_maintenance | Under Maintenance | Wrench | amber |
| decommissioned | Decommissioned | Archive | stone |
| critical | Critical | AlertTriangle | red |
| out_of_service | Out of Service | XCircle | gray |
| overdue_pm | Overdue PM | Clock | amber |

## Condition Values

excellent, good, fair, poor, critical, broken, new, worn

## QR Code System

### QR ID Format
```
QR-{CATEGORY_PREFIX}-{7_CHAR_RANDOM}
Example: QR-GEN-NFYH3RZAA
```

### Generation
- Uses `crypto.getRandomValues()` for secure randomness
- 7-character alphanumeric (uppercase)
- Category prefix from `CATEGORY_PREFIXES` map
- Stored in `Equipment.qrId` field (unique)
- `EquipmentQrCode` record created with `qrUrl`, `version`, `isActive`

### Public URL
```
https://{domain}/equipment/{qrId}
```

### Validation
```ts
isValidQrId(qrId) → boolean  // Regex: /^QR-[A-Z]{3}-[A-Z0-9]{7}$/
```

### Asset Number Format
```
{PREFIX}-{6_DIGIT_SEQUENCE}
Example: GEN-000001
```

## Public Equipment Page (/equipment/[qrId])

Mobile-first responsive design with:
- Company header bar with logo
- Equipment hero card with QR verification badge
- Live status card with color indicators + condition progress bar
- Equipment details grid (asset no, serial, brand, model, category, location, building, room, install date, warranty)
- Customer info card
- Maintenance history timeline with filter tabs (30/90/180/365 days)
- Service request form (pre-fills equipment ID, location, customer)
- Support buttons (WhatsApp, Call, Email, Share)
- Scan counter with last scan timestamp

## QR Manager Component (in equipment-detail.tsx)

### QR Code Tab:
- Real scannable QR code via `qrcode.react`
- Actions: Copy Link, Open Public Page, Download PNG, Print Label, Regenerate QR
- Regeneration increments version, updates qrId and qrUrl

### Scan Analytics Tab:
- Period filters (7d, 30d, 90d, 1y, all)
- Total scans counter
- Unique visitors counter
- Device breakdown (mobile/desktop/tablet)
- Browser breakdown
- Recent scans list with timestamps

## Scan Logging

Every QR scan creates a `ScanLog`:
- `equipmentId`, `qrId`
- `scannedBy` (userId or null for anonymous)
- `ipAddress`, `userAgent`
- `device` (parsed from UA: mobile/desktop/tablet)
- `browser` (parsed from UA)
- `location` (geo if available)
- `referer`

Updates `Equipment.scanCount++` and `Equipment.lastScannedAt`

## Label Templates

10 label templates across 5 sizes:
- Small (38×25mm): Basic, Compact
- Medium (50×30mm): Standard, Detailed
- Large (60×40mm): Professional, FullInfo
- XLarge (80×50mm): Premium, Complete
- Custom: MinLabel, MaxLabel

Each template defines: layout, font sizes, QR position, data fields to include.

## Label PDF Generation

- Uses `src/lib/label-pdf.ts` for A4-sheet equipment tags
- Professional layout with QR code injected via base64
- Includes company branding, equipment details, QR code
- Triggered from "Print Label" action in QR Manager

## Key Utilities (src/lib/qr-utils.ts)

```ts
generateQrId(category) → string         // QR-GEN-NFYH3RZAA
generateAssetNumber(category) → string  // GEN-000001
buildQrUrl(domain, qrId) → string       // https://domain/equipment/QR-...
isValidQrId(qrId) → boolean             // Regex validation
formatCategory(cat) → string            // FireProtection → "Fire Protection"
getStatusConfig(status) → object        // Label, color, bgColor, icon
getConditionColor(condition) → string   // Tailwind text color
getWarrantyStatus(expiry) → object      // Status, color, isExpired
parseDevice(userAgent) → object         // {device, browser}
```

## Security

- Internal database IDs are NEVER exposed in public URLs
- Only QR IDs (format: QR-XXX-XXXXXXX) are used in public URLs
- Scan rate limiting via IP check
- Equipment detail shows all data; public page shows limited data