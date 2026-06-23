# FacilityPro — Equipment Feature

## Overview
Equipment management tracks all physical assets (HVAC systems, electrical panels, plumbing fixtures, generators, mechanical equipment, fire protection systems). Each equipment can have a QR code for quick identification and service requests.

## Data Model (`Equipment` in Prisma schema)

### Key Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `tenantId` | String | Tenant scope |
| `customerId` | String? | Optional FK to Customer |
| `name` | String | Equipment name |
| `category` | String | HVAC, Electrical, Plumbing, Generator, Mechanical, FireProtection |
| `assetNumber` | String (unique) | Auto-generated (e.g. HVC-A3F7K2XYZ) |
| `qrCode` | String (unique) | QR data string |
| `qrId` | String? (unique) | Public QR ID (e.g. QR-GEN-NFYH3RZAA) |
| `brand` | String? | Manufacturer |
| `model` | String? | Model number |
| `serialNumber` | String? | Serial number |
| `location` | String? | Physical location |
| `building` | String? | Building name |
| `room` | String? | Room/area |
| `installDate` | DateTime? | Installation date |
| `warrantyExpiry` | DateTime? | Warranty end date |
| `warrantyInfo` | String? | Warranty details |
| `status` | String | active, inactive, under_maintenance, decommissioned, critical, out_of_service, overdue_pm |
| `condition` | String | good, fair, poor, critical |
| `photos` | String? | JSON array of URLs |
| `documents` | String? | JSON array of URLs |
| `specifications` | String? | JSON object |
| `notes` | String? | Free text |
| `scanCount` | Int | Number of QR scans |
| `lastScannedAt` | DateTime? | Last scan timestamp |

### Relations
- `tenant` → Tenant
- `customer` → Customer (optional)
- `complaints` → Complaint[]
- `workOrders` → WorkOrder[]
- `pmSchedules` → PmSchedule[]
- `scanLogs` → ScanLog[]
- `qrCodeRecord` → EquipmentQrCode (one-to-one)

### Related Models
- **EquipmentQrCode**: Separate model tracking QR code generation, version, URL
- **ScanLog**: Every QR scan is logged with device, IP, location, user (if authenticated)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/equipment` | List (paginated, filter by category/status/customerId/search) |
| POST | `/api/equipment` | Create equipment (auto-generates assetNumber) |
| GET | `/api/equipment/[id]` | Get single equipment |
| PUT | `/api/equipment/[id]` | Update equipment |
| DELETE | `/api/equipment/[id]` | Delete equipment |
| GET | `/api/equipment/qr-analytics` | QR scan analytics |
| POST | `/api/equipment/bulk-qr` | Bulk generate QR codes |
| GET | `/api/equipment/qr/[id]` | Lookup equipment by qrId |

## QR Code System
- Each equipment gets a `qrId` in format `QR-GEN-{8CHAR}` (generated via `generateQrId()`)
- Public URL: `https://domain.com/equipment/QR-GEN-NFYH3RZAA`
- QR landing page: `src/app/equipment/[qrId]/page.tsx`
- Scan analytics tracked via `ScanLog` model (device, IP, user agent, location)

## Asset Number Generation
```ts
generateAssetNumber(category)
// HVAC → HVC-A3F7K2XYZ
// Electrical → ELC-A3F7K2XYZ
// Plumbing → PLB-A3F7K2XYZ
// Generator → GEN-A3F7K2XYZ
// Mechanical → MEC-A3F7K2XYZ
// FireProtection → FIR-A3F7K2XYZ
```

## Equipment Categories
| Category | Asset Prefix |
|----------|-------------|
| HVAC | HVC |
| Electrical | ELC |
| Plumbing | PLB |
| Generator | GEN |
| Mechanical | MEC |
| FireProtection | FIR |

## Frontend Components
| Component | File | Purpose |
|-----------|------|---------|
| `EquipmentList` | `components/modules/equipment/equipment-list.tsx` | Table with filters, QR badges |
| `EquipmentDetail` | `components/modules/equipment/equipment-detail.tsx` | Full detail view with complaints, work orders, PM schedules |

## Equipment Status Flow
```
active → under_maintenance → active
active → critical → active
active → decommissioned (terminal)
active → overdue_pm → active
```

## Label Generation
- `src/lib/label-pdf.ts` — PDF label generation
- `src/lib/label-templates.ts` — Label template definitions
- `src/lib/qr-utils.ts` — QR code utilities
