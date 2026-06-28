import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cmms-enterprise-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): jwt.JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch {
    return null;
  }
}

export function generateAssetNumber(category: string): string {
  const prefix: Record<string, string> = {
    HVAC: 'HVC',
    Electrical: 'ELC',
    Plumbing: 'PLB',
    Generator: 'GEN',
    Mechanical: 'MEC',
    FireProtection: 'FIR',
  };
  const p = prefix[category] || 'EQP';
  const ts = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${p}-${ts}${rand}`;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `INV/SMSB/01/${y}/${seq}`;
}

export function generatePONumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const seq = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `PO-${y}${m}-${seq}`;
}

export function generateCustomerNumber(): string {
  const seq = Math.random().toString(36).toUpperCase().slice(2, 8);
  return `CUST-${seq}`;
}

export function sanitizeInput(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

// ============ WhatsApp OTP & Refresh Token Helpers ============

export function generateOtpCode(): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

const TEMP_TOKEN_EXPIRES_IN = '30m';

export function generateTempToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TEMP_TOKEN_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyTempToken(token: string): jwt.JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch {
    return null;
  }
}

export function parseJsonSafe<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}