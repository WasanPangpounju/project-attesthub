import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import PageView from '@/models/PageView';

export const runtime = 'nodejs';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path } = body as { path?: string };

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || '';

    await connectToDatabase();
    await PageView.create({ path, ip, userAgent });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[pageview]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
