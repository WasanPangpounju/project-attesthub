import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import Scenario from "@/models/scenario";
import TestCase from "@/models/test-case";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; scenarioId: string }> };

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

    const { scenarioId } = await params;

    const scenario = await Scenario.findById(scenarioId).lean();
    if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

    const testCases = await TestCase.find({ scenarioId: scenarioId })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({ data: { ...scenario, testCases } }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/admin/.../scenarios/[scenarioId]]", err);
    return NextResponse.json({ error: "Failed to fetch scenario" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { scenarioId } = await params;
    const body = (await req.json()) as {
      title?: string;
      description?: string;
      assignedTesterId?: string;
      order?: number;
    };

    if (body.assignedTesterId) {
      const testerUser = await User.findOne({
        clerkUserId: body.assignedTesterId,
        role: "tester",
      }).lean();
      if (!testerUser)
        return NextResponse.json({ error: "Tester not found" }, { status: 404 });
    }

    const updated = await Scenario.findByIdAndUpdate(
      scenarioId,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    console.error("[PUT /api/admin/.../scenarios/[scenarioId]]", err);
    return NextResponse.json({ error: "Failed to update scenario" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { scenarioId } = await params;

    const scenario = await Scenario.findByIdAndDelete(scenarioId).lean();
    if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

    // Delete all associated test cases
    await TestCase.deleteMany({ scenarioId: scenarioId });

    return NextResponse.json({ data: { deleted: true } }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/admin/.../scenarios/[scenarioId]]", err);
    return NextResponse.json({ error: "Failed to delete scenario" }, { status: 500 });
  }
}
