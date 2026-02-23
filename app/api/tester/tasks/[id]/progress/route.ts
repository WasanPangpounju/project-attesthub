import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import AuditRequest from "@/models/audit-request";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function requireTester(userId: string | null) {
  if (!userId) return null;
  const user = await User.findOne({ clerkUserId: userId }).lean();
  if (!user || user.role !== "tester") return null;
  return user;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const user = await requireTester(userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = (await req.json()) as { progressPercent?: number };
    const { progressPercent } = body;

    if (
      progressPercent === undefined ||
      typeof progressPercent !== "number" ||
      progressPercent < 0 ||
      progressPercent > 100
    ) {
      return NextResponse.json(
        { error: "progressPercent must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    const updated = await AuditRequest.findOneAndUpdate(
      { _id: id, "assignedTesters.testerId": userId },
      { $set: { "assignedTesters.$.progressPercent": progressPercent } },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Not found or Forbidden" }, { status: 404 });
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/tester/tasks/[id]/progress]", err);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}
