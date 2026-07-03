# WhatsApp Integration

> Auto-generated from codebase scan.

## Overview

Full WhatsApp Business API integration via a separate mini-service on port 3003. Supports multi-provider (OpenWA, Meta, Twilio), conversation threading, broadcast campaigns, template management, and automated conversation engine.

## Architecture

```
Next.js :3000 ←→ Caddy Gateway ←→ WhatsApp Service :3003
   (Frontend)     (XTransformPort=3003)    (Bun + Socket.IO)
```

All WhatsApp API calls use: `fetch('/api/whatsapp/...?XTransformPort=3003')`

## Mini-Service

**Location**: `mini-services/whatsapp-service/`
**Port**: 3003
**Entry**: `index.ts`
**Protocol**: REST + Socket.IO
**Start**: `bun --hot index.ts`

### Key Files:
- `src/lib/whatsapp/provider.ts` - WhatsApp provider abstraction
- `src/lib/whatsapp/manager.ts` - Connection/session management
- `src/lib/whatsapp/conversation-engine.ts` - Automated conversation state machine
- `src/lib/whatsapp/workflow-engine.ts` - WhatsApp → complaint/workflow bridge

## Providers

| Provider | Description |
|----------|-------------|
| openwa | Open-WA (web WhatsApp wrapper) |
| meta | Meta WhatsApp Business API |
| twilio | Twilio WhatsApp API |

## Conversation State Machine

### Session States (SessionState type):
```
menu → new_complaint_desc → new_complaint_media → new_complaint_equipment
service_request_desc → status_query → invoice_query
equipment_list → emergency_desc
feedback_rating → feedback_comment
escalation_desc → chat
appointment_date → appointment_time → appointment_location
```

### Customer Flows:
1. **New Complaint**: menu → describe → attach photos → select equipment → submit
2. **Service Request**: menu → describe → submit
3. **Status Query**: menu → enter complaint ID → get status
4. **Invoice Query**: menu → enter invoice number → get details
5. **Equipment List**: menu → get all equipment for customer
6. **Emergency**: menu → describe → high priority complaint
7. **Feedback**: menu → rating (1-5) → optional comment
8. **Escalation**: menu → describe concern → create escalation
9. **Appointment**: menu → date → time → location → submit
10. **Chat**: Free-form conversation

## WhatsApp Views

| View | File | Description |
|------|------|-------------|
| whatsapp | whatsapp-dashboard.tsx | Overview: stats, connection, recent activity |
| whatsapp-chats | whatsapp-chats.tsx | Thread list with unread badges, search |
| whatsapp-templates | whatsapp-templates.tsx | Template CRUD with categories |
| whatsapp-campaigns | whatsapp-campaigns.tsx | Broadcast campaign management |
| whatsapp-settings | whatsapp-settings.tsx | Provider config, connection, QR scan |

## Template Categories

`welcome, complaint_created, assigned, in_progress, completed, invoice, feedback, emergency, appointment, notification, custom`

## Template Variables

Templates support `{{variable}}` syntax:
- `{{customer_name}}`, `{{technician_name}}`, `{{complaint_id}}`, `{{status}}`, `{{eta}}`, etc.

## Broadcast Campaigns

| Status | Description |
|--------|-------------|
| draft | Being prepared |
| scheduled | Scheduled for future |
| sending | Currently sending |
| completed | All messages sent |
| failed | Failed to send |

Tracks: recipientCount, sentCount, deliveredCount, failedCount, readCount

## Database Models

- `WhatsAppConfig` - Provider configuration
- `WhatsAppSession` - Per-customer chat sessions with state machine
- `WhatsAppMessage` - All messages (inbound + outbound)
- `ConversationThread` - Threaded conversations
- `WhatsAppTemplate` - Message templates
- `BroadcastLog` - Campaign logs
- `WhatsAppDeliveryLog` - Per-message delivery tracking
- `CustomerFeedback` - Ratings from WhatsApp
- `CustomerReport` - Reports submitted via WhatsApp

## Customer WhatsApp Linkage

Customer model has WhatsApp fields:
- `isWhatsappVerified` - Whether phone is verified
- `whatsappId` - WhatsApp user ID
- `whatsappPhone` - WhatsApp phone number
- `lastWhatsappActivity` - Last interaction timestamp

## Webhook

`POST /api/whatsapp/webhook?XTransformPort=3003` (public)
- Receives incoming messages from provider
- Routes to conversation engine
- Creates/updates WhatsAppSession state

## Session Storage

`mini-services/whatsapp-service/storage/sessions/` - OpenWA session files