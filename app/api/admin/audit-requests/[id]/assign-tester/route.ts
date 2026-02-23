import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import AuditRequest, { TesterRole } from "@/models/audit-request";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function requireAdmin(userId: string | null) {
  if (!userId) return null;
  const user = await User.findOne({ clerkUserId: userId }).lean();
  if (!user || user.role !== "admin") return null;
  return user;
}

const VALID_ROLES: TesterRole[] = ["lead", "member", "reviewer"];

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = (await req.json()) as { testerId?: string; role?: string; note?: string };
    const { testerId, role, note } = body;

    if (!testerId || !role) {
      return NextResponse.json({ error: "testerId and role are required" }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role as TesterRole)) {
      return NextResponse.json(
        { error: `role must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify testerId exists and is a tester
    const testerUser = await User.findOne({ clerkUserId: testerId, role: "tester" }).lean();
    if (!testerUser) {
      return NextResponse.json(
        { error: "Tester not found or user is not a tester" },
        { status: 404 }
      );
    }

    const item = await AuditRequest.findById(id);
    if (!item) {
      return NextResponse.json({ error: "Audit request not found" }, { status: 404 });
    }

    // Double-check for duplicates (active assignment only)
    const alreadyAssigned = item.assignedTesters.some(
      (t) => t.testerId === testerId && t.workStatus !== "removed"
    );
    if (alreadyAssigned) {
      return NextResponse.json(
        { error: "This tester is already assigned to this project" },
        { status: 409 }
      );
    }

    item.assignedTesters.push({
      testerId,
      role: role as TesterRole,
      workStatus: "assigned",
      assignedAt: new Date(),
      assignedBy: userId as string,
      note: note ?? "",
    });

    // Auto-open project if still pending
    if (item.status === "pending") {
      item.statusHistory.push({
        from: "pending",
        to: "open",
        changedAt: new Date(),
        changedBy: userId as string,
        note: "Auto-opened when first tester assigned",
      });
      item.status = "open";
    }

    await item.save();

    return NextResponse.json({ data: item }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/admin/audit-requests/[id]/assign-tester]", err);
    return NextResponse.json({ error: "Failed to assign tester" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = (await req.json()) as { testerId?: string };
    const { testerId } = body;

    if (!testerId) {
      return NextResponse.json({ error: "testerId is required" }, { status: 400 });
    }

    const updated = await AuditRequest.findOneAndUpdate(
      { _id: id, "assignedTesters.testerId": testerId },
      { $set: { "assignedTesters.$.workStatus": "removed" } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Audit request not found or tester not assigned" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/admin/audit-requests/[id]/assign-tester]", err);
    return NextResponse.json({ error: "Failed to remove tester" }, { status: 500 });
  }
}
