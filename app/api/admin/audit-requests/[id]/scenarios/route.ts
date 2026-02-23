import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import Scenario from "@/models/scenario";
import TestCase from "@/models/test-case";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function requireAdmin(userId: string | null) {
  if (!userId) return null;
  const user = await User.findOne({ clerkUserId: userId }).lean();
  return user?.role === "admin" ? user : null;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    const scenarios = await Scenario.find({ auditRequestId: id }).sort({ order: 1 }).lean();

    // Attach test case count to each scenario
    const scenarioIds = scenarios.map((s) => s._id.toString());
    const counts = await TestCase.aggregate<{ _id: string; count: number }>([
      { $match: { scenarioId: { $in: scenarioIds } } },
      { $group: { _id: "$scenarioId", count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    counts.forEach((c) => { countMap[c._id] = c.count; });

    const data = scenarios.map((s) => ({
      ...s,
      testCaseCount: countMap[s._id.toString()] ?? 0,
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/admin/audit-requests/[id]/scenarios]", err);
    return NextResponse.json({ error: "Failed to fetch scenarios" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = (await req.json()) as {
      title?: string;
      description?: string;
      assignedTesterId?: string;
      order?: number;
    };
    const { title, description, assignedTesterId, order } = body;

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (!assignedTesterId)
      return NextResponse.json({ error: "assignedTesterId is required" }, { status: 400 });

    const testerUser = await User.findOne({ clerkUserId: assignedTesterId, role: "tester" }).lean();
    if (!testerUser)
      return NextResponse.json({ error: "Tester not found" }, { status: 404 });

    let finalOrder = order;
    if (finalOrder === undefined) {
      const maxScenario = await Scenario.findOne({ auditRequestId: id })
        .sort({ order: -1 })
        .lean();
      finalOrder = maxScenario ? maxScenario.order + 1 : 0;
    }

    const newScenario = await Scenario.create({
      auditRequestId: id,
      title,
      description,
      assignedTesterId,
      order: finalOrder,
      createdBy: userId as string,
    });

    return NextResponse.json({ data: newScenario }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/audit-requests/[id]/scenarios]", err);
    return NextResponse.json({ error: "Failed to create scenario" }, { status: 500 });
  }
}
