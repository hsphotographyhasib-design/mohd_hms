// In-memory rate limiter for login security
// Tracks failed attempts per IP and per email with progressive delays and account lockout

interface EmailAttempt {
  attempts: number;
  lockedUntil: Date | null;
  lastAttempt: Date;
}

interface IpWindow {
  count: number;
  resetAt: Date;
}

interface RegistrationIpWindow {
  count: number;
  resetAt: Date;
}

// Progressive delay in ms per consecutive failed attempt (1-indexed: 1st fail = index 0)
const PROGRESSIVE_DELAYS = [1000, 2000, 5000, 30000]; // 1s, 2s, 5s, 30s

const MAX_IP_REQUESTS_PER_MINUTE = 10;
const MAX_FAILED_ATTEMPTS_FOR_LOCKOUT = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REGISTRATIONS_PER_IP_PER_HOUR = 3;

const emailAttempts = new Map<string, EmailAttempt>();
const ipLoginWindows = new Map<string, IpWindow>();
const ipRegistrationWindows = new Map<string, RegistrationIpWindow>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

// Auto-cleanup old entries every 5 minutes
function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = new Date();

    // Clean email attempts where lockout has expired and no recent activity
    for (const [key, entry] of emailAttempts) {
      const lockExpired = entry.lockedUntil && now > entry.lockedUntil;
      const staleMs = now.getTime() - entry.lastAttempt.getTime();
      if ((lockExpired || !entry.lockedUntil) && staleMs > CLEANUP_INTERVAL_MS) {
        emailAttempts.delete(key);
      }
    }

    // Clean expired IP windows
    for (const [key, entry] of ipLoginWindows) {
      if (now > entry.resetAt) {
        ipLoginWindows.delete(key);
      }
    }

    // Clean expired registration IP windows
    for (const [key, entry] of ipRegistrationWindows) {
      if (now > entry.resetAt) {
        ipRegistrationWindows.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Allow Node.js to exit even if timer is active
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

// Ensure cleanup starts on first import
startCleanup();

/**
 * Check if an IP is rate-limited for login attempts.
 * Returns { allowed: boolean, retryAfter?: number } where retryAfter is seconds until reset.
 */
export function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = new Date();
  let window = ipLoginWindows.get(ip);

  if (!window || now > window.resetAt) {
    // Reset window
    window = { count: 0, resetAt: new Date(now.getTime() + 60_000) };
    ipLoginWindows.set(ip, window);
  }

  if (window.count >= MAX_IP_REQUESTS_PER_MINUTE) {
    const retryAfter = Math.ceil((window.resetAt.getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  // Increment the request count
  window.count++;
  return { allowed: true, retryAfter: 0 };
}

/**
 * Record a failed login attempt for both IP and email.
 * Returns { allowed: boolean, waitMs: number }.
 * - If the email is locked, allowed=false and waitMs is the remaining lockout time.
 * - If not locked, allowed=true and waitMs is the progressive delay to apply.
 */
export function recordFailedAttempt(ip: string, email: string): { allowed: boolean; waitMs: number } {
  const now = new Date();
  const normalisedEmail = email.toLowerCase().trim();

  // Get or create email entry
  let entry = emailAttempts.get(normalisedEmail);
  if (!entry) {
    entry = { attempts: 0, lockedUntil: null, lastAttempt: now };
    emailAttempts.set(normalisedEmail, entry);
  }

  // If already locked, return lockout info
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const remaining = entry.lockedUntil.getTime() - now.getTime();
    return { allowed: false, waitMs: remaining };
  }

  // Increment attempts
  entry.attempts++;
  entry.lastAttempt = now;

  // Check if this triggers a lockout
  if (entry.attempts >= MAX_FAILED_ATTEMPTS_FOR_LOCKOUT) {
    entry.lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
    return { allowed: false, waitMs: LOCKOUT_DURATION_MS };
  }

  // Calculate progressive delay based on attempt count (1-indexed)
  const delayIndex = Math.min(entry.attempts - 1, PROGRESSIVE_DELAYS.length - 1);
  const waitMs = PROGRESSIVE_DELAYS[delayIndex];

  return { allowed: true, waitMs };
}

/**
 * Clear failed attempts for an email (called on successful login).
 */
export function clearFailedAttempts(email: string): void {
  const normalisedEmail = email.toLowerCase().trim();
  emailAttempts.delete(normalisedEmail);
}

/**
 * Check if an email is currently locked out.
 */
export function isEmailLocked(email: string): { locked: boolean; waitMs: number } {
  const normalisedEmail = email.toLowerCase().trim();
  const entry = emailAttempts.get(normalisedEmail);

  if (!entry || !entry.lockedUntil) {
    return { locked: false, waitMs: 0 };
  }

  const now = new Date();
  if (now >= entry.lockedUntil) {
    // Lockout expired, clean up
    emailAttempts.delete(normalisedEmail);
    return { locked: false, waitMs: 0 };
  }

  return { locked: true, waitMs: entry.lockedUntil.getTime() - now.getTime() };
}

/**
 * Check registration rate limit for an IP.
 * Max 3 registrations per IP per hour.
 * Returns { allowed: boolean, retryAfter: number }.
 */
export function checkRegistrationRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = new Date();
  let window = ipRegistrationWindows.get(ip);

  if (!window || now > window.resetAt) {
    window = { count: 0, resetAt: new Date(now.getTime() + 60 * 60 * 1000) };
    ipRegistrationWindows.set(ip, window);
  }

  if (window.count >= MAX_REGISTRATIONS_PER_IP_PER_HOUR) {
    const retryAfter = Math.ceil((window.resetAt.getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  window.count++;
  return { allowed: true, retryAfter: 0 };
}