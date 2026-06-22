// Convert number to words for BND (Brunei Dollar) currency
// e.g. 710.00 => "SEVEN HUNDRED TEN BRUNEI DOLLARS ONLY"

const ONES = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
  'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
  'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
] as const;

const TENS = [
  '', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY',
] as const;

function convertHundreds(n: number): string {
  if (n >= 100) {
    return `${ONES[Math.floor(n / 100)]} HUNDRED${n % 100 !== 0 ? ' AND ' : ''}${convertBelowHundred(n % 100)}`;
  }
  return convertBelowHundred(n);
}

function convertBelowHundred(n: number): string {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return one !== 0 ? `${TENS[ten]} ${ONES[one]}` : TENS[ten];
}

function convertWholeNumber(n: number): string {
  if (n === 0) return 'ZERO';

  const parts: string[] = [];

  if (n >= 1_000_000_000) {
    const billions = Math.floor(n / 1_000_000_000);
    parts.push(`${convertHundreds(billions)} BILLION`);
    n %= 1_000_000_000;
  }

  if (n >= 1_000_000) {
    const millions = Math.floor(n / 1_000_000);
    parts.push(`${convertHundreds(millions)} MILLION`);
    n %= 1_000_000;
  }

  if (n >= 1_000) {
    const thousands = Math.floor(n / 1_000);
    parts.push(`${convertHundreds(thousands)} THOUSAND`);
    n %= 1_000;
  }

  if (n > 0) {
    parts.push(convertHundreds(n));
  }

  return parts.join(' ');
}

export function numberToCurrencyWords(amount: number): string {
  if (amount === 0) return 'ZERO BRUNEI DOLLARS ONLY';

  const wholePart = Math.floor(Math.abs(amount));
  const cents = Math.round((Math.abs(amount) - wholePart) * 100);

  let result = convertWholeNumber(wholePart);

  if (wholePart === 1) {
    result += ' BRUNEI DOLLAR';
  } else {
    result += ' BRUNEI DOLLARS';
  }

  if (cents > 0) {
    if (cents === 1) {
      result += ` AND ONE CENT`;
    } else {
      result += ` AND ${convertBelowHundred(cents)} CENTS`;
    }
  }

  result += ' ONLY';

  if (amount < 0) {
    result = 'MINUS ' + result;
  }

  return result;
}