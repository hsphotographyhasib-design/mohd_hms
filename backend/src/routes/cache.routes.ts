/**
 * MOHD.HMS Enterprise — Cache Monitoring Route
 *
 * Admin-only endpoint for Redis health, cache metrics, and queue status.
 * Mounted at: GET /api/cache/monitor
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { isRedisAvailable, getMetrics, getConnectionInfo } from '../cache/redis.client.js';
import { getQueueStats, isWorkersRunning } from '../queue/queue.service.js';
import { KEY_PREFIXES, TTL } from '../cache/cache.constants.js';

const router = Router();

// ─── GET /monitor — Full cache & queue monitoring ────────────────────────
router.route('/monitor').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const userRole = (req.user!.role as string).toLowerCase();
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const connectionInfo = getConnectionInfo();
    const metrics = await getMetrics();

    // Calculate hit rate
    const totalRequests = metrics.hits + metrics.misses;
    const hitRate = totalRequests > 0
      ? Math.round((metrics.hits / totalRequests) * 10000) / 100
      : 0;
    const missRate = totalRequests > 0
      ? Math.round((metrics.misses / totalRequests) * 10000) / 100
      : 0;

    // Get queue stats
    const queueNames = ['emails', 'notifications', 'whatsapp', 'reminders'];
    const queueStats = {} as Record<string, unknown>;
    for (const name of queueNames) {
      queueStats[name] = await getQueueStats(name);
    }

    // Get Redis info if available
    let redisInfo: Record<string, unknown> = {};
    if (isRedisAvailable()) {
      redisInfo = {
        connected: true,
        configPresent: connectionInfo.configPresent,
        uptimeMs: connectionInfo.uptimeMs,
        totalErrors: connectionInfo.totalErrors,
        totalReconnects: connectionInfo.totalReconnects,
        lastError: connectionInfo.lastError,
      };
    }

    res.json({
      // Redis connection
      redis: {
        available: isRedisAvailable(),
        ...redisInfo,
      },

      // Cache metrics
      cache: {
        hits: metrics.hits,
        misses: metrics.misses,
        hitRate: `${hitRate}%`,
        missRate: `${missRate}%`,
        writes: metrics.writes,
        deletes: metrics.deletes,
        errors: metrics.errors,
        totalRequests,
      },

      // Queue status
      queue: {
        workersRunning: isWorkersRunning(),
        queues: queueStats,
      },

      // TTL configuration
      ttlConfig: TTL,

      // Key prefixes
      keyPrefixes: KEY_PREFIXES,
    });
  } catch (error) {
    console.error('[Cache:Monitor] Error:', error);
    res.status(500).json({ error: 'Failed to get cache monitoring data' });
  }
});

// ─── GET /health — Redis health check ───────────────────────────────────
router.route('/health').get(requireAuth, async (_req: Request, res: Response) => {
  try {
    const connectionInfo = getConnectionInfo();
    res.json({
      redis: {
        available: isRedisAvailable(),
        connected: connectionInfo.connected,
        uptimeMs: connectionInfo.uptimeMs,
        configPresent: connectionInfo.configPresent,
        lastError: connectionInfo.lastError,
      },
    });
  } catch (error) {
    res.status(500).json({
      redis: { available: false, error: 'Health check failed' },
    });
  }
});

// ─── POST /invalidate — Manual cache invalidation (admin) ────────────────
router.route('/invalidate').post(requireAuth, async (req: Request, res: Response) => {
  try {
    const userRole = (req.user!.role as string).toLowerCase();
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const tenantId = req.tenantId!;
    const { pattern } = req.body as { pattern: string };

    if (!pattern) {
      res.status(400).json({ error: 'Pattern is required (e.g., "dashboard:*")' });
      return;
    }

    const { clearByPattern } = await import('../cache/cache.service.js');
    const deleted = await clearByPattern(pattern, tenantId);

    res.json({ success: true, keysDeleted: deleted, pattern });
  } catch (error) {
    console.error('[Cache:Invalidate] Error:', error);
    res.status(500).json({ error: 'Failed to invalidate cache' });
  }
});

export default router;