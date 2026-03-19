import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import GuestScanReport from '@/models/GuestScanReport';
import { guestScanQueue } from '@/lib/queue/guestScanQueue';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;

    await connectToDatabase();

    const report = await GuestScanReport.findById(reportId).select(
      'status jobId score wcagLevel summary createdAt'
    );

    if (!report) {
      return NextResponse.json({ error: 'ไม่พบรายงาน' }, { status: 404 });
    }

    // ดึง progress จาก BullMQ job (ถ้ามี jobId)
    let progress: number | null = null;
    if (report.jobId && (report.status === 'pending' || report.status === 'scanning')) {
      try {
        const job = await guestScanQueue.getJob(report.jobId);
        if (job) {
          const jobProgress = await job.progress;
          progress = typeof jobProgress === 'number' ? jobProgress : null;
        }
      } catch {
        // ไม่ critical ถ้าดึง progress ไม่ได้
      }
    }

    return NextResponse.json(
      {
        status: report.status,
        progress,
        score: report.score ?? null,
        wcagLevel: report.wcagLevel ?? null,
        summary: report.summary ?? null,
        createdAt: report.createdAt,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[guest-scan/status]', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
