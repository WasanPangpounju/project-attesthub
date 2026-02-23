import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import AuditRequest from "@/models/audit-request";

export const runtime = "nodejs";

async function requireTester(userId: string | null) {
  if (!userId) return null;
  const user = await User.findOne({ clerkUserId: userId }).lean();
  if (!user || user.role !== "tester") return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const user = await requireTester(userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    const query: Record<string, unknown> = {
      "assignedTesters.testerId": userId,
    };

    if (search) {
      query.projectName = { $regex: search, $options: "i" };
    }

    let items = await AuditRequest.find(query).sort({ createdAt: -1 }).lean();

    if (statusFilter) {
      items = items.filter((item) =>
        item.assignedTesters.some(
          (t) => t.testerId === userId && t.workStatus === statusFilter
        )
      );
    }

    const data = items.map((item) => ({
      ...item,
      myTesterEntry: item.assignedTesters.find((t) => t.testerId === userId),
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/tester/tasks]", err);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}
