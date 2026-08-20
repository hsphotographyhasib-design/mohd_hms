/**
 * MOHD.HMS Enterprise — Cache Middleware
 *
 * Express middleware for transparent GET-response caching.
 * Applied per-route with configurable TTL and key builder.
 *
 * Usage:
 *   router.get('/kpi', requireAuth, cacheRoute({ ttl: 30, keyBuilder: ... }), handler);
 *
 * On cache hit: returns cached JSON immediately, skips handler.
 * On cache miss: runs handler, caches response, returns it.
 * On Redis error: runs handler normally (graceful fallback).
 */

import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet } from './cache.service.js';
import { TTL } from './cache.constants.js';
import { getUserContext } from './cache.utils.js';
import { isRedisAvailable } from './redis.client.js';

export interface CacheRouteOptions {
  /** TTL in seconds (default: 60) */
  ttl?: number;
  /**
   * Custom cache key (excluding tenant prefix).
   * If a function, receives (req) and returns a string.
   * If a string, used as-is (with query params appended).
   */
  key?: string | ((req: Request) => string);
  /** Append query string hash to key (default: true for GET) */
  includeQuery?: boolean;
  /** Use stale-while-revalidate pattern */
  staleWhileRevalidate?: boolean;
  /** Stale window in seconds (default: 10) */
  staleWindow?: number;
}

/**
 * Build a cache key from the request.
 */
function buildRouteKey(req: Request, options: CacheRouteOptions): string {
  const ctx = getUserContext(req);
  const basePath = req.route?.path || req.path;

  let key: string;
  if (typeof options.key === 'function') {
    key = options.key(req);
  } else if (typeof options.key === 'string') {
    key = options.key;
  } else {
    key = `${basePath}`;
  }

  // Append query params for filterable endpoints
  const includeQ = options.includeQuery !== false;
  if (includeQ) {
    const qs = Object.entries(req.query)
      .filter(([, v]) => v !== undefined && v !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    if (qs) key += `?${qs}`;
  }

  return `${ctx.role}:${key}`;
}

/**
 * Middleware: Cache GET route responses.
 */
export function cacheRoute(options: CacheRouteOptions = {}) {
  const ttl = options.ttl ?? 60;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip if Redis not available
    if (!isRedisAvailable()) {
      return next();
    }

    const ctx = getUserContext(req);
    const cacheKey = buildRouteKey(req, options);

    try {
      // Check cache
      const cached = await cacheGet<string>(cacheKey, ctx.tenantId);
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        res.json(parsed);
        return;
      }

      // Intercept res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (data: unknown) => {
        // Cache the response
        cacheSet(cacheKey, ctx.tenantId, data, ttl).catch(() => {});
        // Restore and send
        res.json = originalJson;
        return res.json(data);
      };

      next();
    } catch {
      // Cache error — proceed without caching
      next();
    }
  };
}

/**
 * Middleware: Invalidate cache after a write operation.
 *
 * Usage:
 *   router.post('/', requireAuth, invalidateCache('complaints'), handler);
 *
 * Runs invalidation BEFORE the handler so the handler can still set new cache.
 * Actually, invalidation should run AFTER handler, so we use a post-handler approach.
 */
export function invalidateCacheAfter(
  invalidationFn: (tenantId: string, userId: string, role: string, req: Request) => Promise<void>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json
    const originalJson = res.json.bind(res);

    // Wrap res.json to invalidate cache AFTER successful response
    res.json = (data: unknown) => {
      const ctx = getUserContext(req);

      // Fire invalidation in background (don't block response)
      invalidationFn(ctx.tenantId, ctx.userId, ctx.role, req)
        .catch((err) => {
          console.error('[Cache:Invalidation] Error:', err);
        });

      // Restore and send
      res.json = originalJson;
      return res.json(data);
    };

    // Also restore on error
    const originalEnd = res.end?.bind(res);
    if (originalEnd) {
      res.end = ((...args: any[]) => {
        res.json = originalJson;
        res.end = originalEnd;
        return originalEnd(...args);
      }) as any;
    }

    next();
  };
}