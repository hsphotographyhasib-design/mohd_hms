import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { headers } from 'next/headers';
import type { JwtPayload } from 'jsonwebtoken';

async function getAuthUser() {
  const headersList = await headers();
  const auth = headersList.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(auth.slice(7));
  } catch {
    return null;
  }
}

function isAdmin(user: JwtPayload | null): user is JwtPayload {
  if (!user) return false;
  return user.role === 'super_admin' || user.role === 'admin';
}

function formatFooter(f: {
  id: string;
  tenantId: string;
  companyDescription: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  youtube: string | null;
  copyrightText: string | null;
  privacyPolicyLink: string | null;
  termsLink: string | null;
  menuLinks: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: f.id,
    tenantId: f.tenantId,
    companyDescription: f.companyDescription,
    address: f.address,
    phone: f.phone,
    email: f.email,
    whatsapp: f.whatsapp,
    facebook: f.facebook,
    instagram: f.instagram,
    linkedin: f.linkedin,
    twitter: f.twitter,
    youtube: f.youtube,
    copyrightText: f.copyrightText,
    privacyPolicyLink: f.privacyPolicyLink,
    termsLink: f.termsLink,
    menuLinks: f.menuLinks,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;

    const footer = await db.cmsFooter.findFirst({ where: { tenantId } });

    return NextResponse.json({ data: footer ? formatFooter(footer) : null });
  } catch (error) {
    console.error('CMS footer GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const body = await request.json();

    const existing = await db.cmsFooter.findFirst({ where: { tenantId } });

    let footer;
    if (existing) {
      footer = await db.cmsFooter.update({
        where: { id: existing.id },
        data: {
          ...(body.companyDescription !== undefined && { companyDescription: body.companyDescription || null }),
          ...(body.address !== undefined && { address: body.address || null }),
          ...(body.phone !== undefined && { phone: body.phone || null }),
          ...(body.email !== undefined && { email: body.email || null }),
          ...(body.whatsapp !== undefined && { whatsapp: body.whatsapp || null }),
          ...(body.facebook !== undefined && { facebook: body.facebook || null }),
          ...(body.instagram !== undefined && { instagram: body.instagram || null }),
          ...(body.linkedin !== undefined && { linkedin: body.linkedin || null }),
          ...(body.twitter !== undefined && { twitter: body.twitter || null }),
          ...(body.youtube !== undefined && { youtube: body.youtube || null }),
          ...(body.copyrightText !== undefined && { copyrightText: body.copyrightText || null }),
          ...(body.privacyPolicyLink !== undefined && { privacyPolicyLink: body.privacyPolicyLink || null }),
          ...(body.termsLink !== undefined && { termsLink: body.termsLink || null }),
          ...(body.menuLinks !== undefined && { menuLinks: body.menuLinks || null }),
        },
      });
    } else {
      footer = await db.cmsFooter.create({
        data: {
          tenantId,
          companyDescription: body.companyDescription || null,
          address: body.address || null,
          phone: body.phone || null,
          email: body.email || null,
          whatsapp: body.whatsapp || null,
          facebook: body.facebook || null,
          instagram: body.instagram || null,
          linkedin: body.linkedin || null,
          twitter: body.twitter || null,
          youtube: body.youtube || null,
          copyrightText: body.copyrightText || null,
          privacyPolicyLink: body.privacyPolicyLink || null,
          termsLink: body.termsLink || null,
          menuLinks: body.menuLinks || null,
        },
      });
    }

    return NextResponse.json(formatFooter(footer));
  } catch (error) {
    console.error('CMS footer PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}