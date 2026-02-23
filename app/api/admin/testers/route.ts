import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";

async function requireAdmin(userId: string | null) {
  if (!userId) return null;
  const user = await User.findOne({ clerkUserId: userId }).lean();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET() {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const admin = await requireAdmin(userId);
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const testers = await User.find({ role: "tester", status: "active" })
      .select("clerkUserId firstName lastName email")
      .lean();

    return NextResponse.json({ data: testers }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/admin/testers]", err);
    return NextResponse.json({ error: "Failed to fetch testers" }, { status: 500 });
  }
}
