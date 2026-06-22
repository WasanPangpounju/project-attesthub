import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import AuditRequest from "@/models/audit-request";
import User from "@/models/User";

export const runtime = "nodejs"

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();

    const user = await User.findOne({ clerkUserId: userId }).lean();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const items = await AuditRequest.find({}).sort({ createdAt: -1 }).lean();

    const userIds = new Set<string>();
    for (const item of items) {
      userIds.add(item.customerId);
      for (const t of item.assignedTesters ?? []) userIds.add(t.testerId);
    }

    const users = await User.find(
      { clerkUserId: { $in: [...userIds] } },
      { clerkUserId: 1, firstName: 1, lastName: 1, email: 1 }
    ).lean();

    const userMap = new Map(users.map((u) => [u.clerkUserId, u]));
    const nameOf = (id: string) => {
      const u = userMap.get(id);
      if (!u) return id;
      return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || id;
    };

    const data = items.map((item) => ({
      ...item,
      customerName: nameOf(item.customerId),
      assignedTesters: (item.assignedTesters ?? []).map((t: { testerId: string }) => ({
        ...t,
        testerName: nameOf(t.testerId),
      })),
    }));

    return NextResponse.json({ items: data });
  } catch (err) {
    console.error("[GET /api/admin/audit-requests]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
