import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage } from '@/lib/db';
import { generateToken, generateRefreshToken, generateTempToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, countryCode, code } = body;

    // Validate inputs
    if (!phoneNumber || !countryCode || !code) {
      return NextResponse.json(
        { error: 'Phone number, country code, and OTP code are required' },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid OTP code format' },
        { status: 400 }
      );
    }

    const fullPhone = `${countryCode}${phoneNumber}`;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find tenant
    let tenant = await withRetry(
      () => db.tenant.findUnique({ where: { domain: 'mohdhms.com' } }),
      { label: 'verifyOtp-findTenant' }
    );
    if (!tenant) {
      tenant = await withRetry(
        () => db.tenant.findFirst(),
        { label: 'verifyOtp-findFirstTenant' }
      );
    }
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant configured' }, { status: 500 });
    }

    // Find the latest unexpired, unverified OTP for this phone (indexed: tenantId+phoneNumber, phoneNumber+expiresAt)
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
      { label: 'verifyOtp-findOtp' }
    );

    if (!otp) {
      return NextResponse.json(
        { error: 'No valid OTP found. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check max attempts
    if (otp.attempts >= otp.maxAttempts) {
      return NextResponse.json(
        { error: 'Maximum attempts exceeded. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Validate code
    if (otp.code !== code) {
      await withRetry(
        () =>
          db.otpCode.update({
            where: { id: otp.id },
            data: { attempts: { increment: 1 } },
          }),
        { label: 'verifyOtp-incrementAttempts' }
      );

      const remainingAttempts = otp.maxAttempts - otp.attempts - 1;
      return NextResponse.json(
        {
          error: 'Invalid OTP code',
          remainingAttempts,
        },
        { status: 401 }
      );
    }

    // Mark OTP as verified
    await withRetry(
      () =>
        db.otpCode.update({
          where: { id: otp.id },
          data: { verifiedAt: new Date() },
        }),
      { label: 'verifyOtp-markVerified' }
    );

    // Check if user exists by phone (now indexed: tenantId+phone)
    const existingUser = await withRetry(
      () =>
        db.user.findFirst({
          where: {
            phone: fullPhone,
            tenantId: tenant.id,
            isActive: true,
          },
        }),
      { label: 'verifyOtp-findUser' }
    );

    if (existingUser) {
      // User exists — generate tokens, create session and device
      const accessToken = generateToken({
        userId: existingUser.id,
        tenantId: existingUser.tenantId,
        role: existingUser.role,
        email: existingUser.email,
      });

      const refreshToken = generateRefreshToken();
      const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Create login session
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
        { label: 'verifyOtp-createSession' }
      );

      // Update user last login (best-effort)
      withRetry(
        () =>
          db.user.update({
            where: { id: existingUser.id },
            data: { lastLogin: new Date().toISOString(), isOnline: true },
          }),
        { label: 'verifyOtp-updateLastLogin' }
      ).catch(() => {});

      // Create device record (best-effort)
      const deviceName = `${parseOS(userAgent)} - ${parseBrowser(userAgent)}`;
      withRetry(
        () =>
          db.device.upsert({
            where: {
              id: `${existingUser.id}-${crypto.randomUUID().slice(0, 8)}`,
            },
            create: {
              tenantId: tenant.id,
              userId: existingUser.id,
              name: deviceName,
              type: parseDeviceType(userAgent),
              browser: parseBrowser(userAgent),
              os: parseOS(userAgent),
              ipAddress,
              userAgent,
              isTrusted: false,
            },
            update: {
              lastSeen: new Date(),
              ipAddress,
              userAgent,
            },
          }),
        { label: 'verifyOtp-upsertDevice' }
      ).catch(() => {});

      // Audit log (non-critical)
      withRetry(
        () =>
          db.auditLog.create({
            data: {
              tenantId: tenant.id,
              userId: existingUser.id,
              action: 'whatsapp_login',
              entity: 'User',
              entityId: existingUser.id,
              newValue: JSON.stringify({ phoneNumber: fullPhone }),
              ipAddress,
              userAgent,
              device: deviceName,
            },
          }),
        { label: 'verifyOtp-auditLogin' }
      ).catch(() => {});

      return NextResponse.json({
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          phone: existingUser.phone,
          avatar: existingUser.avatar,
          role: existingUser.role,
          tenantId: existingUser.tenantId,
          tenantName: tenant.name,
          tenantDomain: tenant.domain,
          profileCompleted: existingUser.profileCompleted,
        },
        accessToken,
        refreshToken,
        isNewUser: false,
      });
    } else {
      // User doesn't exist — return temp token for registration
      const tempToken = generateTempToken({
        phoneNumber: fullPhone,
        countryCode,
        tenantId: tenant.id,
      });

      // Audit log with system user (non-critical)
      withRetry(async () => {
        const systemUser = await db.user.findFirst({
          where: { tenantId: tenant.id, role: 'super_admin' },
          select: { id: true },
        });
        if (systemUser) {
          await db.auditLog.create({
            data: {
              tenantId: tenant.id,
              userId: systemUser.id,
              action: 'otp_verified_new_user',
              entity: 'OtpCode',
              entityId: otp.id,
              newValue: JSON.stringify({ phoneNumber: fullPhone }),
              ipAddress,
              userAgent,
              device: 'api',
            },
          });
        }
      }, { label: 'verifyOtp-auditNewUser' }).catch(() => {});

      return NextResponse.json({
        isNewUser: true,
        tempToken,
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500 }
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