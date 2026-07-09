// WhatsApp barrel export

// Engine — provider interface & factory
export {
  type ConnectionStatus,
  type SendMessageOptions,
  type SendMessageResult,
  type WhatsAppProviderInterface,
  createProvider,
  renderTemplate,
} from './engine/provider';

// Engine — AI conversation handler
export {
  type ResponseItem as AiResponseItem,
  processIncomingAiMessage,
} from './engine/ai-conversation-engine';

// Engine — basic conversation handler
export {
  type ResponseItem as BasicResponseItem,
  processIncomingMessage,
} from './engine/conversation-engine';

// Engine — workflow automation
export {
  autoRouteComplaint,
  autoCreateWorkOrder,
  sendComplaintUpdate,
  sendInvoiceNotification,
  sendEtaUpdate,
  sendFeedbackRequest,
  handleEmergency,
  executeBroadcast,
} from './engine/workflow-engine';

// Service — WhatsApp service manager
export { waManager } from './service/manager';
export type { WAStatus } from './service/manager';