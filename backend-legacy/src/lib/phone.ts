/**
 * E.164 phone number normalization and validation.
 */

export interface PhoneNormalizationResult {
  e164: string;
  dialCode: string;
  localDigits: string;
  valid: boolean;
  error?: string;
}

export function normalizePhone(
  rawPhone: string | null | undefined,
  dialCode: string | null | undefined,
): PhoneNormalizationResult {
  if (!rawPhone || !dialCode) {
    return { e164: '', dialCode: dialCode || '', localDigits: '', valid: false, error: 'Phone number and country code are required.' };
  }

  const cleanDial = normalizeDialCode(dialCode);
  if (!cleanDial) {
    return { e164: '', dialCode: '', localDigits: '', valid: false, error: 'The selected country code is invalid.' };
  }

  let digits = rawPhone.replace(/[^\d+]/g, '');

  const dialDigits = cleanDial.replace('+', '');
  if (digits.startsWith(cleanDial)) {
    digits = digits.slice(cleanDial.length);
  } else if (digits.startsWith('+' + dialDigits)) {
    digits = digits.slice(dialDigits.length + 1);
  } else if (digits.startsWith(dialDigits) && digits.length > dialDigits.length + 5) {
    digits = digits.slice(dialDigits.length);
  }

  digits = digits.replace(/^0+/, '');

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

  const e164 = `${cleanDial}${digits}`;

  return { e164, dialCode: cleanDial, localDigits: digits, valid: true };
}

export function normalizeDialCode(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;

  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^\++/, '+');

  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.replace(/\D/g, '');
  } else {
    cleaned = '+' + cleaned.slice(1).replace(/\D/g, '');
  }

  if (!/^\+\d{1,4}$/.test(cleaned)) return null;
  return cleaned;
}

export async function hashOtp(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyOtpHash(code: string, hash: string): Promise<boolean> {
  const computedHash = await hashOtp(code);
  if (computedHash.length !== hash.length) return false;
  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return result === 0;
}

export function getFriendlyPhoneError(error: string): string {
  const FRIENDLY_ERRORS: Record<string, string> = {
    'Phone number and country code are required.': 'Please enter your phone number and select a country.',
    'The selected country code is invalid.': 'The selected country code is invalid. Please choose a valid country.',
    'The phone number is too short.': 'The phone number is too short. Please enter a valid phone number.',
    'The phone number is too long.': 'The phone number is too long. Please check and try again.',
  };

  if (FRIENDLY_ERRORS[error]) return FRIENDLY_ERRORS[error];

  if (error.includes('country code')) {
    return 'The phone number format is invalid. Please check your country code and phone number.';
  }
  if (error.includes('phone number') || error.includes('phone format')) {
    return 'Please enter a valid phone number for the selected country.';
  }

  return 'Something went wrong. Please try again.';
}