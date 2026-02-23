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

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const tester = await requireTester(userId);
    if (!tester) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { scenarioId, tcId } = await params;
    const body = (await req.json()) as { name?: string; size?: number; type?: string; url?: string; publicId?: string };
    const { name, size, type, url, publicId } = body;

    if (!name || size === undefined || !type)
      return NextResponse.json(
        { error: "name, size, and type are required" },
        { status: 400 }
      );

    // Verify caller is assigned to this scenario
    const scenario = await Scenario.findById(scenarioId).lean();
    if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    if (scenario.assignedTesterId !== userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const testCase = await TestCase.findById(tcId);
    if (!testCase) return NextResponse.json({ error: "Test case not found" }, { status: 404 });

    // Find or create result entry for this tester
    let result = testCase.results.find((r) => r.testerId === userId);
    if (!result) {
      testCase.results.push({
        testerId: userId as string,
        status: "pending",
        note: "",
        attachments: [],
      });
      result = testCase.results[testCase.results.length - 1];
    }

    result.attachments.push({
      name,
      size,
      type,
      url,
      publicId,
      uploadedAt: new Date(),
    });

    await testCase.save();

    // Return the updated result
    const savedResult = testCase.results.find((r) => r.testerId === userId);
    return NextResponse.json({ data: savedResult }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tester/tasks/[id]/scenarios/.../test-cases/[tcId]/attachments]", err);
    return NextResponse.json({ error: "Failed to add attachment" }, { status: 500 });
  }
}
