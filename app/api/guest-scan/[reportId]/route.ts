import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import GuestScanReport from '@/models/GuestScanReport';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;

    await connectToDatabase();

    const report = await GuestScanReport.findById(reportId);

    if (!report) {
      return NextResponse.json({ error: 'ไม่พบรายงาน' }, { status: 404 });
    }

    // ถ้ายังไม่เสร็จ → return แค่ status
    if (report.status !== 'completed') {
      return NextResponse.json({ status: report.status }, { status: 200 });
    }

    return NextResponse.json({ data: report }, { status: 200 });
  } catch (err) {
    console.error('[guest-scan/report]', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
