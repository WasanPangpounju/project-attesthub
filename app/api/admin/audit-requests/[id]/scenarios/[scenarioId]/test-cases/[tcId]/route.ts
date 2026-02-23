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

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { tcId } = await params;

    const testCase = await TestCase.findById(tcId).lean();
    if (!testCase) return NextResponse.json({ error: "Test case not found" }, { status: 404 });

    return NextResponse.json({ data: testCase }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/admin/.../test-cases/[tcId]]", err);
    return NextResponse.json({ error: "Failed to fetch test case" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { tcId } = await params;
    const body = (await req.json()) as {
      title?: string;
      description?: string;
      steps?: { order: number; instruction: string }[];
      expectedResult?: string;
      priority?: string;
      order?: number;
    };

    const updated = await TestCase.findByIdAndUpdate(
      tcId,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: "Test case not found" }, { status: 404 });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    console.error("[PUT /api/admin/.../test-cases/[tcId]]", err);
    return NextResponse.json({ error: "Failed to update test case" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { tcId } = await params;

    const deleted = await TestCase.findByIdAndDelete(tcId).lean();
    if (!deleted) return NextResponse.json({ error: "Test case not found" }, { status: 404 });

    return NextResponse.json({ data: { deleted: true } }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/admin/.../test-cases/[tcId]]", err);
    return NextResponse.json({ error: "Failed to delete test case" }, { status: 500 });
  }
}
