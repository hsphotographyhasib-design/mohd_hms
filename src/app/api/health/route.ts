import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { isFcmAdminConfigured } from '@/lib/fcm-admin';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'FacilityPro',
      version: process.env.npm_package_version || '0.2.0',
      environment: env.nodeEnv,
      fcm: {
        adminConfigured: isFcmAdminConfigured(),
        clientConfigured: !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
        vapidKeyConfigured: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
      },
    });
  } catch {
    return NextResponse.json(
      { status: 'error', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}