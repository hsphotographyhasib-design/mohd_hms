import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { waManager } from '@/lib/whatsapp-service/manager';
export const dynamic = 'force-dynamic';

// POST - Connect/Disconnect/Reconnect/GetQR/SendTest
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const body = await req.json().catch(() => ({}));
    const action = body.action as string || 'connect';

    const { db } = await import('@/lib/db');

    switch (action) {
      case 'connect': {
        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/webhook`;
        const result = await waManager.connect(webhookUrl);

        // Update DB status
        const newStatus = result.status === 'connected' ? 'connected' :
                          result.status === 'generating_qr' ? 'connecting' :
                          result.status === 'connecting' ? 'connecting' : 'disconnected';

        await db.whatsAppConfig.update({
          where: { tenantId },
          data: { openwaStatus: newStatus },
        }).catch(() => {});

        // If we already have QR from a previous connection attempt, include it
        const qrData = waManager.getQr();
        if (qrData.qr) {
          await db.whatsAppConfig.update({
            where: { tenantId },
            data: { openwaQrCode: qrData.qr },
          }).catch(() => {});
        }

        return NextResponse.json({
          success: result.success,
          state: result.status === 'connected' ? 'CONNECTED' :
                 result.status === 'generating_qr' ? 'QR_READY' :
                 result.status === 'connecting' ? 'CONNECTING' : 'DISCONNECTED',
          qr: qrData.qr,
          message: result.message,
        });
      }

      case 'disconnect': {
        const result = await waManager.disconnect();
        await db.whatsAppConfig.update({
          where: { tenantId },
          data: { openwaStatus: 'disconnected', openwaQrCode: null },
        }).catch(() => {});

        return NextResponse.json({ success: result.success, state: 'DISCONNECTED', message: result.message });
      }

      case 'reconnect': {
        await waManager.disconnect();
        await new Promise(r => setTimeout(r, 2000));

        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/webhook`;
        const result = await waManager.connect(webhookUrl);

        const newStatus = result.status === 'connected' ? 'connected' :
                          result.status === 'generating_qr' ? 'connecting' : 'disconnected';

        await db.whatsAppConfig.update({
          where: { tenantId },
          data: { openwaStatus: newStatus, openwaQrCode: null },
        }).catch(() => {});

        return NextResponse.json({
          success: result.success,
          state: result.status === 'connected' ? 'CONNECTED' : 'CONNECTING',
          message: result.message,
        });
      }

      case 'get-qr': {
        const qrData = waManager.getQr();
        if (qrData.qr) {
          await db.whatsAppConfig.update({
            where: { tenantId },
            data: { openwaQrCode: qrData.qr, openwaStatus: 'connecting' },
          }).catch(() => {});
        }
        return NextResponse.json(qrData);
      }

      case 'test-message': {
        const { chatId } = body as { chatId?: string };
        const result = await waManager.sendTestMessage(chatId);
        return NextResponse.json(result);
      }

      case 'sync-conversations': {
        return NextResponse.json({ success: false, count: 0, message: 'Sync not available in embedded mode' });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('WhatsApp connection API error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

// GET - Get connection status
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;

    // Get manager status (always available since it's in-process)
    const managerStatus = waManager.getStatus();
    const sessionInfo = waManager.getSessionInfo();
    const qrData = waManager.getQr();
    const managerLogs = waManager.getLogs(20);

    // Map status for frontend
    const connectionState = managerStatus.status === 'connected' ? 'CONNECTED' :
                            managerStatus.status === 'generating_qr' ? 'QR_READY' :
                            managerStatus.status === 'connecting' ? 'CONNECTING' :
                            managerStatus.status === 'reconnecting' ? 'RECONNECTING' :
                            'DISCONNECTED';

    // Get DB config
    const { db } = await import('@/lib/db');
    const config = await db.whatsAppConfig.findUnique({ where: { tenantId } });

    // Get today's message stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [messagesToday, sentToday, deliveredToday, failedToday] = await Promise.all([
      db.whatsAppMessage.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      db.whatsAppMessage.count({ where: { tenantId, createdAt: { gte: todayStart }, status: 'sent' } }),
      db.whatsAppMessage.count({ where: { tenantId, createdAt: { gte: todayStart }, status: 'delivered' } }),
      db.whatsAppMessage.count({ where: { tenantId, createdAt: { gte: todayStart }, status: 'failed' } }),
    ]);

    const recentMessages = await db.whatsAppMessage.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        session: { select: { phoneNumber: true, customer: { select: { name: true } } } },
      },
    });

    return NextResponse.json({
      // Service status (always true since in-process)
      serviceRunning: true,
      serviceInfo: sessionInfo,
      queueStatus: { total: 0, pending: 0, processing: 0, failed: 0, items: [] },
      logs: managerLogs,

      // Connection state
      connectionState,
      qr: qrData.qr,
      qrAvailable: qrData.qr ? true : false,

      // DB config
      config: config ? {
        id: config.id,
        provider: config.provider,
        isEnabled: config.isEnabled,
        phoneNumber: config.phoneNumber,
        businessName: config.businessName,
        openwaBaseUrl: config.openwaBaseUrl,
        openwaSession: config.openwaSession,
        openwaStatus: config.openwaStatus,
        autoReplyEnabled: config.autoReplyEnabled,
        welcomeMessage: config.welcomeMessage,
      } : null,

      // Stats
      stats: { messagesToday, sentToday, deliveredToday, failedToday },

      // Recent messages
      recentMessages: recentMessages.map(m => ({
        id: m.id,
        direction: m.direction,
        messageType: m.messageType,
        content: m.content,
        status: m.status,
        isFromBot: m.isFromBot,
        fromNumber: m.fromNumber,
        toNumber: m.toNumber,
        customerName: m.session?.customer?.name,
        customerPhone: m.session?.phoneNumber,
        createdAt: m.createdAt.toISOString(),
        errorMessage: m.errorMessage,
      })),
    });
  } catch (error) {
    console.error('WhatsApp connection status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}