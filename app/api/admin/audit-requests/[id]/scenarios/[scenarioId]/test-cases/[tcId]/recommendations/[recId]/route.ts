import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import TestCase from "@/models/test-case";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; scenarioId: string; tcId: string; recId: string }> };

async function requireAdmin(userId: string | null) {
  if (!userId) return null;
  const user = await User.findOne({ clerkUserId: userId }).lean();
  return user?.role === "admin" ? user : null;
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { scenarioId, tcId, recId } = await params;

    const testCase = await TestCase.findOne({ _id: tcId, scenarioId });
    if (!testCase) return NextResponse.json({ error: "Test case not found" }, { status: 404 });

    const rec = testCase.recommendations.find((r) => r._id?.toString() === recId);
    if (!rec) return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });

    const body = (await req.json()) as {
      title?: string;
      description?: string;
      severity?: "critical" | "high" | "medium" | "low";
      howToFix?: string;
      technique?: string;
      referenceUrl?: string;
      codeSnippet?: string;
    };

    if (body.title !== undefined) (rec as Record<string, unknown>).title = body.title.trim();
    if (body.description !== undefined) (rec as Record<string, unknown>).description = body.description.trim();
    if (body.severity !== undefined) (rec as Record<string, unknown>).severity = body.severity;
    if (body.howToFix !== undefined) (rec as Record<string, unknown>).howToFix = body.howToFix.trim();
    if (body.technique !== undefined) (rec as Record<string, unknown>).technique = body.technique.trim() || undefined;
    if (body.referenceUrl !== undefined) (rec as Record<string, unknown>).referenceUrl = body.referenceUrl.trim() || undefined;
    if (body.codeSnippet !== undefined) (rec as Record<string, unknown>).codeSnippet = body.codeSnippet.trim() || undefined;

    await testCase.save();

    const updated = testCase.recommendations.find((r) => r._id?.toString() === recId);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    console.error("[PUT /api/admin/.../recommendations/[recId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { scenarioId, tcId, recId } = await params;

    const result = await TestCase.findOneAndUpdate(
      { _id: tcId, scenarioId },
      { $pull: { recommendations: { _id: recId } } },
      { new: true }
    );

    if (!result) return NextResponse.json({ error: "Test case not found" }, { status: 404 });

    return NextResponse.json({ message: "Recommendation deleted" }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/admin/.../recommendations/[recId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
