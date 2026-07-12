# FacilityPro — WhatsApp Integration

## Overview
The WhatsApp system provides a **conversational bot interface** for customers to interact with the CMMS. It supports complaint creation, status queries, feedback, emergency alerts, and broadcast campaigns. The system has two layers:

1. **WhatsApp Service Manager** (`src/lib/whatsapp-service/manager.ts`) — Manages the OpenWA service process (starts, polls, monitors)
2. **WhatsApp Business Logic** (`src/lib/whatsapp/`) — Provider abstraction, conversation engine, workflow automation

## Provider Architecture
Three providers supported via `WhatsAppProviderInterface`:

| Provider | Class | Auth Method | QR Code |
|----------|-------|-------------|----------|
| **OpenWA** | `OpenWAProvider` | API key + session | Yes (scan-based) |
| **Meta Cloud API** | `MetaProvider` | Access token | No |
| **Twilio** | `TwilioProvider` | Account SID + Auth token | No |

Factory: `createProvider(config: WhatsAppConfig)` returns the appropriate provider.

### Provider Methods
```ts
sendMessage(to: string, message: string, options?: SendMessageOptions): Promise<SendMessageResult>
sendMedia(to: string, mediaUrl: string, caption?: string, type?: string): Promise<SendMessageResult>
getStatus(): Promise<ConnectionStatus>
connect(): Promise<void>
disconnect(): Promise<void>
getQrCode(): Promise<string | null>
```

## WhatsApp Service Manager (`waManager`)
A singleton that manages the OpenWA mini-service running on port 3001:
- Located at `mini-services/whatsapp-service/`
- Session: `MOHDHMS`
- Auto-starts via `ensureService()` when `connect()` is called
- Polls service status every 3 seconds
- Fetches QR codes for scanning
- Logs all events (last 500 entries)
- Chrome detection: auto-finds Puppeteer Chrome at `~/.cache/puppeteer/chrome/`

## Conversation Engine (`conversation-engine.ts`)
State machine for WhatsApp conversations. Each session has a `state` field that drives the flow.

### Session States (16)
| State | Description |
|-------|-------------|
| `menu` | Main menu (1-8 options) |
| `new_complaint_desc` | Collecting complaint description |
| `new_complaint_media` | Waiting for photo/video |
| `new_complaint_equipment` | Selecting equipment |
| `service_request_desc` | Collecting service request |
| `status_query` | Querying complaint status |
| `invoice_query` | Querying invoice info |
| `equipment_list` | Listing customer's equipment |
| `emergency_desc` | Collecting emergency details |
| `feedback_rating` | Collecting 1-5 rating |
| `feedback_comment` | Collecting feedback text |
| `escalation_desc` | Collecting escalation details |
| `chat` | Free-form chat with support |
| `appointment_date` | Scheduling appointment date |
| `appointment_time` | Scheduling appointment time |
| `appointment_location` | Scheduling appointment location |

### Main Menu Options (8)
1. New Complaint
2. Service Request
3. Complaint Status
4. My Equipment
5. Work Order Status
6. Invoices
7. Emergency Service
8. Speak to Customer Support

## Workflow Engine (`workflow-engine.ts`)
Automated actions triggered by WhatsApp interactions:

| Function | Trigger | Actions |
|----------|---------|---------|
| `autoRouteComplaint()` | New complaint via WhatsApp | Finds least-busy supervisor, assigns, notifies |
| `autoCreateWorkOrder()` | Complaint assigned | Creates WorkOrder, notifies technician |
| `sendComplaintUpdate()` | Status changes (assigned, in_progress, resolved) | Sends template message to customer |
| `sendInvoiceNotification()` | Invoice created | Sends invoice details via WhatsApp |
| `sendEtaUpdate()` | Work order ETA set | Sends ETA notification |
| `sendFeedbackRequest()` | Complaint resolved | Sets session to feedback_rating state |
| `handleEmergency()` | Emergency complaint | Sends alerts to emergency numbers + all staff |
| `executeBroadcast()` | Campaign triggered | Sends to all active sessions, tracks delivery |

## Database Models (7)

### WhatsAppConfig
Per-tenant configuration. Provider settings (OpenWA/Meta/Twilio URLs, keys, tokens). Unique per tenant.

### WhatsAppSession
Per-customer conversation state. Tracks `phoneNumber`, `state`, `stateData` (JSON), `isActive`, `isBlocked`, `messageCount`.

### WhatsAppMessage
All messages (inbound + outbound). Includes `direction`, `messageType`, `content`, `mediaUrl`, `isFromBot`, `isTemplate`, `status`.

### ConversationThread
Groups related messages. Has `subject`, `status` (active/resolved/archived), `assignedToId`.

### WhatsAppTemplate
Message templates with `{{variables}}`. Categories: welcome, complaint_created, assigned, in_progress, completed, invoice, feedback, emergency, appointment, notification, custom.

### BroadcastLog
Mass message campaigns. Tracks `recipientCount`, `sentCount`, `deliveredCount`, `failedCount`.

### CustomerFeedback / CustomerReport
WhatsApp-specific feedback (1-5 rating) and escalation/reports from customers.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/whatsapp` | Dashboard stats |
| POST | `/api/whatsapp/send` | Send message to number |
| GET/POST | `/api/whatsapp/connection` | Get status / connect/disconnect |
| GET/PUT | `/api/whatsapp/config` | Get/update config |
| GET/POST | `/api/whatsapp/sessions` | List/create sessions |
| GET/PUT | `/api/whatsapp/sessions/[id]` | Get/update session |
| GET/POST | `/api/whatsapp/sessions/[id]/messages` | List/send messages |
| GET/POST | `/api/whatsapp/threads` | List/create threads |
| GET/PUT | `/api/whatsapp/threads/[id]` | Get/update thread |
| GET/POST | `/api/whatsapp/templates` | List/create templates |
| GET/PUT/DELETE | `/api/whatsapp/templates/[id]` | CRUD template |
| GET/POST | `/api/whatsapp/campaigns` | List/create campaigns |
| GET/PUT | `/api/whatsapp/campaigns/[id]` | Get/update campaign |
| GET | `/api/whatsapp/reports` | Reports & analytics |
| POST | `/api/whatsapp/webhook` | Incoming webhook from provider |
| POST | `/api/whatsapp/seed-templates` | Seed default templates |
| POST | `/api/whatsapp/feedback` | Submit feedback |

## Frontend Components
| Component | File | Purpose |
|-----------|------|---------|
| `WhatsAppDashboard` | `components/modules/whatsapp/whatsapp-dashboard.tsx` | Overview stats, connection status |
| `WhatsAppChats` | `components/modules/whatsapp/whatsapp-chats.tsx` | Chat interface |
| `WhatsAppTemplates` | `components/modules/whatsapp/whatsapp-templates.tsx` | Template management |
| `WhatsAppCampaigns` | `components/modules/whatsapp/whatsapp-campaigns.tsx` | Campaign management |
| `WhatsAppSettings` | `components/modules/whatsapp/whatsapp-settings.tsx` | Provider configuration |

## Feature Access
| Role | Access |
|------|--------|
| super_admin, admin, manager, supervisor | Full access |
| All others | No access |

## Template Variables
Templates use `{{variable_name}}` syntax:
```ts
renderTemplate(template, { complaint_id: "ABC123", technician_name: "John" })
// "{{complaint_id}} assigned to {{technician_name}}"
// → "ABC123 assigned to John"
```
