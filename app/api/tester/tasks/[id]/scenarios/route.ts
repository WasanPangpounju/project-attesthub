import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import Scenario from "@/models/scenario";
import TestCase from "@/models/test-case";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function requireTester(userId: string | null) {
  if (!userId) return null;
  const user = await User.findOne({ clerkUserId: userId }).lean();
  return user?.role === "tester" ? user : null;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const tester = await requireTester(userId);
    if (!tester) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    // Only scenarios assigned to this tester
    const scenarios = await Scenario.find({
      auditRequestId: id,
      assignedTesterId: userId,
    })
      .sort({ order: 1 })
      .lean();

    const scenarioIds = scenarios.map((s) => s._id.toString());

    // Fetch all test cases for these scenarios in one query
    const allTestCases = await TestCase.find({ scenarioId: { $in: scenarioIds } })
      .sort({ order: 1 })
      .lean();

    // Group test cases by scenarioId and inject caller's result
    const tcByScenario: Record<string, typeof allTestCases> = {};
    for (const tc of allTestCases) {
      const sid = tc.scenarioId;
      if (!tcByScenario[sid]) tcByScenario[sid] = [];

      // Find or inject caller's result
      const callerResult = tc.results.find((r) => r.testerId === userId) ?? {
        status: "pending" as const,
        note: "",
        attachments: [],
      };

      tcByScenario[sid].push({
        ...tc,
        myResult: callerResult,
      } as typeof tc & { myResult: typeof callerResult });
    }

    const data = scenarios.map((s) => ({
      ...s,
      testCases: tcByScenario[s._id.toString()] ?? [],
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/tester/tasks/[id]/scenarios]", err);
    return NextResponse.json({ error: "Failed to fetch scenarios" }, { status: 500 });
  }
}
