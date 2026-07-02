import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage } from '@/lib/db';
import { verifyTempToken, generateToken, generateRefreshToken, generateCustomerNumber } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tempToken,
      fullName,
      companyName,
      email,
      address,
      city,
      district,
      country,
      preferredLanguage,
    } = body;

    // Validate required fields
    if (!tempToken || !fullName || !address) {
      return NextResponse.json(
        { error: 'tempToken, fullName, and address are required' },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Verify temp token
    const payload = verifyTempToken(tempToken);
    if (!payload || !payload.phoneNumber || !payload.tenantId) {
      return NextResponse.json(
        { error: 'Invalid or expired registration token' },
        { status: 401 }
      );
    }

    const { phoneNumber, tenantId } = payload;

    // Find tenant
    let tenant = await withRetry(
      () => db.tenant.findUnique({ where: { id: tenantId as string } }),
      { label: 'register-findTenantById' }
    );
    if (!tenant) {
      tenant = await withRetry(
        () => db.tenant.findUnique({ where: { domain: 'mohdhms.com' } }),
        { label: 'register-findTenantByDomain' }
      );
    }
    if (!tenant) {
      tenant = await withRetry(
        () => db.tenant.findFirst(),
        { label: 'register-findFirstTenant' }
      );
    }
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant configured' }, { status: 500 });
    }

    // Check if user already exists with this phone (indexed: tenantId+phone)
    const existingUser = await withRetry(
      () =>
        db.user.findFirst({
          where: { phone: phoneNumber as string, tenantId: tenant.id },
        }),
      { label: 'register-checkPhone' }
    );
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this phone number already exists' },
        { status: 409 }
      );
    }

    // Determine email
    const userEmail = email || `whatsapp_${(phoneNumber as string).replace(/\+/g, '')}@mohdhms.com`;

    // Check if email is already taken (unique constraint handles this, but give friendly message)
    const existingEmail = await withRetry(
      () =>
        db.user.findFirst({
          where: { email: userEmail, tenantId: tenant.id },
        }),
      { label: 'register-checkEmail' }
    );
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email is already in use' },
        { status: 409 }
      );
    }

    // Create user with role 'customer'
    const user = await withRetry(
      () =>
        db.user.create({
          data: {
            tenantId: tenant.id,
            email: userEmail,
            name: fullName,
            phone: phoneNumber as string,
            role: 'customer',
            profileCompleted: true,
            isActive: true,
          },
        }),
      { label: 'register-createUser' }
    );

    // Create customer record linked to the user
    const customerNumber = generateCustomerNumber();
    await withRetry(
      () =>
        db.customer.create({
          data: {
            tenantId: tenant.id,
            name: fullName,
            email: email || null,
            phone: phoneNumber as string,
            address: city ? `${address}, ${city}` : address,
            companyName: companyName || null,
            country: country || 'Brunei',
            district: district || null,
            customerNumber,
            isActive: true,
            isWhatsappVerified: true,
            whatsappPhone: phoneNumber as string,
          },
        }),
      { label: 'register-createCustomer' }
    );

    // Generate access + refresh tokens
    const accessToken = generateToken({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
    });

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Server authentication is not configured. Please contact the administrator.' },
        { status: 503 },
      );
    }

    const refreshToken = generateRefreshToken();
    const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create login session
    await withRetry(
      () =>
        db.loginSession.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            refreshToken,
            deviceType: parseDeviceType(userAgent),
            browser: parseBrowser(userAgent),
            os: parseOS(userAgent),
            ipAddress,
            userAgent,
            expiresAt: refreshTokenExpiry,
          },
        }),
      { label: 'register-createSession' }
    );

    // Create device record (best-effort)
    const deviceName = `${parseOS(userAgent)} - ${parseBrowser(userAgent)}`;
    withRetry(
      () =>
        db.device.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            name: deviceName,
            type: parseDeviceType(userAgent),
            browser: parseBrowser(userAgent),
            os: parseOS(userAgent),
            ipAddress,
            userAgent,
            isTrusted: false,
          },
        }),
      { label: 'register-createDevice' }
    ).catch(() => {});

    // Audit log (non-critical)
    withRetry(
      () =>
        db.auditLog.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            action: 'whatsapp_register',
            entity: 'User',
            entityId: user.id,
            newValue: JSON.stringify({
              phoneNumber,
              fullName,
              companyName,
              email: userEmail,
            }),
            ipAddress,
            userAgent,
            device: deviceName,
          },
        }),
      { label: 'register-auditLog' }
    ).catch(() => {});

    // Notify admin users (non-critical)
    withRetry(async () => {
      const adminUsers = await db.user.findMany({
        where: {
          tenantId: tenant.id,
          role: { in: ['admin', 'super_admin'] },
          isActive: true,
        },
        select: { id: true, name: true },
      });

      for (const admin of adminUsers) {
        await db.notification.create({
          data: {
            tenantId: tenant.id,
            userId: admin.id,
            type: 'workflow_transition',
            title: 'New Customer Registered via WhatsApp',
            message: `${fullName} (${phoneNumber as string}) has registered as a new customer.${companyName ? ` Company: ${companyName}` : ''}`,
            data: JSON.stringify({ userId: user.id, phoneNumber }),
            relatedEntityType: 'User',
            relatedEntityId: user.id,
          },
        });
      }
    }, { label: 'register-notifyAdmins' }).catch(() => {});

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: tenant.name,
        tenantDomain: tenant.domain,
        profileCompleted: user.profileCompleted,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Register error:', error);
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