import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'FacilityPro',
      version: process.env.npm_package_version || '0.2.0',
      environment: env.nodeEnv,
    });
  } catch {
    return NextResponse.json(
      { status: 'error', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}