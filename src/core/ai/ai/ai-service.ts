/**
 * AI Service — GLM-powered NLU via z-ai-web-dev-sdk
 *
 * Core AI brain for the WhatsApp assistant.
 * Uses GLM for language detection, intent classification, and response generation.
 * Uses VLM (Vision) for payment screenshot analysis.
 */

import ZAI from 'z-ai-web-dev-sdk';
import { LANGUAGE_DETECTION_PROMPT, INTENT_DETECTION_PROMPT, MAIN_SYSTEM_PROMPT, PAYMENT_ANALYSIS_PROMPT } from './prompts';

// ============ Types ============

export interface LanguageResult {
  language: string;     // 'en' | 'ms' | 'bn' | 'ar' | 'mixed'
  confidence: number;   // 0-1
}

export interface IntentResult {
  intent: string;       // complaint | status_query | quotation | service_request | payment | feedback | general | greeting | emergency
  entities: Record<string, string>;
  confidence: number;
  category?: string;
  priority?: string;
}

export interface ReplyParams {
  customerContext: string;
  conversationHistory: Array<{ role: string; content: string }>;
  detectedLanguage: string;
  detectedIntent: string;
  userMessage: string;
  systemPrompt?: string;
  businessInfo?: string;
}

export interface PaymentAnalysisResult {
  isPaymentScreenshot: boolean;
  amount?: string;
  reference?: string;
  date?: string;
  bank?: string;
  transactionId?: string;
  senderName?: string;
  rawText?: string;
}

// ============ Singleton ZAI Instance ============

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZai(): Promise<Awaited<ReturnType<typeof ZAI.create>>> {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// ============ Retry Helper ============

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError;
}

// ============ Language Detection ============

export async function detectLanguage(text: string): Promise<LanguageResult> {
  try {
    const zai = await getZai();
    const completion = await withRetry(() =>
      zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: LANGUAGE_DETECTION_PROMPT },
          { role: 'user', content: text },
        ],
        thinking: { type: 'disabled' },
      })
    );

    const raw = (completion.choices?.[0]?.message?.content || '').trim().toLowerCase();
    const validLangs = ['en', 'ms', 'bn', 'ar', 'mixed'];
    const detected = validLangs.find(l => raw === l) || 'en';
    return { language: detected, confidence: 0.9 };
  } catch (error) {
    console.error('[AI] Language detection failed, using heuristic:', error);
    return heuristicLanguageDetection(text);
  }
}

// ============ Intent Detection ============

export async function detectIntent(text: string, language: string): Promise<IntentResult> {
  try {
    const zai = await getZai();
    const completion = await withRetry(() =>
      zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: INTENT_DETECTION_PROMPT },
          { role: 'user', content: text },
        ],
        thinking: { type: 'disabled' },
      })
    );

    const raw = (completion.choices?.[0]?.message?.content || '').trim();
    // Try to parse JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        intent: parsed.intent || 'general',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
        entities: parsed.entities || {},
        category: parsed.entities?.category,
        priority: parsed.entities?.priority,
      };
    }
  } catch (error) {
    console.error('[AI] Intent detection failed, using heuristic:', error);
  }
  return heuristicIntentDetection(text, language);
}

// ============ Response Generation ============

export async function generateReply(params: ReplyParams): Promise<string> {
  const { customerContext, conversationHistory, detectedLanguage, userMessage, systemPrompt, businessInfo } = params;

  try {
    const zai = await getZai();
    const sysPrompt = systemPrompt || MAIN_SYSTEM_PROMPT + (businessInfo ? `\n\nBusiness Info: ${businessInfo}` : '') +
      `\n\nIMPORTANT: The customer is speaking in ${detectedLanguage}. You MUST reply in the same language.`;

    const messages: Array<{ role: string; content: string }> = [
      { role: 'assistant', content: sysPrompt },
    ];

    // Add customer context as a user message with AI acknowledgment
    if (customerContext) {
      messages.push({ role: 'user', content: `[System: Customer context - ${customerContext}]` });
      messages.push({ role: 'assistant', content: 'Understood. I have the customer context.' });
    }

    // Add conversation history (limited)
    const maxHistory = 20;
    const recent = conversationHistory.slice(-maxHistory);
    for (const msg of recent) {
      messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
    }

    // Current user message
    messages.push({ role: 'user', content: userMessage });

    const completion = await withRetry(() =>
      zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      })
    );

    return completion.choices?.[0]?.message?.content || getFallbackReply('general', detectedLanguage);
  } catch (error) {
    console.error('[AI] Reply generation failed, using fallback:', error);
    return getFallbackReply(params.detectedIntent, detectedLanguage);
  }
}

// ============ Payment Screenshot Analysis ============

export async function analyzePaymentScreenshot(imageUrl: string): Promise<PaymentAnalysisResult> {
  try {
    const zai = await getZai();
    const completion = await withRetry(() =>
      zai.chat.completions.createVision({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PAYMENT_ANALYSIS_PROMPT },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        thinking: { type: 'disabled' },
      })
    );

    const raw = completion.choices?.[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isPaymentScreenshot: parsed.isPaymentScreenshot !== false,
        amount: parsed.amount,
        reference: parsed.reference,
        date: parsed.date,
        bank: parsed.bank,
        transactionId: parsed.transactionId,
        senderName: parsed.senderName,
        rawText: raw,
      };
    }
  } catch (error) {
    console.error('[AI] Payment screenshot analysis failed:', error);
  }
  return { isPaymentScreenshot: false };
}

// ============ Heuristic Fallbacks ============

function heuristicLanguageDetection(text: string): LanguageResult {
  const lower = text.toLowerCase();
  const msPatterns = ['saya', 'awak', 'macam', 'tolong', 'masalah', 'aduan', 'boleh', 'terima kasih', 'sekarang', 'bila', 'tak', 'nak', 'sudah', 'belum', 'ada', 'ini', 'dia'];
  const bnPatterns = ['আমি', 'আপনি', 'সমস্যা', 'অভিযোগ', 'দয়া', 'করে', 'ধন্যবাদ', 'এখন', 'না'];
  const arPatterns = ['شكوى', 'مشكلة', 'خدمة', 'المعدات', 'شكرا', 'مرحبا', 'أحتاج', 'يرجى'];

  let msScore = 0, bnScore = 0, arScore = 0;
  for (const p of msPatterns) { if (lower.includes(p)) msScore++; }
  for (const p of bnPatterns) { if (lower.includes(p)) bnScore++; }
  for (const p of arPatterns) { if (lower.includes(p)) arScore++; }

  const maxScore = Math.max(msScore, bnScore, arScore);
  if (maxScore === 0) return { language: 'en', confidence: 0.7 };
  if (msScore === maxScore) return { language: 'ms', confidence: 0.8 };
  if (bnScore === maxScore) return { language: 'bn', confidence: 0.8 };
  if (arScore === maxScore) return { language: 'ar', confidence: 0.8 };
  return { language: 'en', confidence: 0.5 };
}

function heuristicIntentDetection(text: string, _language: string): IntentResult {
  const lower = text.toLowerCase().trim();
  const entities: Record<string, string> = {};

  const emergencyPatterns = ['emergency', 'urgent', 'sos', 'critical', 'kecemasan', 'darurat', 'fire', 'leak', 'flood', 'smoke', 'sparking'];
  if (emergencyPatterns.some(p => lower.includes(p))) {
    return { intent: 'emergency', entities, confidence: 0.9, priority: 'critical' };
  }

  const greetingPatterns = ['hi', 'hello', 'hey', 'salam', 'assalamualaikum', 'good morning', 'good afternoon'];
  if (greetingPatterns.some(p => lower === p || (lower.length < 30 && lower.startsWith(p)))) {
    return { intent: 'greeting', entities, confidence: 0.95 };
  }

  const statusPatterns = ['status', 'track', 'update', 'progress', 'my complaint', 'check status', 'ticket'];
  if (statusPatterns.some(p => lower.includes(p))) {
    const idMatch = text.match(/(CMP|TKT|WO)[\s\-_]?[\w\d]{4,12}/i);
    if (idMatch) entities.ticketId = idMatch[0];
    return { intent: 'status_query', entities, confidence: 0.85 };
  }

  const quotationPatterns = ['quotation', 'quote', 'price', 'cost', 'sebut harga', 'harga'];
  if (quotationPatterns.some(p => lower.includes(p))) {
    return { intent: 'quotation', entities, confidence: 0.85 };
  }

  const servicePatterns = ['service', 'maintenance', 'repair', 'servis', 'schedule', 'booking'];
  if (servicePatterns.some(p => lower.includes(p))) {
    return { intent: 'service_request', entities, confidence: 0.8 };
  }

  const paymentPatterns = ['payment', 'pay', 'paid', 'invoice', 'bill', 'receipt', 'bank transfer', 'pembayaran'];
  if (paymentPatterns.some(p => lower.includes(p))) {
    return { intent: 'payment', entities, confidence: 0.8 };
  }

  const complaintPatterns = ['broken', 'not working', 'damage', 'leak', 'noise', 'fault', 'problem', 'issue', 'rosak', 'bocor', 'masalah'];
  if (complaintPatterns.some(p => lower.includes(p)) || lower.length > 30) {
    return { intent: 'complaint', entities, confidence: 0.75 };
  }

  return { intent: 'general', entities, confidence: 0.5 };
}

function getFallbackReply(intent: string, language: string): string {
  const replies: Record<string, Record<string, string>> = {
    greeting: {
      en: "Welcome to MOHD.HMS ENTERPRISE! 👋\n\nHow can I help you today?\n\n• Report a maintenance issue\n• Check ticket status\n• Request a service or quotation\n• Payment inquiries",
      ms: "Selamat datang ke MOHD.HMS ENTERPRISE! 👋\n\nBagaimana saya boleh membantu anda hari ini?\n\n• Laporkan masalah penyelenggaraan\n• Semak status tiket\n• Minta perkhidmatan atau sebut harga",
      bn: "MOHD.HMS ENTERPRISE-এ স্বাগতম! 👋\n\nআজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?",
      ar: "مرحباً بكم في MOHD.HMS ENTERPRISE! 👋\n\nكيف يمكنني مساعدتك اليوم؟",
    },
    complaint: {
      en: "I understand you're experiencing an issue. Let me help.\n\nCould you provide more details?\n• What equipment is affected?\n• Where is it located?\n• When did the issue start?\n\nYou can also send a photo.",
      ms: "Saya faham anda menghadapi masalah. Biar saya bantu.\n\nBolehkah anda berikan lebih banyak butiran?\n• Peralatan mana yang terjejas?\n• Di mana lokasinya?\n• Bila masalah itu bermula?",
      bn: "আমি বুঝতে পারছি আপনি সমস্যার সম্মুখীন হচ্ছেন।\n\nদয়া করে আরও বিস্তারিত জানান।",
      ar: "أفهم أنك تواجه مشكلة. دعني أساعدك.\n\nيرجى تقديم مزيد من التفاصيل.",
    },
    status_query: {
      en: "I'll check your ticket status. Could you provide your complaint or ticket ID?\n\nIf you don't have it, I can look up your recent tickets.",
      ms: "Saya akan semak status tiket anda. Boleh berikan ID aduan?\n\nJika tiada, saya boleh semak tiket terkini anda.",
      bn: "আমি আপনার টিকেটের স্থিতি পরীক্ষা করব। দয়া করে আইডি দিন।",
      ar: "سأتحقق من حالة تذكرتك. يرجى تقديم رقم الشكوى.",
    },
    quotation: {
      en: "I'd be happy to help with a quotation. Please tell me:\n• What type of service or equipment?\n• Any specific requirements?",
      ms: "Saya sedia membantu dengan sebut harga. Sila beritahu:\n• Jenis perkhidmatan atau peralatan?",
      bn: "আমি উদ্ধৃতিতে সাহায্য করব। দয়া করে বলুন কী প্রয়োজন।",
      ar: "يسعدني مساعدتك في عرض السعر. يرجى إخباري بالتفاصيل.",
    },
    service_request: {
      en: "I can help schedule a service. Please let me know:\n• What type of service?\n• Which equipment?\n• Preferred date/time?",
      ms: "Saya boleh bantu jadualkan perkhidmatan. Sila beritahu:\n• Jenis perkhidmatan?\n• Peralatan mana?\n• Tarikh/masa keutamaan?",
      bn: "আমি সেবা নির্ধারণে সাহায্য করব। দয়া করে জানান বিস্তারিত।",
      ar: "يمكنني مساعدتك في جدولة خدمة. يرجى إخباري بالتفاصيل.",
    },
    payment: {
      en: "I can help with payment inquiries. Please provide:\n• Invoice number or reference\n• What information do you need?",
      ms: "Saya boleh bantu pertanyaan pembayaran. Boleh berikan:\n• Nombor invois atau rujukan",
      bn: "পেমেন্ট সংক্রান্ত তথ্যে সাহায্য করব। ইনভয়েস নম্বর দিন।",
      ar: "يمكنني مساعدتك في استفسارات الدفع. يرجى تقديم رقم الفاتورة.",
    },
    emergency: {
      en: "⚠️ EMERGENCY DETECTED\n\nOur team has been notified immediately.\nA team member will reach out within minutes.",
      ms: "⚠️ KECEMASAN Dikesan\n\nPasukan kami telah dimaklumkan segera.",
      bn: "⚠️ জরুরি অবস্থা\n\nআমাদের দলকে অবিলম্বে জানানো হয়েছে।",
      ar: "⚠️ تم اكتشاف حالة طوارئ\n\nتم إبلاغ فريقنا فوراً.",
    },
    general: {
      en: "Thank you for contacting MOHD.HMS ENTERPRISE! How can I assist you today?\n\nI can help with complaints, status checks, quotations, service requests, and payments.",
      ms: "Terima kasih menghubungi MOHD.HMS ENTERPRISE! Bagaimana saya boleh membantu?",
      bn: "MOHD.HMS ENTERPRISE-এ যোগাযোগের জন্য ধন্যবাদ! কীভাবে সাহায্য করব?",
      ar: "شكراً لتواصلكم مع MOHD.HMS ENTERPRISE! كيف يمكنني مساعدتك؟",
    },
  };

  const langReplies = replies[intent] || replies.general;
  return langReplies[language] || langReplies.en || replies.general.en;
}