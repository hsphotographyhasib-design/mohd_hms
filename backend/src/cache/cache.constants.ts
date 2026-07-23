/**
 * MOHD.HMS Enterprise — Cache Constants
 *
 * Central TTL and key-prefix definitions for all cached data.
 */

// ─── Key Prefixes ──────────────────────────────────────────────────────────
export const CACHE_PREFIX = 'hms';

export const KEY_PREFIXES = {
  dashboard:     `${CACHE_PREFIX}:dashboard`,
  complaints:    `${CACHE_PREFIX}:complaints`,
  workOrders:    `${CACHE_PREFIX}:work-orders`,
  equipment:     `${CACHE_PREFIX}:equipment`,
  inventory:     `${CACHE_PREFIX}:inventory`,
  customers:     `${CACHE_PREFIX}:customers`,
  employees:     `${CACHE_PREFIX}:employees`,
  departments:   `${CACHE_PREFIX}:departments`,
  notifications: `${CACHE_PREFIX}:notifications`,
  settings:      `${CACHE_PREFIX}:settings`,
  roles:         `${CACHE_PREFIX}:roles`,
  queue:         `${CACHE_PREFIX}:queue`,
  rateLimit:     `${CACHE_PREFIX}:ratelimit`,
  search:        `${CACHE_PREFIX}:search`,
  health:        `${CACHE_PREFIX}:health`,
} as const;

// ─── TTL Values (seconds) ─────────────────────────────────────────────────
export const TTL = {
  // Dashboard — high-frequency reads, tolerates 30-60s staleness
  dashboardKpi:          30,
  dashboardSummary:      30,
  dashboardCharts:       60,
  dashboardRecent:       30,

  // Notifications — near-real-time badge count
  notificationUnread:    15,
  notificationList:      30,
  notificationBadge:     15,

  // Complaints — role-scoped lists
  complaintList:         45,
  complaintDetail:       60,
  complaintStats:        60,

  // Work Orders
  workOrderList:         45,
  workOrderDetail:       60,
  workOrderNextNumber:   120,

  // Equipment & Inventory
  equipmentList:         300,  // 5 min
  equipmentDetail:       300,
  equipmentSearch:       600,  // 10 min
  inventoryList:         300,
  inventoryCategories:   600,  // 10 min
  inventorySuppliers:    600,
  inventoryBrands:       600,
  inventoryUnits:        600,
  inventoryEquipmentTypes: 600,

  // Customers & Employees
  customerList:          120,
  customerSearch:        200,  // ~200ms target
  employeeList:          120,
  departmentList:        600,

  // Settings — rarely change
  companyProfile:        1800, // 30 min
  smtpSettings:          1800,
  firebaseConfig:        1800,
  googleMapsSettings:    1800,
  themeSettings:         1800,
  systemSettings:        1800,

  // Roles & Permissions
  userRole:              900,  // 15 min
  permissions:           900,

  // Queue
  queueJob:              86400, // 24h — jobs persist until processed
  queueProcessing:       300,   // 5 min — processing lock
  queueIdleBackoffMax:   60000, // 60s — max poll interval when queue is idle (adaptive backoff)

  // Rate limiting
  rateLimitWindow:       60,

  // Search cache
  searchResult:          300,

  // Stale-while-revalidate window
  staleWindow:           10,    // seconds before data considered stale
} as const;

// ─── Cache Logging Categories ──────────────────────────────────────────────
export const LOG_CATEGORY = {
  hit:     'CACHE_HIT',
  miss:    'CACHE_MISS',
  write:   'CACHE_WRITE',
  delete:  'CACHE_DELETE',
  error:   'CACHE_ERROR',
  invalid: 'CACHE_INVALIDATION',
  queue:   'QUEUE',
  reconnect: 'REDIS_RECONNECT',
} as const;

// ─── Queue Job Types ───────────────────────────────────────────────────────
export const QUEUE_JOB_TYPES = {
  EMAIL_SEND:            'email:send',
  FIREBASE_NOTIFY:       'firebase:notify',
  WHATSAPP_NOTIFY:       'whatsapp:notify',
  PDF_GENERATE:          'pdf:generate',
  SCHEDULED_REPORT:      'report:scheduled',
  SCHEDULED_MAINTENANCE: 'maintenance:scheduled',
  REMINDER_EMAIL:        'reminder:email',
  REMINDER_NOTIFY:       'reminder:notify',
} as const;

// ─── Queue Configuration ───────────────────────────────────────────────────
export const QUEUE_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 5000,        // 5 seconds between retries
  deadLetterTTL: 604800,     // 7 days for dead-letter jobs
  maxQueueSize: 10000,       // Safety limit
  pollIntervalMs: 10000,     // Worker poll interval (10s — was 2s, reduced to stay under Redis 500k/mo limit)
} as const;

// ─── Monitoring ────────────────────────────────────────────────────────────
export const MONITOR_KEY = `${CACHE_PREFIX}:monitor`;