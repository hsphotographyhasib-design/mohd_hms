// Category prefix map for asset numbers and QR IDs
export const CATEGORY_PREFIXES: Record<string, string> = {
  HVAC: 'HVC',
  Electrical: 'ELC',
  Plumbing: 'PLB',
  Generator: 'GEN',
  Mechanical: 'MEC',
  FireProtection: 'FIR',
};

// In-memory sequential counters per category prefix
const assetCounters: Record<string, number> = {};

/**
 * Generate unique QR ID: QR-GEN-NFYH3RZAA format
 * Uses 7-char random alphanumeric (uppercase)
 */
export function generateQrId(category: string): string {
  const prefix = CATEGORY_PREFIXES[category] || 'EQP';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  const randomValues = new Uint8Array(7);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < 7; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }
  for (let i = 0; i < 7; i++) {
    id += chars[randomValues[i] % chars.length];
  }
  return `QR-${prefix}-${id}`;
}

/**
 * Generate asset number: GEN-000001 format (sequential within category)
 * Improved version with proper sequential numbering
 */
export function generateAssetNumber(category: string): string {
  const prefix = CATEGORY_PREFIXES[category] || 'EQP';

  if (!(prefix in assetCounters)) {
    assetCounters[prefix] = 1;
  }

  const seq = assetCounters[prefix];
  assetCounters[prefix] += 1;

  return `${prefix}-${seq.toString().padStart(6, '0')}`;
}

/**
 * Set the starting counter for a category prefix (useful for DB-synced init)
 */
export function setAssetCounter(prefix: string, startFrom: number): void {
  assetCounters[prefix] = startFrom;
}

/**
 * Get the current counter value for a category prefix
 */
export function getAssetCounter(prefix: string): number {
  return assetCounters[prefix] ?? 0;
}

/**
 * Build the public QR URL
 * Returns: https://domain.com/equipment/QR-GEN-NFYH3RZAA
 */
export function buildQrUrl(domain: string, qrId: string): string {
  const cleanDomain = domain.replace(/\/+$/, '');
  return `${cleanDomain}/equipment/${qrId}`;
}

/**
 * Parse user agent to detect device type and browser
 */
export function parseDevice(userAgent: string): { device: string; browser: string } {
  if (!userAgent) {
    return { device: 'desktop', browser: 'Unknown' };
  }

  // Detect device type
  let device: string = 'desktop';

  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS/i;
  const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet|tablet/i;

  if (tabletRegex.test(userAgent)) {
    device = 'tablet';
  } else if (mobileRegex.test(userAgent)) {
    device = 'mobile';
  }

  // Detect browser
  let browser = 'Unknown';

  if (userAgent.includes('Firefox') && !userAgent.includes('Seamonkey')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Seamonkey')) {
    browser = 'SeaMonkey';
  } else if (userAgent.includes('Edg/')) {
    browser = 'Edge';
  } else if (userAgent.includes('OPR/') || userAgent.includes('Opera')) {
    browser = 'Opera';
  } else if (userAgent.includes('Chrome') && !userAgent.includes('Edg/')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome') && !userAgent.includes('CriOS')) {
    browser = 'Safari';
  } else if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
    browser = 'Internet Explorer';
  }

  return { device, browser };
}

/**
 * Validate QR ID format: must match /^QR-[A-Z]{3}-[A-Z0-9]{7}$/
 */
export function isValidQrId(qrId: string): boolean {
  const qrIdPattern = /^QR-[A-Z]{3}-[A-Z0-9]{7}$/;
  return qrIdPattern.test(qrId);
}

/**
 * Format category for display
 * HVAC -> "HVAC", FireProtection -> "Fire Protection", etc.
 */
export function formatCategory(cat: string): string {
  const displayNames: Record<string, string> = {
    HVAC: 'HVAC',
    Electrical: 'Electrical',
    Plumbing: 'Plumbing',
    Generator: 'Generator',
    Mechanical: 'Mechanical',
    FireProtection: 'Fire Protection',
  };
  return displayNames[cat] || cat;
}

/**
 * Get status color config
 */
export function getStatusConfig(status: string): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} {
  const configs: Record<
    string,
    { label: string; color: string; bgColor: string; icon: string }
  > = {
    active: {
      label: 'Active',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-100',
      icon: 'CheckCircle2',
    },
    operational: {
      label: 'Operational',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-100',
      icon: 'CheckCircle2',
    },
    running: {
      label: 'Running',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-100',
      icon: 'CheckCircle2',
    },
    under_maintenance: {
      label: 'Under Maintenance',
      color: 'text-amber-700',
      bgColor: 'bg-amber-100',
      icon: 'Wrench',
    },
    maintenance: {
      label: 'Maintenance',
      color: 'text-amber-700',
      bgColor: 'bg-amber-100',
      icon: 'Wrench',
    },
    critical: {
      label: 'Critical',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      icon: 'AlertTriangle',
    },
    faulty: {
      label: 'Faulty',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      icon: 'AlertOctagon',
    },
    out_of_service: {
      label: 'Out of Service',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      icon: 'XCircle',
    },
    offline: {
      label: 'Offline',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      icon: 'XCircle',
    },
    standby: {
      label: 'Standby',
      color: 'text-sky-700',
      bgColor: 'bg-sky-100',
      icon: 'Pause',
    },
    decommissioned: {
      label: 'Decommissioned',
      color: 'text-stone-500',
      bgColor: 'bg-stone-100',
      icon: 'Archive',
    },
    new_installation: {
      label: 'New Installation',
      color: 'text-violet-700',
      bgColor: 'bg-violet-100',
      icon: 'Package',
    },
    pending_inspection: {
      label: 'Pending Inspection',
      color: 'text-orange-700',
      bgColor: 'bg-orange-100',
      icon: 'ClipboardCheck',
    },
  };

  const normalizedKey = status.toLowerCase().replace(/\s+/g, '_');
  return (
    configs[normalizedKey] || {
      label: status,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      icon: 'HelpCircle',
    }
  );
}

/**
 * Get condition color (Tailwind text color class)
 */
export function getConditionColor(condition: string): string {
  const colors: Record<string, string> = {
    excellent: 'text-emerald-600',
    good: 'text-green-600',
    fair: 'text-amber-600',
    poor: 'text-orange-600',
    critical: 'text-red-600',
    broken: 'text-red-700',
    new: 'text-sky-600',
    worn: 'text-orange-500',
  };

  return colors[condition.toLowerCase()] || 'text-gray-500';
}

/**
 * Check warranty status
 */
export function getWarrantyStatus(
  warrantyExpiry?: string
): { status: string; color: string; isExpired: boolean } {
  if (!warrantyExpiry) {
    return {
      status: 'No Warranty',
      color: 'text-gray-500',
      isExpired: false,
    };
  }

  const now = new Date();
  const expiry = new Date(warrantyExpiry);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: `Expired (${Math.abs(diffDays)} days ago)`,
      color: 'text-red-600',
      isExpired: true,
    };
  }

  if (diffDays <= 30) {
    return {
      status: `Expiring Soon (${diffDays} days)`,
      color: 'text-amber-600',
      isExpired: false,
    };
  }

  if (diffDays <= 90) {
    return {
      status: `Under Warranty (${diffDays} days)`,
      color: 'text-orange-500',
      isExpired: false,
    };
  }

  return {
    status: `Under Warranty (${diffDays} days)`,
    color: 'text-emerald-600',
    isExpired: false,
  };
}