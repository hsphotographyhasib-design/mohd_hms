/**
 * MOHD.HMS Enterprise — Redis Client
 *
 * Single Upstash Redis connection with:
 * - Automatic reconnection
 * - Graceful degradation (isAvailable flag)
 * - Connection health monitoring
 */

import { Redis } from '@upstash/redis';
import { KEY_PREFIXES, MONITOR_KEY, LOG_CATEGORY } from './cache.constants.js';

let _redis: Redis | null = null;
let _available = false;
let _connectTime: number | null = null;
let _lastError: string | null = null;
let _totalErrors = 0;
let _totalReconnects = 0;

/**
 * Initialize the Upstash Redis client.
 * Call once at application startup.
 */
export function initRedis(): void {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      '[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. ' +
      'Caching is disabled — all requests will hit the database directly.'
    );
    _available = false;
    return;
  }

  try {
    _redis = new Redis({
      url,
      token,
      automaticDeserialization: true,
    });
    _available = true;
    _connectTime = Date.now();
    console.log('[Redis] Connected successfully');
  } catch (err) {
    _available = false;
    _lastError = err instanceof Error ? err.message : String(err);
    _totalErrors++;
    console.error('[Redis] Failed to initialize:', _lastError);
  }
}

/** Get the Redis client instance. Returns null if not available. */
export function getRedis(): Redis | null {
  return _redis;
}

/** Check if Redis is available for use. */
export function isRedisAvailable(): boolean {
  return _available && _redis !== null;
}

/**
 * Execute a Redis command with automatic error handling.
 * Returns `fallback` on any Redis error.
 */
export async function safeRedis<T>(
  fn: (redis: Redis) => Promise<T>,
  fallback: T,
  context = 'unknown'
): Promise<T> {
  if (!isRedisAvailable() || !_redis) {
    return fallback;
  }

  try {
    const result = await fn(_redis);
    if (_lastError) {
      // Redis recovered from a previous error
      console.log(`[Redis] Reconnected after previous error`);
      _lastError = null;
      _totalReconnects++;
      _connectTime = Date.now();
    }
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    _lastError = msg;
    _totalErrors++;
    console.error(`[Redis] Error in ${context}:`, msg);

    // Try a health check to see if Redis is still reachable
    try {
      await _redis.ping();
      // Redis responded to ping — this was a transient error
    } catch {
      _available = false;
      console.error('[Redis] Connection lost — disabling cache');
      // Schedule reconnection check
      setTimeout(() => {
        console.log('[Redis] Attempting reconnection check...');
        try {
          _redis!.ping().then(() => {
            _available = true;
            _connectTime = Date.now();
            _lastError = null;
            _totalReconnects++;
            console.log('[Redis] Reconnected successfully');
          }).catch(() => {});
        } catch {}
      }, 5000);
    }

    return fallback;
  }
}

/**
 * Build a namespaced cache key.
 * Format: hms:{prefix}:{tenantId}:{...segments}
 */
export function buildKey(
  prefix: string,
  tenantId: string,
  ...segments: (string | number | undefined)[]
): string {
  const parts = [prefix, tenantId, ...segments].filter(Boolean);
  return parts.join(':');
}

/**
 * Validate a cache key — only allow alphanumeric, colons, hyphens, underscores.
 */
export function validateKey(key: string): string {
  if (/[^a-zA-Z0-9:_\-.]/.test(key)) {
    throw new Error(`Invalid cache key: ${key}`);
  }
  return key;
}

// ─── Monitoring Metrics ────────────────────────────────────────────────────

export interface CacheMetrics {
  hits: number;
  misses: number;
  writes: number;
  deletes: number;
  errors: number;
}

/** Increment a monitoring counter atomically. */
export async function incrementMetric(
  counter: keyof CacheMetrics,
  amount = 1
): Promise<void> {
  await safeRedis(
    async (r) => {
      await r.hincrby(`${MONITOR_KEY}:counters`, counter, amount);
    },
    undefined,
    'incrementMetric'
  );
}

/** Get all monitoring counters. */
export async function getMetrics(): Promise<CacheMetrics> {
  return safeRedis(
    async (r) => {
      const data = await r.hgetall(`${MONITOR_KEY}:counters`);
      return {
        hits:     Number(data?.hits     ?? 0),
        misses:   Number(data?.misses   ?? 0),
        writes:   Number(data?.writes   ?? 0),
        deletes:  Number(data?.deletes  ?? 0),
        errors:   Number(data?.errors   ?? 0),
      };
    },
    { hits: 0, misses: 0, writes: 0, deletes: 0, errors: 0 }
  );
}

/** Get Redis connection health info. */
export function getConnectionInfo() {
  return {
    available: _available,
    connected: _connectTime !== null,
    connectTime: _connectTime,
    lastError: _lastError,
    totalErrors: _totalErrors,
    totalReconnects: _totalReconnects,
    uptimeMs: _connectTime ? Date.now() - _connectTime : 0,
    configPresent: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  };
}