import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Helper: Get OpenWA service URL from DB config or default
async function getOpenWaBaseUrl(tenantId: string): Promise<string> {
  const { db } = await import('@/lib/db');
  const config = await db.whatsAppConfig.findUnique({ where: { tenantId } });
  return config?.openwaBaseUrl || 'http://localhost:3001';
}

async function getOpenWaSession(tenantId: string): Promise<string> {
  const { db } = await import('@/lib/db');
  const config = await db.whatsAppConfig.findUnique({ where: { tenantId } });
  return config?.openwaSession || 'default';
}

// POST - Connect WhatsApp (start session, get QR)
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const body = await req.json().catch(() => ({}));
    const action = body.action as string || 'connect';

    const baseUrl = await getOpenWaBaseUrl(tenantId);
    const sessionName = await getOpenWaSession(tenantId);

    const { db } = await import('@/lib/db');

    switch (action) {
      case 'connect': {
        // Update status to connecting
        await db.whatsAppConfig.update({
          where: { tenantId },
          data: { openwaStatus: 'connecting' },
        });

        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/webhook`;

        let res: Response;
        try {
          res = await fetch(`${baseUrl}/api/startSession`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session: sessionName, webhookUrl }),
            signal: AbortSignal.timeout(130000), // 130s timeout for QR wait
          });
        } catch (fetchErr) {
          const msg = fetchErr instanceof Error ? fetchErr.message : 'Service unreachable';
          await db.whatsAppConfig.update({
            where: { tenantId },
            data: { openwaStatus: 'disconnected' },
          });
          return NextResponse.json({
            success: false,
            state: 'ERROR',
            error: `Cannot reach WhatsApp service at ${baseUrl}. ${msg}. Ensure the OpenWA service is running.`,
            message: `Service not running at ${baseUrl}`,
          });
        }

        const data = await res.json() as Record<string, unknown>;

        // Update DB status
        const newStatus = (data.state as string) === 'CONNECTED' ? 'connected' :
                          (data.state as string) === 'QR_READY' ? 'connecting' :
                          (data.state as string) === 'ERROR' ? 'disconnected' : 'connecting';

        const updateData: Record<string, unknown> = { openwaStatus: newStatus };
        if (data.qr) updateData.openwaQrCode = data.qr as string;
        if (data.phoneInfo) {
          const pi = data.phoneInfo as Record<string, unknown>;
          updateData.phoneNumber = pi.phoneNumber as string || null;
          updateData.businessName = pi.pushName as string || null;
        }

        await db.whatsAppConfig.update({ where: { tenantId }, data: updateData });

        return NextResponse.json({
          success: (data.state as string) === 'CONNECTED',
          state: data.state,
          qr: data.qr || null,
          phoneInfo: data.phoneInfo || null,
          message: data.message || null,
        });
      }

      case 'disconnect': {
        const res = await fetch(`${baseUrl}/api/closeSession?session=${sessionName}`, {
          method: 'DELETE',
        });
        await res.json();

        await db.whatsAppConfig.update({
          where: { tenantId },
          data: { openwaStatus: 'disconnected', openwaQrCode: null },
        });

        return NextResponse.json({ success: true, state: 'DISCONNECTED', message: 'Session disconnected' });
      }

      case 'reconnect': {
        // Stop then restart
        await fetch(`${baseUrl}/api/closeSession?session=${sessionName}`, { method: 'DELETE' }).catch(() => {});

        await db.whatsAppConfig.update({
          where: { tenantId },
          data: { openwaStatus: 'connecting', openwaQrCode: null },
        });

        // Wait 2s
        await new Promise(r => setTimeout(r, 2000));

        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/webhook`;
        const res = await fetch(`${baseUrl}/api/startSession`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: sessionName, webhookUrl }),
          signal: AbortSignal.timeout(130000),
        });

        const data = await res.json() as Record<string, unknown>;
        const newStatus = (data.state as string) === 'CONNECTED' ? 'connected' :
                          (data.state as string) === 'QR_READY' ? 'connecting' :
                          (data.state as string) === 'ERROR' ? 'disconnected' : 'connecting';

        const updateData: Record<string, unknown> = { openwaStatus: newStatus };
        if (data.qr) updateData.openwaQrCode = data.qr as string;
        await db.whatsAppConfig.update({ where: { tenantId }, data: updateData });

        return NextResponse.json({
          success: (data.state as string) === 'CONNECTED',
          state: data.state,
          qr: data.qr || null,
          message: data.message || null,
        });
      }

      case 'restart': {
        const res = await fetch(`${baseUrl}/api/restartSession`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: sessionName }),
          signal: AbortSignal.timeout(130000),
        });

        const data = await res.json() as Record<string, unknown>;
        const newStatus = (data.state as string) === 'CONNECTED' ? 'connected' :
                          (data.state as string) === 'ERROR' ? 'disconnected' : 'connecting';

        await db.whatsAppConfig.update({
          where: { tenantId },
          data: { openwaStatus: newStatus, openwaQrCode: data.qr || null },
        });

        return NextResponse.json({
          success: (data.state as string) === 'CONNECTED',
          state: data.state,
          message: data.message || null,
        });
      }

      case 'test-message': {
        const { chatId } = body as { chatId?: string };
        const res = await fetch(`${baseUrl}/api/sendTestMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: sessionName, chatId }),
        });
        const data = await res.json();
        return NextResponse.json(data);
      }

      case 'sync-conversations': {
        const res = await fetch(`${baseUrl}/api/syncConversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: sessionName }),
        });
        const data = await res.json();
        return NextResponse.json(data);
      }

      case 'get-qr': {
        const res = await fetch(`${baseUrl}/api/getQrCode?key=&session=${sessionName}`);
        const data = await res.json();

        if (data.qr) {
          await db.whatsAppConfig.update({
            where: { tenantId },
            data: { openwaQrCode: data.qr, openwaStatus: 'connecting' },
          });
        }

        return NextResponse.json(data);
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
    const baseUrl = await getOpenWaBaseUrl(tenantId);
    const sessionName = await getOpenWaSession(tenantId);

    // Get session info from the WA service
    let serviceInfo: Record<string, unknown> | null = null;
    try {
      const res = await fetch(`${baseUrl}/api/sessionInfo?session=${sessionName}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) serviceInfo = await res.json() as Record<string, unknown>;
    } catch {
      // Service might be down
    }

    // Get queue status
    let queueStatus: Record<string, unknown> | null = null;
    try {
      const res = await fetch(`${baseUrl}/api/queueStatus`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) queueStatus = await res.json() as Record<string, unknown>;
    } catch {}

    // Get logs
    let logs: unknown[] = [];
    try {
      const res = await fetch(`${baseUrl}/api/logs?limit=20`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json() as { logs: unknown[] };
        logs = data.logs || [];
      }
    } catch {}

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
      // Service status
      serviceRunning: !!serviceInfo,
      serviceInfo,
      queueStatus,
      logs,

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
      stats: {
        messagesToday,
        sentToday,
        deliveredToday,
        failedToday,
      },

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