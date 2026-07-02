import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage } from '@/lib/db';
import { generateToken, generateRefreshToken, generateTempToken } from '@/lib/auth';
import { normalizePhone, verifyOtpHash, getFriendlyPhoneError } from '@/lib/phone';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, dialCode, code } = body;

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // ── 1. Validate OTP code format ──
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Enter the complete 6-digit verification code.' },
        { status: 400 },
      );
    }

    // ── 2. Normalize phone number (server-side) ──
    const normalized = normalizePhone(phoneNumber, dialCode);

    if (!normalized.valid) {
      console.warn('[WhatsApp Verify] Validation failed:', { raw: phoneNumber, dialCode, error: normalized.error });
      return NextResponse.json(
        { error: getFriendlyPhoneError(normalized.error || 'Invalid phone number.') },
        { status: 400 },
      );
    }

    const fullPhone = normalized.e164;

    console.log('[WhatsApp Verify] Attempt:', { phone: fullPhone, ip: ipAddress });

    // ── 3. Find tenant ──
    let tenant = await withRetry(
      () => db.tenant.findUnique({ where: { domain: 'mohdhms.com' } }),
      { label: 'verifyOtp-findTenant' },
    );
    if (!tenant) {
      tenant = await withRetry(() => db.tenant.findFirst(), { label: 'verifyOtp-findFirstTenant' });
    }
    if (!tenant) {
      return NextResponse.json({ error: 'Service is not configured.' }, { status: 500 });
    }

    // ── 4. Find the latest unexpired, unverified OTP ──
    const otp = await withRetry(
      () =>
        db.otpCode.findFirst({
          where: {
            phoneNumber: fullPhone,
            tenantId: tenant.id,
            verifiedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        }),
      { label: 'verifyOtp-findOtp' },
    );

    if (!otp) {
      return NextResponse.json(
        { error: 'No valid code found. Please request a new one.' },
        { status: 410 },
      );
    }

    // ── 5. Check max attempts ──
    if (otp.attempts >= otp.maxAttempts) {
      return NextResponse.json(
        { error: 'Maximum attempts exceeded. Please request a new code.' },
        { status: 429 },
      );
    }

    // ── 6. Verify OTP against hash (constant-time comparison) ──
    const isMatch = await verifyOtpHash(code, otp.code);

    if (!isMatch) {
      await withRetry(
        () =>
          db.otpCode.update({
            where: { id: otp.id },
            data: { attempts: { increment: 1 } },
          }),
        { label: 'verifyOtp-incrementAttempts' },
      );

      const remainingAttempts = otp.maxAttempts - otp.attempts - 1;
      console.warn('[WhatsApp Verify] Wrong code:', { phone: fullPhone, remainingAttempts });
      return NextResponse.json(
        {
          error: 'Incorrect code. Please check and try again.',
          remainingAttempts,
        },
        { status: 401 },
      );
    }

    // ── 7. Mark OTP as verified ──
    await withRetry(
      () =>
        db.otpCode.update({
          where: { id: otp.id },
          data: { verifiedAt: new Date() },
        }),
      { label: 'verifyOtp-markVerified' },
    );

    // ── 8. Check if user exists ──
    const existingUser = await withRetry(
      () =>
        db.user.findFirst({
          where: { phone: fullPhone, tenantId: tenant.id, isActive: true },
          select: {
            id: true, email: true, name: true, phone: true, avatar: true,
            role: true, tenantId: true, employeeNumber: true, departmentId: true,
            profileCompleted: true, tenant: { select: { id: true, name: true, domain: true } },
          },
        }),
      { label: 'verifyOtp-findUser' },
    );

    if (existingUser) {
      // ── Existing user: generate tokens and log in ──
      const normalizedRole = (existingUser.role as string).toLowerCase() as typeof existingUser.role;

      const accessToken = generateToken({
        userId: existingUser.id,
        tenantId: existingUser.tenantId,
        role: normalizedRole,
        email: existingUser.email,
      });

      if (!accessToken) {
        return NextResponse.json(
          { error: 'Server authentication is not configured. Please contact the administrator.' },
          { status: 503 },
        );
      }

      const refreshToken = generateRefreshToken();
      const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await withRetry(
        () =>
          db.loginSession.create({
            data: {
              tenantId: tenant.id,
              userId: existingUser.id,
              refreshToken,
              deviceType: parseDeviceType(userAgent),
              browser: parseBrowser(userAgent),
              os: parseOS(userAgent),
              ipAddress,
              userAgent,
              expiresAt: refreshTokenExpiry,
            },
          }),
        { label: 'verifyOtp-createSession' },
      );

      // Update last login (best-effort)
      withRetry(
        () =>
          db.user.update({
            where: { id: existingUser.id },
            data: { lastLogin: new Date(), isOnline: true },
          }),
        { label: 'verifyOtp-updateLastLogin' },
      ).catch(() => {});

      // Device record (best-effort)
      const deviceName = `${parseOS(userAgent)} - ${parseBrowser(userAgent)}`;
      withRetry(
        () =>
          db.device.upsert({
            where: { id: `${existingUser.id}-${crypto.randomUUID().slice(0, 8)}` },
            create: {
              tenantId: tenant.id, userId: existingUser.id, name: deviceName,
              type: parseDeviceType(userAgent), browser: parseBrowser(userAgent),
              os: parseOS(userAgent), ipAddress, userAgent, isTrusted: false,
            },
            update: { lastSeen: new Date(), ipAddress, userAgent },
          }),
        { label: 'verifyOtp-upsertDevice' },
      ).catch(() => {});

      // Audit log
      withRetry(
        () =>
          db.auditLog.create({
            data: {
              tenantId: tenant.id, userId: existingUser.id,
              action: 'whatsapp_login', entity: 'User', entityId: existingUser.id,
              newValue: JSON.stringify({ phoneNumber: fullPhone }),
              ipAddress, userAgent, device: deviceName,
            },
          }),
        { label: 'verifyOtp-auditLogin' },
      ).catch(() => {});

      console.log('[WhatsApp Verify] Login success:', { userId: existingUser.id, phone: fullPhone });

      return NextResponse.json({
        user: {
          id: existingUser.id, email: existingUser.email, name: existingUser.name,
          phone: existingUser.phone, avatar: existingUser.avatar, role: normalizedRole,
          tenantId: existingUser.tenantId, tenantName: tenant.name,
          tenantDomain: tenant.domain, profileCompleted: existingUser.profileCompleted,
        },
        accessToken,
        refreshToken,
        isNewUser: false,
      });
    } else {
      // ── New user: return temp token for registration ──
      const tempToken = generateTempToken({
        phoneNumber: fullPhone,
        dialCode: normalized.dialCode,
        tenantId: tenant.id,
      });

      console.log('[WhatsApp Verify] New user, temp token issued:', { phone: fullPhone });

      return NextResponse.json({
        isNewUser: true,
        needsRegistration: true,
        tempToken,
      });
    }
  } catch (error) {
    console.error('[WhatsApp Verify] Error:', error);
    return NextResponse.json(
      { error: 'Something went wrong verifying your code. Please try again.' },
      { status: 500 },
    );
  }
}

// --- User-Agent parsing utilities ---

function parseDeviceType(ua: string): string {
  if (/Mobile|Android.*Mobile|iPhone|iPod/i.test(ua)) return 'mobile';
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}

function parseBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR|Opera/i.test(ua)) return 'Opera';
  if (/Chrome/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua)) return 'Safari';
  if (/Firefox/i.test(ua)) return 'Firefox';
  return 'Unknown';
}

function parseOS(ua: string): string {
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown';
}