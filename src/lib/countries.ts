/* ------------------------------------------------------------------ */
/*  Country data for WhatsApp OTP login                               */
/* ------------------------------------------------------------------ */

export interface Country {
  name: string;
  code: string;       // BN, MY, SG, etc.
  dialCode: string;   // +673, +60, +65, etc.
  flag: string;       // 🇧🇳, 🇲🇾, 🇸🇬, etc.
  phoneLength: number | [number, number]; // expected phone length (digits only, no spaces/dashes)
  format: string;     // e.g. 'XXX XXXX' for Brunei 7-digit numbers
}

export const DEFAULT_COUNTRY_CODE = '+673';
export const DEFAULT_COUNTRY = 'BN';

export const countries: Country[] = [
  { name: 'Brunei Darussalam',  code: 'BN', dialCode: '+673',  flag: '\u{1F1E7}\u{1F1EE}', phoneLength: 7,  format: 'XXX XXXX' },
  { name: 'Malaysia',           code: 'MY', dialCode: '+60',   flag: '\u{1F1F2}\u{1F1FE}', phoneLength: [9, 10], format: 'XX XXX XXXX' },
  { name: 'Singapore',          code: 'SG', dialCode: '+65',   flag: '\u{1F1F8}\u{1F1EC}', phoneLength: 8,  format: 'XXXX XXXX' },
  { name: 'Indonesia',          code: 'ID', dialCode: '+62',   flag: '\u{1F1EE}\u{1F1E9}', phoneLength: [10, 13], format: 'XXX XXXX XXXX' },
  { name: 'Philippines',        code: 'PH', dialCode: '+63',   flag: '\u{1F1F5}\u{1F1ED}', phoneLength: 10, format: 'XXX XXX XXXX' },
  { name: 'India',              code: 'IN', dialCode: '+91',   flag: '\u{1F1EE}\u{1F1F3}', phoneLength: 10, format: 'XXXXX XXXXX' },
  { name: 'Bangladesh',         code: 'BD', dialCode: '+880',  flag: '\u{1F1E7}\u{1F1E9}', phoneLength: 10, format: 'XXXX XXXXXX' },
  { name: 'Thailand',           code: 'TH', dialCode: '+66',   flag: '\u{1F1F9}\u{1F1ED}', phoneLength: 9,  format: 'XX XXX XXXX' },
  { name: 'China',              code: 'CN', dialCode: '+86',   flag: '\u{1F1E8}\u{1F1F3}', phoneLength: 11, format: 'XXX XXXX XXXX' },
  { name: 'Japan',              code: 'JP', dialCode: '+81',   flag: '\u{1F1EF}\u{1F1F5}', phoneLength: [10, 11], format: 'XX XXXX XXXX' },
  { name: 'South Korea',        code: 'KR', dialCode: '+82',   flag: '\u{1F1F0}\u{1F1F7}', phoneLength: [10, 11], format: 'XX XXXX XXXX' },
  { name: 'Saudi Arabia',       code: 'SA', dialCode: '+966',  flag: '\u{1F1F8}\u{1F1E6}', phoneLength: 9,  format: 'XX XXX XXXX' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '\u{1F1E6}\u{1F1EA}', phoneLength: 9, format: 'XX XXX XXXX' },
  { name: 'United Kingdom',     code: 'GB', dialCode: '+44',   flag: '\u{1F1EC}\u{1F1E7}', phoneLength: [10, 11], format: 'XXXX XXXXXX' },
  { name: 'United States',      code: 'US', dialCode: '+1',    flag: '\u{1F1FA}\u{1F1F8}', phoneLength: 10, format: 'XXX XXX XXXX' },
  { name: 'Australia',          code: 'AU', dialCode: '+61',   flag: '\u{1F1E6}\u{1F1FA}', phoneLength: 9,  format: 'XXX XXX XXX' },
  { name: 'Vietnam',            code: 'VN', dialCode: '+84',   flag: '\u{1F1FB}\u{1F1F3}', phoneLength: [9, 10], format: 'XX XXX XX XX' },
];

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code);
}

export function getCountryByDial(dialCode: string): Country | undefined {
  return countries.find((c) => c.dialCode === dialCode);
}

export function validatePhone(phone: string, country: Country): boolean {
  // Strip non-digit characters
  let digits = phone.replace(/\D/g, '');

  // Strip leading zeros (common in many countries, e.g. Brunei "07137462")
  digits = digits.replace(/^0+/, '');

  // If user typed the country code in the phone field (e.g. "6737137462" for Brunei), strip it
  const dialDigits = country.dialCode.replace(/[^\d]/g, '');
  if (dialDigits && digits.startsWith(dialDigits) && digits.length > dialDigits.length + 5) {
    digits = digits.slice(dialDigits.length);
  }

  const len = digits.length;
  if (len === 0) return false;

  if (Array.isArray(country.phoneLength)) {
    return len >= country.phoneLength[0] && len <= country.phoneLength[1];
  }
  return len === country.phoneLength;
}

/**
 * Format a phone number string based on a country's format pattern.
 * "XXX XXXX" with digits "7123456" → "712 3456"
 * Also handles leading zeros and country-code prefixes gracefully.
 */
export function formatPhone(digits: string, country: Country): string {
  let d = digits.replace(/\D/g, '');
  // Strip leading zeros for formatting (same as validatePhone)
  d = d.replace(/^0+/, '');
  // Strip dial code if user typed it
  const dialDigits = country.dialCode.replace(/[^\d]/g, '');
  if (dialDigits && d.startsWith(dialDigits) && d.length > dialDigits.length + 5) {
    d = d.slice(dialDigits.length);
  }
  let di = 0;
  return country.format
    .split('')
    .map((ch) => {
      if (ch === 'X') {
        return d[di++] ?? '';
      }
      return ch;
    })
    .join('');
}