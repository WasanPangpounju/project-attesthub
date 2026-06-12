import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import GuestScanReport from '@/models/GuestScanReport';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const reports = await GuestScanReport.find({ clerkUserId: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('domain url score wcagLevel status createdAt aiSummary.urgency')
      .lean();

    const data = reports.map((r) => ({
      reportId: r._id.toString(),
      url: r.url,
      domain: r.domain,
      score: r.score ?? null,
      wcagLevel: r.wcagLevel ?? null,
      status: r.status,
      createdAt: r.createdAt,
      urgency: r.aiSummary?.urgency ?? null,
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/scan-history]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
