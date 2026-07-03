/**
 * AI Conversation Engine — Routes WhatsApp messages through GLM AI
 *
 * Pipeline per message:
 * 1. Check if AI enabled (fallback to legacy menu engine)
 * 2. Handle media (payment screenshots via VLM)
 * 3. Build customer context
 * 4. Detect language
 * 5. Detect intent
 * 6. Generate AI reply
 * 7. Parse & execute action tags
 * 8. Log to AiConversationLog
 * 9. Update session state
 */

import { db } from '@/lib/db';
import type { WhatsAppSession } from '@prisma/client';
import { processIncomingMessage as legacyProcessMessage } from './conversation-engine';
import { detectLanguage, detectIntent, generateReply, analyzePaymentScreenshot } from '@/lib/ai/ai-service';
import { parseActionTag, stripActionTag, executeAction, type ActionResult } from '@/lib/ai/actions';
import { buildCustomerContext } from '@/lib/ai/customer-memory';

// ============ Types ============

export interface ResponseItem {
  content: string;
  messageType?: string;
  isTemplate?: boolean;
}

interface ConversationMessage {
  role: string;
  content: string;
}

// ============ Multi-language Confirmations ============

const CONFIRMATIONS: Record<string, (ticketId: string, title: string) => string> = {
  en: (id, title) =>
    `✅ Complaint created successfully.\n\n🎫 Ticket: ${id}\n📋 Issue: ${title}\n\nOur team will assign a technician shortly. You'll receive updates via WhatsApp.\n\nThank you for contacting MOHD.HMS ENTERPRISE.`,
  ms: (id, title) =>
    `✅ Aduan berjaya direkodkan.\n\n🎫 Tiket: ${id}\n📋 Masalah: ${title}\n\nPasukan kami akan melantik teknikal segera.\n\nTerima kasih kerana menghubungi MOHD.HMS ENTERPRISE.`,
  bn: (id, title) =>
    `✅ অভিযোগ সফলভাবে তৈরি হয়েছে।\n\n🎫 টিকেট: ${id}\n📋 সমস্যা: ${title}\n\nMOHD.HMS ENTERPRISE-এ যোগাযোগ করার জন্য ধন্যবাদ।`,
  ar: (id, title) =>
    `✅ تم إنشاء الشكوى بنجاح.\n\n🎫 التذكرة: ${id}\n📋 المشكلة: ${title}\n\nشكراً لتواصلكم مع MOHD.HMS ENTERPRISE.`,
};

// ============ Main Entry Point ============

export async function processIncomingAiMessage(
  session: WhatsAppSession,
  message: string,
  tenantId: string,
  providerMessageId?: string,
  mediaUrl?: string | null,
  mediaType?: string | null,
): Promise<ResponseItem[]> {
  const startTime = Date.now();

  // 1. Check AI config
  const config = await db.whatsAppConfig.findUnique({ where: { tenantId } });
  if (!config || !config.aiEnabled) {
    return legacyProcessMessage(session, message, tenantId, providerMessageId);
  }

  // 2. Handle media (payment screenshot analysis)
  if (mediaUrl && mediaType?.includes('image')) {
    return handleMediaMessage(session, message, mediaUrl, tenantId, config, startTime);
  }

  // 3. Build customer context
  let customerContext = '';
  try {
    customerContext = await buildCustomerContext(tenantId, session.customerId, session.phoneNumber);
  } catch (err) {
    console.error('[AI Engine] Customer context failed:', err);
    customerContext = `Customer phone: ${session.phoneNumber}`;
  }

  // 4. Get conversation history
  let history: ConversationMessage[] = [];
  try {
    const rawHistory = session.aiConversationHistory;
    if (rawHistory) {
      history = JSON.parse(rawHistory);
    }
  } catch {
    history = [];
  }

  // 5. Detect language
  let detectedLang = session.aiDetectedLanguage || 'en';
  try {
    const langResult = await detectLanguage(message);
    detectedLang = langResult.language;
  } catch (err) {
    console.error('[AI Engine] Language detection failed:', err);
  }

  // 6. Detect intent
  let intentResult;
  try {
    intentResult = await detectIntent(message, detectedLang);
  } catch (err) {
    console.error('[AI Engine] Intent detection failed:', err);
    intentResult = { intent: 'general', confidence: 0.5, entities: {} };
  }

  // 7. Generate AI reply
  let aiResponse: string;
  try {
    aiResponse = await generateReply({
      customerContext,
      conversationHistory: history,
      detectedLanguage: detectedLang,
      detectedIntent: intentResult.intent,
      userMessage: message,
      businessInfo: `MOHD.HMS ENTERPRISE — Facility Management & Maintenance Services, Brunei`,
    });

    // Simulate typing delay
    const delay = config.aiTypingDelay || 1500;
    await new Promise(r => setTimeout(r, Math.min(delay, 2000)));
  } catch (err) {
    console.error('[AI Engine] Reply generation failed:', err);
    aiResponse = getErrorReply(detectedLang);
  }

  const responseTimeMs = Date.now() - startTime;

  // 8. Parse and execute action tags
  let actionResult: ActionResult | null = null;
  let actionTaken = '';
  let actionData: string | undefined;

  const actionTag = parseActionTag(aiResponse);
  if (actionTag) {
    try {
      const cleanResponse = stripActionTag(aiResponse);
      actionResult = await executeAction(
        tenantId,
        session.id,
        session.customerId,
        actionTag,
        session.stateData ? JSON.parse(session.stateData) : {},
      );

      if (actionResult.success) {
        actionTaken = `action_${actionResult.actionType}`;
        actionData = JSON.stringify({
          entityId: actionResult.entityId,
          entityType: actionResult.actionType,
        });

        // Use action result message if available, otherwise use AI response
        if (actionResult.message && actionResult.actionType !== 'general') {
          // Append the action confirmation in the right language
          const confirmation = actionResult.message;
          aiResponse = cleanResponse
            ? `${cleanResponse}\n\n${confirmation}`
            : confirmation;
        } else {
          aiResponse = cleanResponse;
        }
      } else {
        aiResponse = stripActionTag(aiResponse);
      }
    } catch (err) {
      console.error('[AI Engine] Action execution failed:', err);
      aiResponse = stripActionTag(aiResponse);
    }
  }

  // 9. Save AI conversation log
  try {
    await db.aiConversationLog.create({
      data: {
        tenantId,
        sessionId: session.id,
        customerId: session.customerId,
        phoneNumber: session.phoneNumber,
        userMessage: message,
        aiResponse: stripActionTag(aiResponse),
        detectedIntent: intentResult.intent,
        detectedLanguage: detectedLang,
        confidence: intentResult.confidence,
        actionTaken: actionTaken || undefined,
        actionData,
        responseTimeMs,
      },
    });
  } catch (err) {
    console.error('[AI Engine] Failed to save conversation log:', err);
  }

  // 10. Update session
  try {
    // Add to conversation history
    const updatedHistory = [
      ...history.slice(-(config.aiMaxContext || 20) - 2), // Keep within limit
      { role: 'user', content: message },
      { role: 'assistant', content: stripActionTag(aiResponse) },
    ];

    await db.whatsAppSession.update({
      where: { id: session.id },
      data: {
        aiConversationHistory: JSON.stringify(updatedHistory),
        aiDetectedLanguage: detectedLang,
        aiIntent: intentResult.intent,
        aiConfidence: intentResult.confidence,
        lastMessageAt: new Date(),
        messageCount: { increment: 1 },
      },
    });
  } catch (err) {
    console.error('[AI Engine] Failed to update session:', err);
  }

  return [{ content: aiResponse, messageType: 'text' }];
}

// ============ Media Handler ============

async function handleMediaMessage(
  session: WhatsAppSession,
  message: string,
  mediaUrl: string,
  tenantId: string,
  config: any,
  startTime: number,
): Promise<ResponseItem[]> {
  const lang = session.aiDetectedLanguage || 'en';

  // Analyze the image for payment info
  const analysis = await analyzePaymentScreenshot(mediaUrl);

  if (analysis.isPaymentScreenshot && analysis.amount) {
    // Create a payment verification record
    try {
      await db.paymentVerification.create({
        data: {
          tenantId,
          customerId: session.customerId,
          sessionId: session.id,
          imageUrl: mediaUrl,
          extractedAmount: parseFloat(analysis.amount) || null,
          extractedDate: analysis.date || null,
          extractedBank: analysis.bank || null,
          extractedTxnId: analysis.transactionId || null,
          extractedSender: analysis.senderName || null,
          extractedRef: analysis.reference || null,
          rawAiResponse: analysis.rawText || null,
          status: 'pending',
        },
      });

      // Notify finance/admin
      const admins = await db.user.findMany({
        where: {
          tenantId,
          isActive: true,
          role: { in: ['super_admin', 'admin', 'finance'] },
        },
        select: { id: true },
      });

      for (const admin of admins) {
        await db.notification.create({
          data: {
            tenantId,
            userId: admin.id,
            title: '💳 New Payment Verification',
            message: `Payment screenshot received from ${session.phoneNumber}. Amount: ${analysis.amount || 'Unknown'}. Bank: ${analysis.bank || 'Unknown'}. Please verify.`,
            type: 'payment',
            category: 'finance',
          },
        });
      }
    } catch (err) {
      console.error('[AI Engine] Payment verification creation failed:', err);
    }

    const paymentReplies: Record<string, string> = {
      en: `📷 Thank you for sending the payment screenshot.\n\nI've detected the following:\n💰 Amount: ${analysis.amount || 'Processing...'}\n🏦 Bank: ${analysis.bank || 'Detecting...'}\n📅 Date: ${analysis.date || 'Detecting...'}\n\nYour payment is now **pending verification** by our finance team. You'll receive a confirmation once it's verified.\n\nThank you for your prompt payment! 🙏`,
      ms: `📷 Terima kasih kerana menghantar gambar pembayaran.\n\nSaya telah mengesan:\n💰 Jumlah: ${analysis.amount || 'Memproses...'}\n🏦 Bank: ${analysis.bank || 'Mengesan...'}\n\nPembayaran anda kini **menunggu pengesahan** oleh pasukan kewangan kami.\n\nTerima kasih atas pembayaran anda! 🙏`,
      bn: `📷 পেমেন্ট স্ক্রিনশট পাঠানোর জন্য ধন্যবাদ।\n\nপেমেন্ট এখন যাচাইয়ের জন্য অপেক্ষমাণে আছে।`,
      ar: `📷 شكراً على إرسال لقطة الشاشة.\n\nالدفعة الآن قيد الانتظار للتحقق.`,
    };

    return [{ content: paymentReplies[lang] || paymentReplies.en, messageType: 'text' }];
  }

  // Non-payment image - acknowledge and continue conversation
  const imageReplies: Record<string, string> = {
    en: "📷 Thank you for the image. I've noted it for our records.\n\nIs there anything specific about this you'd like to report or discuss?",
    ms: "📷 Terima kasih untuk gambar tersebut. Saya telah mencatatnya.\n\nAdakah anda ingin melaporkan sesuatu mengenai gambar ini?",
    bn: "📷 ছবির জন্য ধন্যবাদ। আমি এটি রেকর্ড করেছি।",
    ar: "📷 شكراً على الصورة. تم تسجيلها.",
  };

  return [{ content: imageReplies[lang] || imageReplies.en, messageType: 'text' }];
}

// ============ Error Reply ============

function getErrorReply(language: string): string {
  const replies: Record<string, string> = {
    en: "I apologize for the inconvenience. I'm experiencing a temporary issue.\n\nPlease try again in a moment, or contact our team directly for immediate assistance.\n\nThank you for your patience. 🙏",
    ms: "Saya memohon maaf atas kesulitan ini. Saya mengalami masalah sementara.\n\nSila cuba lagi sebentar lagi.\n\nTerima kasih atas kesabaran anda. 🙏",
    bn: "আমি অসুবিধার জন্য ক্ষমাপ্রার্থী। দয়া করে আবার চেষ্টা করুন।",
    ar: "أعتذر عن الإزعاج. يرجى المحاولة مرة أخرى.",
  };
  return replies[language] || replies.en;
}