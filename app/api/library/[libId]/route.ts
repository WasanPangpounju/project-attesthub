import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import TestCaseLibrary from "@/models/TestCaseLibrary";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ libId: string }> };

async function requireAdminOrTester(userId: string | null) {
  if (!userId) return null;
  const user = await User.findOne({ clerkUserId: userId }).lean();
  if (!user || (user.role !== "admin" && user.role !== "tester")) return null;
  return user;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const user = await requireAdminOrTester(userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { libId } = await params;

    const item = await TestCaseLibrary.findOne({ libId, isActive: true }).lean();
    if (!item) {
      return NextResponse.json({ error: "Library entry not found" }, { status: 404 });
    }

    return NextResponse.json({ data: item }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/library/[libId]]", err);
    return NextResponse.json({ error: "Failed to fetch library entry" }, { status: 500 });
  }
}
