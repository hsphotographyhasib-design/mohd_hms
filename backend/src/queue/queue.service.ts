/**
 * MOHD.HMS Enterprise — Queue Service
 *
 * Redis-backed background job queue using Lists.
 *
 * Architecture:
 * - Jobs are pushed to a queue list (LPUSH)
 * - Workers pop from the other end (BRPOP with timeout)
 * - Failed jobs go to a dead-letter queue after max retries
 * - Processing is protected by a lock key to prevent duplicate processing
 *
 * Queue layout in Redis:
 *   hms:queue:{queueName}          — pending jobs
 *   hms:queue:{queueName}:dead     — dead-letter (failed) jobs
 *   hms:queue:{queueName}:lock:{id}  — processing lock
 *   hms:queue:{queueName}:stats    — queue statistics
 */

import { safeRedis, buildKey, validateKey, isRedisAvailable, incrementMetric } from '../cache/redis.client.js';
import { KEY_PREFIXES, QUEUE_CONFIG, QUEUE_JOB_TYPES, LOG_CATEGORY } from '../cache/cache.constants.js';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface QueueJob<T = unknown> {
  id: string;
  type: string;
  payload: T;
  createdAt: number;
  attempts: number;
  maxRetries: number;
  scheduledAt?: number;  // Future execution time (epoch ms)
  priority?: number;     // Lower = higher priority (default 5)
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
}

type JobHandler<T = unknown> = (payload: T, jobId: string) => Promise<void>;

// ─── Job ID Generation ─────────────────────────────────────────────────────

let _jobCounter = 0;

function generateJobId(): string {
  _jobCounter++;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const seq = _jobCounter.toString(36).padStart(4, '0');
  return `job_${ts}_${rand}_${seq}`;
}

// ─── Core Queue Operations ─────────────────────────────────────────────────

/**
 * Enqueue a job for background processing.
 */
export async function enqueue<T = unknown>(
  queueName: string,
  type: string,
  payload: T,
  options?: {
    delayMs?: number;
    priority?: number;
    maxRetries?: number;
  }
): Promise<string | null> {
  if (!isRedisAvailable()) {
    console.warn(`[Queue] Redis unavailable — skipping job ${type}`);
    return null;
  }

  const jobId = generateJobId();
  const job: QueueJob<T> = {
    id: jobId,
    type,
    payload,
    createdAt: Date.now(),
    attempts: 0,
    maxRetries: options?.maxRetries ?? QUEUE_CONFIG.maxRetries,
    scheduledAt: options?.delayMs ? Date.now() + options.delayMs : undefined,
    priority: options?.priority ?? 5,
  };

  return safeRedis<string | null>(
    async (redis) => {
      const queueKey = validateKey(`${KEY_PREFIXES.queue}:${queueName}`);

      // Check queue size safety limit
      const size = await redis.llen(queueKey);
      if (size >= QUEUE_CONFIG.maxQueueSize) {
        console.error(`[Queue] Queue ${queueName} is full (${size} jobs). Dropping job ${jobId}.`);
        return null;
      }

      // If scheduled for later, store in a sorted set
      if (job.scheduledAt) {
        const scheduledKey = `${queueKey}:scheduled`;
        await redis.zadd(scheduledKey, {
          score: job.scheduledAt,
          member: JSON.stringify(job),
        });
      } else {
        // Insert by priority (lower priority number = higher priority)
        // Use a list — for simplicity, always push to head
        await redis.lpush(queueKey, JSON.stringify(job));
      }

      // Update stats
      await redis.hincrby(`${queueKey}:stats`, 'pending', 1);

      console.log(`[Queue:${LOG_CATEGORY.queue}] Enqueued ${type} → ${queueName} (${jobId})`);

      return jobId;
    },
    null,
    'enqueue'
  );
}

/**
 * Dequeue the next job from a queue (blocking pop with timeout).
 */
export async function dequeue(
  queueName: string,
  timeoutSeconds: number = 5
): Promise<QueueJob | null> {
  if (!isRedisAvailable()) return null;

  return safeRedis<QueueJob | null>(
    async (redis) => {
      const queueKey = validateKey(`${KEY_PREFIXES.queue}:${queueName}`);

      // Check for scheduled jobs first
      const scheduledKey = `${queueKey}:scheduled`;
      const now = Date.now();
      const readyJobs = await redis.zrange(scheduledKey, 0, now, { byScore: true });
      if (readyJobs.length > 0) {
        // Process the earliest scheduled job
        const jobJson = readyJobs[0] as string;
        await redis.zrem(scheduledKey, jobJson);
        const job = JSON.parse(jobJson) as QueueJob;
        await redis.hincrby(`${queueKey}:stats`, 'pending', -1);
        return job;
      }

      // Non-blocking pop (BRPOP equivalent via LPOP with fallback)
      const result = await redis.rpop(queueKey);
      if (!result) return null;

      const job = JSON.parse(result as string) as QueueJob;
      await redis.hincrby(`${queueKey}:stats`, 'pending', -1);
      return job;
    },
    null,
    'dequeue'
  );
}

/**
 * Mark a job as completed.
 */
async function completeJob(queueName: string, job: QueueJob): Promise<void> {
  await safeRedis(
    async (redis) => {
      const queueKey = validateKey(`${KEY_PREFIXES.queue}:${queueName}`);
      const lockKey = `${queueKey}:lock:${job.id}`;
      await redis.del(lockKey);
      await redis.hincrby(`${queueKey}:stats`, 'completed', 1);
    },
    undefined,
    'completeJob'
  );
}

/**
 * Mark a job as failed. Moves to dead-letter after max retries.
 */
async function failJob(queueName: string, job: QueueJob, error: string): Promise<void> {
  await safeRedis(
    async (redis) => {
      const queueKey = validateKey(`${KEY_PREFIXES.queue}:${queueName}`);
      const lockKey = `${queueKey}:lock:${job.id}`;
      const deadKey = `${queueKey}:dead`;

      await redis.del(lockKey);

      if (job.attempts >= job.maxRetries) {
        // Move to dead-letter queue
        await redis.lpush(deadKey, JSON.stringify({
          ...job,
          failedAt: Date.now(),
          lastError: error,
        }));
        await redis.hincrby(`${queueKey}:stats`, 'failed', 1);
        await redis.hincrby(`${queueKey}:stats`, 'deadLetter', 1);
        console.error(`[Queue] Job ${job.id} moved to dead-letter after ${job.attempts} attempts: ${error}`);
      } else {
        // Re-enqueue with incremented attempt counter
        await safeRedis(
          async (r) => {
            const requeueJob = { ...job, attempts: job.attempts + 1 };
            // Delay retry by QUEUE_CONFIG.retryDelayMs * attempts
            requeueJob.scheduledAt = Date.now() + (QUEUE_CONFIG.retryDelayMs * (job.attempts + 1));
            const scheduledKey = `${queueKey}:scheduled`;
            await r.zadd(scheduledKey, {
              score: requeueJob.scheduledAt!,
              member: JSON.stringify(requeueJob),
            });
            await r.hincrby(`${queueKey}:stats`, 'pending', 1);
          },
          undefined,
          'failJob-requeue'
        );
        console.warn(`[Queue] Job ${job.id} failed (attempt ${job.attempts + 1}/${job.maxRetries}): ${error}`);
      }
    },
    undefined,
    'failJob'
  );
}

/**
 * Get queue statistics.
 */
export async function getQueueStats(queueName: string): Promise<QueueStats> {
  return safeRedis<QueueStats>(
    async (redis) => {
      const queueKey = validateKey(`${KEY_PREFIXES.queue}:${queueName}`);
      const statsKey = `${queueKey}:stats`;
      const deadKey = `${queueKey}:dead`;

      const [stats, pending, deadCount] = await Promise.all([
        redis.hgetall(statsKey),
        redis.llen(queueKey),
        redis.llen(deadKey),
      ]);

      return {
        pending: Number(pending) + Number(stats?.pending ?? 0),
        processing: Number(stats?.processing ?? 0),
        completed: Number(stats?.completed ?? 0),
        failed: Number(stats?.failed ?? 0),
        deadLetter: Number(deadCount) + Number(stats?.deadLetter ?? 0),
      };
    },
    { pending: 0, processing: 0, completed: 0, failed: 0, deadLetter: 0 },
    'getQueueStats'
  );
}

// ─── Worker ────────────────────────────────────────────────────────────────

const handlers = new Map<string, JobHandler>();

/**
 * Register a job handler for a specific job type.
 */
export function registerHandler(type: string, handler: JobHandler): void {
  handlers.set(type, handler);
}

/**
 * Process a single job from the queue.
 */
async function processJob(queueName: string, job: QueueJob): Promise<void> {
  const handler = handlers.get(job.type);
  if (!handler) {
    console.error(`[Queue] No handler registered for job type: ${job.type}`);
    await failJob(queueName, job, `No handler for type: ${job.type}`);
    return;
  }

  const queueKey = validateKey(`${KEY_PREFIXES.queue}:${queueName}`);
  const lockKey = `${queueKey}:lock:${job.id}`;

  // Acquire lock
  const locked = await safeRedis(
    async (redis) => {
      const result = await redis.set(lockKey, '1', {
        nx: true,
        ex: 300, // 5 min processing lock
      });
      return result === 'OK';
    },
    false,
    'processJob-lock'
  );

  if (!locked) {
    console.warn(`[Queue] Job ${job.id} is already being processed`);
    return;
  }

  await safeRedis(
    async (redis) => {
      await redis.hincrby(`${queueKey}:stats`, 'processing', 1);
    },
    undefined,
    'processJob-processing'
  );

  try {
    await handler(job.payload, job.id);
    await completeJob(queueName, job);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await failJob(queueName, job, errorMsg);
  }
}

// ─── Queue Manager (starts workers) ────────────────────────────────────────

let _workersRunning = false;
let _workerIntervals: ReturnType<typeof setInterval>[] = [];

/**
 * Start background workers for all registered queues.
 */
export function startWorkers(queues: string[]): void {
  if (_workersRunning) {
    console.log('[Queue] Workers already running');
    return;
  }

  if (!isRedisAvailable()) {
    console.log('[Queue] Redis not available — workers not started');
    return;
  }

  _workersRunning = true;
  console.log(`[Queue] Starting workers for: ${queues.join(', ')}`);

  for (const queueName of queues) {
    const interval = setInterval(async () => {
      try {
        const job = await dequeue(queueName, 2);
        if (job) {
          await processJob(queueName, job);
        }
      } catch (err) {
        console.error(`[Queue] Worker error (${queueName}):`, err);
      }
    }, QUEUE_CONFIG.pollIntervalMs);

    _workerIntervals.push(interval);
  }
}

/**
 * Stop all background workers.
 */
export function stopWorkers(): void {
  for (const interval of _workerIntervals) {
    clearInterval(interval);
  }
  _workerIntervals = [];
  _workersRunning = false;
  console.log('[Queue] All workers stopped');
}

/**
 * Check if workers are running.
 */
export function isWorkersRunning(): boolean {
  return _workersRunning;
}

// ─── Convenience: Enqueue Helpers ──────────────────────────────────────────

/** Enqueue an email send job. */
export async function enqueueEmail(payload: {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  from?: string;
}): Promise<string | null> {
  return enqueue('emails', QUEUE_JOB_TYPES.EMAIL_SEND, payload);
}

/** Enqueue a Firebase push notification job. */
export async function enqueueFirebaseNotification(payload: {
  userIds?: string[];
  roles?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<string | null> {
  return enqueue('notifications', QUEUE_JOB_TYPES.FIREBASE_NOTIFY, payload);
}

/** Enqueue a WhatsApp notification job. */
export async function enqueueWhatsAppNotification(payload: {
  to: string;
  message: string;
}): Promise<string | null> {
  return enqueue('whatsapp', QUEUE_JOB_TYPES.WHATSAPP_NOTIFY, payload);
}

/** Enqueue a reminder job (email or notification). */
export async function enqueueReminder(payload: {
  type: 'email' | 'notification';
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<string | null> {
  const queue = payload.type === 'email' ? 'reminders' : 'notifications';
  const jobType = payload.type === 'email'
    ? QUEUE_JOB_TYPES.REMINDER_EMAIL
    : QUEUE_JOB_TYPES.REMINDER_NOTIFY;
  return enqueue(queue, jobType, payload);
}