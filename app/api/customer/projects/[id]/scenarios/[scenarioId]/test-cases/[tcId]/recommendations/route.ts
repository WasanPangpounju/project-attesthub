import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import AuditRequest from "@/models/audit-request";
import TestCase from "@/models/test-case";
import { Types } from "mongoose";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; scenarioId: string; tcId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const { id, scenarioId, tcId } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const auditRequest = await AuditRequest.findById(id).lean();
    if (!auditRequest) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (auditRequest.customerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const testCase = await TestCase.findOne({ _id: tcId, scenarioId }).lean();
    if (!testCase) return NextResponse.json({ error: "Test case not found" }, { status: 404 });

    return NextResponse.json({ data: testCase.recommendations ?? [] }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/customer/projects/[id]/scenarios/[scenarioId]/test-cases/[tcId]/recommendations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
