import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import TestCaseLibrary from "@/models/TestCaseLibrary";

export const runtime = "nodejs";

async function requireAdminOrTester(userId: string | null) {
  if (!userId) return null;
  const user = await User.findOne({ clerkUserId: userId }).lean();
  if (!user || (user.role !== "admin" && user.role !== "tester")) return null;
  return user;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const user = await requireAdminOrTester(userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const principle = searchParams.get("principle") || "";
    const wcagLevel = searchParams.get("wcagLevel") || "";
    const disabilityType = searchParams.get("disabilityType") || "";
    const isActiveParam = searchParams.get("isActive");

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20)
    );

    const filter: Record<string, unknown> = {
      isActive: isActiveParam === null ? true : isActiveParam !== "false",
    };

    if (principle) filter.wcagPrinciple = principle;
    if (wcagLevel) filter.wcagLevel = wcagLevel;
    if (disabilityType) filter.disabilityTypes = disabilityType;

    if (search) {
      const re = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [
        { title: re },
        { description: re },
        { wcagCriterion: re },
        { wcagTitle: re },
      ];
    }

    const [data, total] = await Promise.all([
      TestCaseLibrary.find(filter)
        .sort({ libId: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TestCaseLibrary.countDocuments(filter),
    ]);

    return NextResponse.json({ data, total, page, limit }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/library]", err);
    return NextResponse.json({ error: "Failed to fetch library" }, { status: 500 });
  }
}
