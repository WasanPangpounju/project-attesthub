import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import GuestScanReport from '@/models/GuestScanReport';

export const runtime = 'nodejs';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const user = await User.findOne({ clerkUserId: userId }).lean<{ role?: string }>();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reportId } = await params;
    const isValidId = /^[a-f\d]{24}$/i.test(reportId);
    if (!isValidId) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

    const result = await GuestScanReport.deleteOne({ _id: reportId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/admin/guest-scans/[reportId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
