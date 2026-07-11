// AI barrel export

// AI action executor (parses [ACTION:...] tags from AI responses)
export {
  type ActionData,
  type ActionResult,
  parseActionTag,
  executeAction,
} from './actions';

// AI service (GLM-powered NLU via z-ai-web-dev-sdk)
export * from './ai-service';

// Customer memory (builds context about a customer for AI conversations)
export * from './customer-memory';

// AI system prompts
export {
  LANGUAGE_DETECTION_PROMPT,
  INTENT_DETECTION_PROMPT,
  MAIN_SYSTEM_PROMPT,
  PAYMENT_ANALYSIS_PROMPT,
} from './prompts';