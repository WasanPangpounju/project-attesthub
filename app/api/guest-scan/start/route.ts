import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import GuestScanReport from '@/models/GuestScanReport';
import { guestScanQueue } from '@/lib/queue/guestScanQueue';

export const runtime = 'nodejs';

const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return NextResponse.json({ error: 'Rate limit exceeded', retryAfter }, { status: 429 });
    }
    entry.count += 1;
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }

  try {
    const body = await req.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'กรุณาระบุ URL' }, { status: 400 });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'รูปแบบ URL ไม่ถูกต้อง' }, { status: 400 });
    }

    const normalizedUrl = parsedUrl.href;
    const domain = parsedUrl.hostname.replace(/^www\./, '');

    await connectToDatabase();

    // ตรวจสอบ cache: completed report ของ domain เดิมใน 30 วัน
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cached = await GuestScanReport.findOne({
      domain,
      status: 'completed',
      createdAt: { $gte: thirtyDaysAgo },
    }).sort({ createdAt: -1 });

    if (cached) {
      return NextResponse.json(
        { reportId: cached._id.toString(), cached: true },
        { status: 200 }
      );
    }

    // สร้าง report ใหม่
    const report = await GuestScanReport.create({
      domain,
      url: normalizedUrl,
      status: 'pending',
      visitorIp: ip,
    });

    // Push job ลง queue
    const job = await guestScanQueue.add('scan', { reportId: report._id.toString() });

    // บันทึก jobId
    await GuestScanReport.findByIdAndUpdate(report._id, { jobId: job.id });

    return NextResponse.json(
      { reportId: report._id.toString(), cached: false },
      { status: 201 }
    );
  } catch (err) {
    console.error('[guest-scan/start]', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
