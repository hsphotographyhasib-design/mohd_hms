import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    // Placeholder: return report metadata
    return NextResponse.json({ id, status: 'completed', downloadUrl: null, message: 'Report generated successfully. Download will be available soon.' });
  } catch (error) { return NextResponse.json({ error: 'Failed to get report' }, { status: 500 }); }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return NextResponse.json({ error: 'Method not allowed for reports' }, { status: 405 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Report deleted' });
  } catch (error) { return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 }); }
}