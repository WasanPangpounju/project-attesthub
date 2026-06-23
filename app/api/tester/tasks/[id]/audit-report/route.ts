import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import AuditRequest from "@/models/audit-request";
import AuditReport from "@/models/AuditReport";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function isHexObjectId(id: string) {
  return /^[a-f\d]{24}$/i.test(id);
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findOne({ clerkUserId: userId }).lean();
    if (!user || user.role !== "tester") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id || !isHexObjectId(id)) {
      return NextResponse.json({ error: "Missing or invalid id param" }, { status: 400 });
    }

    const auditRequest = await AuditRequest.findById(id).lean();
    if (!auditRequest) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const testerEntry = auditRequest.assignedTesters.find((t) => t.testerId === userId);
    if (!testerEntry) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const report = await AuditReport.findOne({ auditRequestId: id }).lean();
    if (!report) {
      return NextResponse.json({ error: "No automated scan report found" }, { status: 404 });
    }

    return NextResponse.json({ data: report }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/tester/tasks/[id]/audit-report]", err);
    return NextResponse.json({ error: "Failed to fetch audit report" }, { status: 500 });
  }
}
