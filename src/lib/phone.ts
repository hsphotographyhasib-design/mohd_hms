/**
 * E.164 phone number normalization and validation.
 *
 * Centralized utility used by both frontend (client-safe) and backend.
 * All WhatsApp OTP flows MUST go through these functions.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PhoneNormalizationResult {
  /** E.164 formatted phone, e.g. "+6737137462" */
  e164: string;
  /** Country dial code used, e.g. "+673" */
  dialCode: string;
  /** Local digits only (stripped of country code & leading zeros), e.g. "7137462" */
  localDigits: string;
  /** Whether normalization succeeded */
  valid: boolean;
  /** Human-readable error if invalid */
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Core: Normalize to E.164                                           */
/* ------------------------------------------------------------------ */

/**
 * Normalize a phone number to E.164 format.
 *
 * Handles every input variation the user might provide:
 *   "7137462"           → +6737137462  (with dialCode "+673")
 *   "07137462"          → +6737137462  (leading 0 stripped)
 *   "+6737137462"       → +6737137462  (already has code, no duplication)
 *   "  713-7462  "      → +6737137462  (spaces/dashes stripped)
 *
 * @param rawPhone  - Raw user input
 * @param dialCode  - Country dial code, e.g. "+673"
 */
export function normalizePhone(
  rawPhone: string | null | undefined,
  dialCode: string | null | undefined,
): PhoneNormalizationResult {
  // --- Guard: missing inputs ---
  if (!rawPhone || !dialCode) {
    return { e164: '', dialCode: dialCode || '', localDigits: '', valid: false, error: 'Phone number and country code are required.' };
  }

  // --- Normalize dial code ---
  const cleanDial = normalizeDialCode(dialCode);
  if (!cleanDial) {
    return { e164: '', dialCode: '', localDigits: '', valid: false, error: 'The selected country code is invalid.' };
  }

  // --- Strip non-digit characters from phone ---
  let digits = rawPhone.replace(/[^\d+]/g, '');

  // --- If user already typed the country code, remove it to avoid duplication ---
  const dialDigits = cleanDial.replace('+', '');
  if (digits.startsWith(cleanDial)) {
    // Exact match: "+6737137462" with dialCode "+673"
    digits = digits.slice(cleanDial.length);
  } else if (digits.startsWith('+' + dialDigits)) {
    // Same thing, different order check
    digits = digits.slice(dialDigits.length + 1);
  } else if (digits.startsWith(dialDigits) && digits.length > dialDigits.length + 5) {
    // User typed "6737137462" (without +) — looks like they included country code
    digits = digits.slice(dialDigits.length);
  }

  // --- Strip leading zeros (common in many countries) ---
  digits = digits.replace(/^0+/, '');

  // --- Validate remaining digits ---
  if (digits.length < 6) {
    return {
      e164: '',
      dialCode: cleanDial,
      localDigits: digits,
      valid: false,
      error: 'The phone number is too short. Please enter a valid phone number.',
    };
  }
  if (digits.length > 15) {
    return {
      e164: '',
      dialCode: cleanDial,
      localDigits: digits,
      valid: false,
      error: 'The phone number is too long. Please enter a valid phone number.',
    };
  }

  // --- Build E.164 ---
  const e164 = `${cleanDial}${digits}`;

  return {
    e164,
    dialCode: cleanDial,
    localDigits: digits,
    valid: true,
  };
}

/* ------------------------------------------------------------------ */
/*  Dial code normalization                                            */
/* ------------------------------------------------------------------ */

/**
 * Normalize a dial code to canonical "+XXX" format.
 * Accepts: "+673", "673", "  +673  ", "++673"
 * Returns: "+673" or null if invalid
 */
export function normalizeDialCode(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;

  // Strip everything except digits and leading +
  let cleaned = raw.trim();

  // Remove duplicate + signs
  cleaned = cleaned.replace(/^\++/, '+');

  // If no +, add one (accepts "673" → "+673")
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.replace(/\D/g, '');
  } else {
    // Has +, keep only + and digits after it
    cleaned = '+' + cleaned.slice(1).replace(/\D/g, '');
  }

  // Validate: + followed by 1-4 digits
  if (!/^\+\d{1,4}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/* ------------------------------------------------------------------ */
/*  OTP Hashing (server-side only)                                     */
/* ------------------------------------------------------------------ */

/**
 * Hash an OTP code for secure storage.
 * Uses a simple but effective approach: SHA-256 of the code.
 * In production, consider using bcrypt with a high cost factor.
 */
export async function hashOtp(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify an OTP code against its stored hash.
 */
export async function verifyOtpHash(code: string, hash: string): Promise<boolean> {
  const computedHash = await hashOtp(code);
  // Constant-time comparison to prevent timing attacks
  if (computedHash.length !== hash.length) return false;
  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return result === 0;
}

/* ------------------------------------------------------------------ */
/*  User-facing error message mapping                                  */
/* ------------------------------------------------------------------ */

const FRIENDLY_ERRORS: Record<string, string> = {
  'Phone number and country code are required.': 'Please enter your phone number and select a country.',
  'The selected country code is invalid.': 'The selected country code is invalid. Please choose a valid country.',
  'The phone number is too short.': 'The phone number is too short. Please enter a valid phone number.',
  'The phone number is too long.': 'The phone number is too long. Please check and try again.',
};

/**
 * Get a user-friendly error message.
 * Internal/technical errors are replaced with generic messages.
 * Known validation errors are mapped to friendly versions.
 */
export function getFriendlyPhoneError(error: string): string {
  // Check for known patterns
  if (FRIENDLY_ERRORS[error]) return FRIENDLY_ERRORS[error];

  // Map technical patterns
  if (error.includes('country code')) {
    return 'The phone number format is invalid. Please check your country code and phone number.';
  }
  if (error.includes('phone number') || error.includes('phone format')) {
    return 'Please enter a valid phone number for the selected country.';
  }

  // Generic fallback
  return 'Something went wrong. Please try again.';
}