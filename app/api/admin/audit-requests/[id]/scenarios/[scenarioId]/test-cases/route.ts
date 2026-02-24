import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import AuditRequest from "@/models/audit-request";
import Scenario from "@/models/scenario";
import TestCase from "@/models/test-case";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; scenarioId: string }> };

async function requireAdmin(userId: string | null) {
  if (!userId) return null;
  const user = await User.findOne({ clerkUserId: userId }).lean();
  return user?.role === "admin" ? user : null;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDatabase();

    const { id, scenarioId } = await params;

    // Allow admin OR the project owner (customer)
    const admin = await requireAdmin(userId);
    if (!admin) {
      const auditRequest = await AuditRequest.findById(id).lean();
      if (!auditRequest || auditRequest.customerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const testCases = await TestCase.find({ scenarioId }).sort({ order: 1 }).lean();

    return NextResponse.json({ data: testCases }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/admin/.../scenarios/[scenarioId]/test-cases]", err);
    return NextResponse.json({ error: "Failed to fetch test cases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, scenarioId } = await params;
    const body = (await req.json()) as {
      title?: string;
      description?: string;
      steps?: { order: number; instruction: string }[];
      expectedResult?: string;
      priority?: string;
      order?: number;
      wcagCriteria?: string[];
    };
    const { title, description, steps, expectedResult, priority, order, wcagCriteria } = body;

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (!expectedResult)
      return NextResponse.json({ error: "expectedResult is required" }, { status: 400 });
    if (!Array.isArray(steps))
      return NextResponse.json({ error: "steps must be an array" }, { status: 400 });

    // Verify scenario exists
    const scenario = await Scenario.findById(scenarioId).lean();
    if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

    let finalOrder = order;
    if (finalOrder === undefined) {
      const maxTC = await TestCase.findOne({ scenarioId }).sort({ order: -1 }).lean();
      finalOrder = maxTC ? maxTC.order + 1 : 0;
    }

    const newTestCase = await TestCase.create({
      scenarioId,
      auditRequestId: id,
      title,
      description,
      steps,
      expectedResult,
      priority: priority ?? "medium",
      wcagCriteria: wcagCriteria ?? [],
      order: finalOrder,
      createdBy: userId as string,
    });

    return NextResponse.json({ data: newTestCase }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/.../scenarios/[scenarioId]/test-cases]", err);
    return NextResponse.json({ error: "Failed to create test case" }, { status: 500 });
  }
}
