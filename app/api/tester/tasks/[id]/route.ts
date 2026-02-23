import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import AuditRequest, { TesterWorkStatus } from "@/models/audit-request";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function requireTester(userId: string | null) {
  if (!userId) return null;
  const user = await User.findOne({ clerkUserId: userId }).lean();
  if (!user || user.role !== "tester") return null;
  return user;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const user = await requireTester(userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const item = await AuditRequest.findById(id).lean();

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const testerEntry = item.assignedTesters.find((t) => t.testerId === userId);
    if (!testerEntry) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data: { ...item, myTesterEntry: testerEntry } }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/tester/tasks/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

type WorkAction = "accept" | "reject" | "start" | "done";

const TRANSITIONS: Record<WorkAction, { from: TesterWorkStatus; to: TesterWorkStatus }> = {
  accept: { from: "assigned", to: "accepted" },
  reject: { from: "assigned", to: "removed" },
  start: { from: "accepted", to: "working" },
  done: { from: "working", to: "done" },
};

const VALID_ACTIONS: WorkAction[] = ["accept", "reject", "start", "done"];

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const user = await requireTester(userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = (await req.json()) as { action?: string };
    const { action } = body;

    if (!action || !VALID_ACTIONS.includes(action as WorkAction)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    const workAction = action as WorkAction;
    const { from, to } = TRANSITIONS[workAction];

    const item = await AuditRequest.findById(id);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const testerEntry = item.assignedTesters.find((t) => t.testerId === userId);
    if (!testerEntry) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (testerEntry.workStatus !== from) {
      return NextResponse.json(
        {
          error: `Invalid transition: current status is "${testerEntry.workStatus}", expected "${from}" to perform "${action}"`,
        },
        { status: 400 }
      );
    }

    testerEntry.workStatus = to;
    if (workAction === "accept") testerEntry.acceptedAt = new Date();
    if (workAction === "reject") testerEntry.note = "Rejected by tester";
    if (workAction === "done") testerEntry.completedAt = new Date();

    await item.save();

    return NextResponse.json({ data: item }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/tester/tasks/[id]]", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
