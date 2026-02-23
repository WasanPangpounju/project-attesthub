import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import Scenario from "@/models/scenario";
import TestCase from "@/models/test-case";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; scenarioId: string; tcId: string }>;
};

async function requireTester(userId: string | null) {
  if (!userId) return null;
  const user = await User.findOne({ clerkUserId: userId }).lean();
  return user?.role === "tester" ? user : null;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const tester = await requireTester(userId);
    if (!tester) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { scenarioId, tcId } = await params;
    const body = (await req.json()) as { status?: string; note?: string };
    const { status, note } = body;

    const VALID_STATUSES = ["pass", "fail", "skip"] as const;
    type SubmittableStatus = (typeof VALID_STATUSES)[number];

    if (!status || !(VALID_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify caller is assigned to this scenario
    const scenario = await Scenario.findById(scenarioId).lean();
    if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    if (scenario.assignedTesterId !== userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const testCase = await TestCase.findById(tcId);
    if (!testCase) return NextResponse.json({ error: "Test case not found" }, { status: 404 });

    // Order enforcement: all lower-order test cases must have a non-pending result
    if (testCase.order > 0) {
      const previousTCs = await TestCase.find({
        scenarioId,
        order: { $lt: testCase.order },
      }).lean();

      for (const prev of previousTCs) {
        const prevResult = prev.results.find((r) => r.testerId === userId);
        if (!prevResult || prevResult.status === "pending") {
          return NextResponse.json(
            { error: "Complete previous test cases first" },
            { status: 400 }
          );
        }
      }
    }

    // Update or create result for this tester
    const existing = testCase.results.find((r) => r.testerId === userId);
    if (existing) {
      existing.status = status as SubmittableStatus;
      if (note !== undefined) existing.note = note;
      existing.testedAt = new Date();
    } else {
      testCase.results.push({
        testerId: userId as string,
        status: status as SubmittableStatus,
        note: note ?? "",
        attachments: [],
        testedAt: new Date(),
      });
    }

    await testCase.save();

    return NextResponse.json({ data: testCase }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/tester/tasks/[id]/scenarios/.../test-cases/[tcId]/result]", err);
    return NextResponse.json({ error: "Failed to submit result" }, { status: 500 });
  }
}
