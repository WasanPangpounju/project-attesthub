import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import TestCase from "@/models/test-case";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; scenarioId: string; tcId: string }> };

async function requireAdmin(userId: string | null) {
  if (!userId) return null;
  const user = await User.findOne({ clerkUserId: userId }).lean();
  return user?.role === "admin" ? user : null;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { scenarioId, tcId } = await params;

    const testCase = await TestCase.findOne({ _id: tcId, scenarioId }).lean();
    if (!testCase) return NextResponse.json({ error: "Test case not found" }, { status: 404 });

    return NextResponse.json({ data: testCase.recommendations ?? [] }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/admin/.../test-cases/[tcId]/recommendations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { scenarioId, tcId } = await params;

    const testCase = await TestCase.findOne({ _id: tcId, scenarioId });
    if (!testCase) return NextResponse.json({ error: "Test case not found" }, { status: 404 });

    const body = (await req.json()) as {
      title?: string;
      description?: string;
      severity?: "critical" | "high" | "medium" | "low";
      howToFix?: string;
      technique?: string;
      referenceUrl?: string;
      codeSnippet?: string;
    };

    if (!body.title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (!body.description?.trim()) return NextResponse.json({ error: "description is required" }, { status: 400 });
    if (!body.howToFix?.trim()) return NextResponse.json({ error: "howToFix is required" }, { status: 400 });

    const newRec = {
      title: body.title.trim(),
      description: body.description.trim(),
      severity: body.severity ?? "medium",
      howToFix: body.howToFix.trim(),
      technique: body.technique?.trim() || undefined,
      referenceUrl: body.referenceUrl?.trim() || undefined,
      codeSnippet: body.codeSnippet?.trim() || undefined,
      createdBy: userId as string,
    };

    testCase.recommendations.push(newRec as never);
    await testCase.save();

    const saved = testCase.recommendations[testCase.recommendations.length - 1];
    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/.../test-cases/[tcId]/recommendations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
