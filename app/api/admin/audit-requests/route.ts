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
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[GET /api/admin/audit-requests]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
