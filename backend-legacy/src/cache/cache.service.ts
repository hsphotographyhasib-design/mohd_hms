/**
 * MOHD.HMS Enterprise — Cache Service
 *
 * High-level caching API with:
 * - get / set / delete / exists / expire / increment / decrement
 * - clearByPattern (glob-based wildcard clearing)
 * - Stale-while-revalidate support
 * - Graceful fallback when Redis is unavailable
 * - Full logging of all operations
 * - Role-based cache key isolation
 */

import { isRedisAvailable, safeRedis, buildKey, validateKey, incrementMetric } from './redis.client.js';
import { TTL, KEY_PREFIXES, LOG_CATEGORY } from './cache.constants.js';

// ─── Logging ───────────────────────────────────────────────────────────────

interface CacheLogEntry {
  timestamp: string;
  category: string;
  key: string;
  tenantId: string;
  responseTimeMs: number;
  meta?: Record<string, unknown>;
}

function log(entry: CacheLogEntry): void {
  // In production, this could be sent to a logging service
  // For now, structured console output
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `[Cache:${entry.category}] key=${entry.key} tenant=${entry.tenantId} ` +
      `time=${entry.responseTimeMs}ms${entry.meta ? ' ' + JSON.stringify(entry.meta) : ''}`
    );
  }
}

// ─── Core Cache Operations ─────────────────────────────────────────────────

/**
 * Get a value from cache.
 * Returns null on cache miss or Redis error.
 */
export async function cacheGet<T = unknown>(
  key: string,
  tenantId: string
): Promise<T | null> {
  const start = performance.now();
  const fullKey = validateKey(buildKey('', tenantId, key));

  const result = await safeRedis<T | null>(
    async (redis) => {
      const val = await redis.get<T>(fullKey);
      if (val !== null) {
        await incrementMetric('hits');
        const elapsed = Math.round(performance.now() - start);
        log({
          timestamp: new Date().toISOString(),
          category: LOG_CATEGORY.hit,
          key,
          tenantId,
          responseTimeMs: elapsed,
        });
      } else {
        await incrementMetric('misses');
        const elapsed = Math.round(performance.now() - start);
        log({
          timestamp: new Date().toISOString(),
          category: LOG_CATEGORY.miss,
          key,
          tenantId,
          responseTimeMs: elapsed,
        });
      }
      return val;
    },
    null,
    'cacheGet'
  );

  return result;
}

/**
 * Set a value in cache with optional TTL.
 * Returns true on success, false on error.
 */
export async function cacheSet(
  key: string,
  tenantId: string,
  value: unknown,
  ttlSeconds: number = 60
): Promise<boolean> {
  const start = performance.now();

  return safeRedis<boolean>(
    async (redis) => {
      const fullKey = validateKey(buildKey('', tenantId, key));
      await redis.set(fullKey, JSON.stringify(value), { ex: ttlSeconds });
      await incrementMetric('writes');
      const elapsed = Math.round(performance.now() - start);
      log({
        timestamp: new Date().toISOString(),
        category: LOG_CATEGORY.write,
        key,
        tenantId,
        responseTimeMs: elapsed,
        meta: { ttl: ttlSeconds },
      });
      return true;
    },
    false,
    'cacheSet'
  );
}

/**
 * Delete a specific cache key.
 */
export async function cacheDelete(
  key: string,
  tenantId: string
): Promise<boolean> {
  const start = performance.now();

  return safeRedis<boolean>(
    async (redis) => {
      const fullKey = validateKey(buildKey('', tenantId, key));
      await redis.del(fullKey);
      await incrementMetric('deletes');
      const elapsed = Math.round(performance.now() - start);
      log({
        timestamp: new Date().toISOString(),
        category: LOG_CATEGORY.delete,
        key,
        tenantId,
        responseTimeMs: elapsed,
      });
      return true;
    },
    false,
    'cacheDelete'
  );
}

/**
 * Check if a key exists in cache.
 */
export async function cacheExists(
  key: string,
  tenantId: string
): Promise<boolean> {
  return safeRedis<boolean>(
    async (redis) => {
      const fullKey = validateKey(buildKey('', tenantId, key));
      return (await redis.exists(fullKey)) === 1;
    },
    false,
    'cacheExists'
  );
}

/**
 * Set/extend TTL on a key.
 */
export async function cacheExpire(
  key: string,
  tenantId: string,
  ttlSeconds: number
): Promise<boolean> {
  return safeRedis<boolean>(
    async (redis) => {
      const fullKey = validateKey(buildKey('', tenantId, key));
      return (await redis.expire(fullKey, ttlSeconds)) === 1;
    },
    false,
    'cacheExpire'
  );
}

/**
 * Atomically increment a numeric cache value.
 * Creates the key if it doesn't exist.
 */
export async function cacheIncrement(
  key: string,
  tenantId: string,
  amount: number = 1,
  ttlSeconds?: number
): Promise<number> {
  return safeRedis<number>(
    async (redis) => {
      const fullKey = validateKey(buildKey('', tenantId, key));
      const result = await redis.incrby(fullKey, amount);
      if (ttlSeconds) {
        await redis.expire(fullKey, ttlSeconds);
      }
      return result;
    },
    0,
    'cacheIncrement'
  );
}

/**
 * Atomically decrement a numeric cache value.
 */
export async function cacheDecrement(
  key: string,
  tenantId: string,
  amount: number = 1,
  ttlSeconds?: number
): Promise<number> {
  return cacheIncrement(key, tenantId, -amount, ttlSeconds);
}

/**
 * Delete all cache keys matching a pattern.
 * Uses SCAN for safety (no KEYS in production).
 *
 * @param pattern - Redis glob pattern (e.g., "complaints:*")
 * @param tenantId - If provided, scopes to tenant
 */
export async function clearByPattern(
  pattern: string,
  tenantId?: string
): Promise<number> {
  const fullPattern = tenantId
    ? validateKey(buildKey('', tenantId, pattern))
    : validateKey(`${KEY_PREFIXES.dashboard.split(':')[0]}:${pattern}`);

  return safeRedis<number>(
    async (redis) => {
      let cursor = '0';
      let totalDeleted = 0;

      do {
        const [nextCursor, keys] = await redis.scan(cursor, {
          match: fullPattern,
          count: 100,
        });
        cursor = nextCursor;

        if (keys.length > 0) {
          await redis.del(...keys);
          totalDeleted += keys.length;
        }
      } while (cursor !== '0');

      if (totalDeleted > 0) {
        await incrementMetric('deletes', totalDeleted);
        log({
          timestamp: new Date().toISOString(),
          category: LOG_CATEGORY.invalid,
          key: pattern,
          tenantId: tenantId || 'all',
          responseTimeMs: 0,
          meta: { keysDeleted: totalDeleted },
        });
      }

      return totalDeleted;
    },
    0,
    'clearByPattern'
  );
}

// ─── Stale-While-Revalidate ────────────────────────────────────────────────

interface StaleResult<T> {
  data: T;
  stale: boolean;
  revalidated: Promise<void>;
}

/**
 * Stale-while-revalidate cache pattern.
 *
 * 1. Return cached data immediately (even if stale within staleWindow).
 * 2. If stale, trigger background refresh.
 * 3. Caller gets fresh data on next request.
 *
 * @param key      - Cache key (without tenant prefix)
 * @param tenantId - Tenant ID for isolation
 * @param fetcher  - Async function to fetch fresh data from DB
 * @param ttl      - Full TTL in seconds
 * @param staleWindow - Seconds before TTL where data is considered stale
 */
export async function staleWhileRevalidate<T>(
  key: string,
  tenantId: string,
  fetcher: () => Promise<T>,
  ttl: number = 60,
  staleWindow: number = 10
): Promise<StaleResult<T>> {
  // Try cache first
  const cached = await cacheGet<T>(key, tenantId);

  if (cached !== null) {
    // Check if we need background revalidation
    const exists = await cacheExists(`${key}:_setAt`, tenantId);
    let stale = false;

    if (exists) {
      const setAt = await cacheGet<number>(`${key}:_setAt`, tenantId);
      if (setAt && (Date.now() - setAt) / 1000 > (ttl - staleWindow)) {
        stale = true;
      }
    }

    // Background revalidation (fire and forget)
    const revalidated = stale
      ? (async () => {
          try {
            const fresh = await fetcher();
            await cacheSet(key, tenantId, fresh, ttl);
            await cacheSet(`${key}:_setAt`, tenantId, Date.now(), ttl);
          } catch {
            // Silently fail — stale data is still valid
          }
        })()
      : Promise.resolve();

    return { data: cached, stale, revalidated };
  }

  // Cache miss — fetch from DB, store in cache
  const fresh = await fetcher();
  await cacheSet(key, tenantId, fresh, ttl);
  await cacheSet(`${key}:_setAt`, tenantId, Date.now(), ttl);

  return { data: fresh, stale: false, revalidated: Promise.resolve() };
}

// ─── Convenience: Cached Fetch Wrapper ─────────────────────────────────────

/**
 * Simple cache-through pattern:
 * 1. Check cache
 * 2. On miss, call fetcher, cache result, return
 */
export async function cachedFetch<T>(
  key: string,
  tenantId: string,
  fetcher: () => Promise<T>,
  ttl: number = 60
): Promise<T> {
  const cached = await cacheGet<T>(key, tenantId);
  if (cached !== null) return cached;

  const data = await fetcher();
  await cacheSet(key, tenantId, data, ttl);
  return data;
}