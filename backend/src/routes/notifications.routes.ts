import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import {
  sendNotification,
  sendTestNotification,
  registerDeviceToken,
  unregisterDeviceToken as unregisterToken,
  getUserDevices,
} from '../lib/notification.service.js';
import { isFirebaseConfigured } from '../lib/firebase.js';
import { cachedFetch } from '../cache/cache.service.js';
import { TTL } from '../cache/cache.constants.js';
import { notificationsKey, invalidateNotifications } from '../cache/cache.utils.js';

const router = Router();

// ─── GET / — List notifications (paginated, filterable) ────────────────
router.route('/').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId as string;
    const tenantId = req.tenantId!;
    const userRole = (req.user!.role as string).toLowerCase();
    const isAdmin = userRole === 'super_admin' || userRole === 'admin';

    // Parse query params
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const isRead = req.query.isRead;
    const type = req.query.type as string;
    const category = req.query.category as string;
    const search = req.query.search as string;

    // Build where clause
    const where: Record<string, unknown> = { tenantId };
    if (!isAdmin) {
      where.userId = userId;
    }
    if (isRead === 'true') where.isRead = true;
    else if (isRead === 'false') where.isRead = false;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { message: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const cacheKey = notificationsKey('list', tenantId, userId, `p${page}:l${limit}:read${isRead}:type${type}:q${search}`);
    const data = await cachedFetch(cacheKey, tenantId, async () => {
      const [notifications, total, unreadResult] = await Promise.all([
        db.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            userId: true,
            type: true,
            title: true,
            message: true,
            data: true,
            priority: true,
            isRead: true,
            readAt: true,
            archivedAt: true,
            relatedEntityType: true,
            relatedEntityId: true,
            actionUrl: true,
            actionLabel: true,
            createdBy: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        db.notification.count({ where }),
        // Unread count for THIS user only (even if admin viewing all)
        db.notification.count({
          where: { tenantId, userId, isRead: false },
        }),
      ]);

      return {
        notifications,
        unreadCount: unreadResult,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }, TTL.notificationList);

    res.json(data);
  } catch (error) {
    console.error('[Notifications] List error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ─── GET /unread-count ─────────────────────────────────────────────────
router.route('/unread-count').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId as string;
    const tenantId = req.tenantId!;

    const cacheKey = notificationsKey('unread', tenantId, userId);
    const data = await cachedFetch(cacheKey, tenantId, async () => {
      const count = await db.notification.count({
        where: { tenantId, userId, isRead: false },
      });
      return { count };
    }, TTL.notificationUnread);

    res.json(data);
  } catch (error) {
    console.error('[Notifications] Unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// ─── PATCH /:id/read ───────────────────────────────────────────────────
router.route('/:id/read').patch(requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId as string;
    const tenantId = req.tenantId!;
    const userRole = (req.user!.role as string).toLowerCase();
    const isAdmin = userRole === 'super_admin' || userRole === 'admin';
    const { id } = req.params;

    // Find notification
    const notification = await db.notification.findUnique({
      where: { id },
      select: { id: true, tenantId: true, userId: true, isRead: true },
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    // Non-admin can only update own notifications
    if (!isAdmin && notification.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
      select: { id: true, isRead: true, readAt: true },
    });

    invalidateNotifications(tenantId, userId).catch(() => {});

    res.json(updated);
  } catch (error) {
    console.error('[Notifications] Mark read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// ─── PATCH /read-all ───────────────────────────────────────────────────
router.route('/read-all').patch(requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId as string;
    const tenantId = req.tenantId!;

    const result = await db.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    invalidateNotifications(tenantId, userId).catch(() => {});

    res.json({ markedRead: result.count });
  } catch (error) {
    console.error('[Notifications] Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// ─── DELETE /:id ───────────────────────────────────────────────────────
router.route('/:id').delete(requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId as string;
    const tenantId = req.tenantId!;
    const userRole = (req.user!.role as string).toLowerCase();
    const isAdmin = userRole === 'super_admin' || userRole === 'admin';
    const { id } = req.params;

    const notification = await db.notification.findUnique({
      where: { id },
      select: { id: true, tenantId: true, userId: true },
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    if (!isAdmin && notification.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await db.notification.delete({ where: { id } });
    invalidateNotifications(tenantId, userId).catch(() => {});
    res.json({ deleted: true });
  } catch (error) {
    console.error('[Notifications] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// ─── POST /test — Send test FCM notification ────────────────────────────
router.route('/test').post(requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId as string;
    const tenantId = req.tenantId!;
    const userRole = (req.user!.role as string).toLowerCase();

    if (userRole !== 'super_admin' && userRole !== 'admin') {
      res.status(403).json({ error: 'Only admins can send test notifications' });
      return;
    }

    if (!isFirebaseConfigured()) {
      res.status(503).json({ error: 'Firebase is not configured on the server. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.' });
      return;
    }

    // Also create a DB notification
    await sendNotification({
      tenantId,
      userId,
      type: 'success',
      title: '🔔 Firebase Connected Successfully',
      message: 'Real-time notification is working correctly.',
      priority: 'high',
      category: 'system',
      sendPush: true,
    });

    invalidateNotifications(tenantId, userId).catch(() => {});

    res.json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    console.error('[Notifications] Test error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// ─── POST /devices/register ────────────────────────────────────────────
router.route('/devices/register').post(requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId as string;
    const tenantId = req.tenantId!;
    const { token, platform, browser, os, deviceName, userAgent } = req.body as {
      token: string;
      platform: string;
      browser?: string;
      os?: string;
      deviceName?: string;
      userAgent?: string;
    };

    if (!token || !platform) {
      res.status(400).json({ error: 'Token and platform are required' });
      return;
    }

    // Get IP from request
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || undefined;

    await registerDeviceToken({
      tenantId,
      userId,
      token,
      platform,
      browser,
      os,
      deviceName,
      userAgent,
      ipAddress,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Notifications] Device register error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// ─── POST /devices/unregister ──────────────────────────────────────────
router.route('/devices/unregister').post(requireAuth, async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token: string };

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    await unregisterToken(token);
    res.json({ success: true });
  } catch (error) {
    console.error('[Notifications] Device unregister error:', error);
    res.status(500).json({ error: 'Failed to unregister device' });
  }
});

// ─── GET /devices — List user's registered devices ─────────────────────
router.route('/devices').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId as string;
    const tenantId = req.tenantId!;

    const devices = await getUserDevices(tenantId, userId);
    res.json({ devices });
  } catch (error) {
    console.error('[Notifications] Get devices error:', error);
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

export default router;