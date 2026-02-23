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

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const user = await requireTester(userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = (await req.json()) as {
      name?: string;
      size?: number;
      type?: string;
      url?: string;
      testCaseId?: string;
    };
    const { name, size, type, url, testCaseId } = body;

    if (!name || size === undefined || !type) {
      return NextResponse.json(
        { error: "name, size, and type are required" },
        { status: 400 }
      );
    }

    const item = await AuditRequest.findOne({
      _id: id,
      "assignedTesters.testerId": userId,
    });

    if (!item) {
      return NextResponse.json({ error: "Not found or Forbidden" }, { status: 404 });
    }

    item.attachments.push({
      uploadedBy: userId as string,
      name,
      size,
      type,
      url,
      testCaseId,
      uploadedAt: new Date(),
    });
    await item.save();

    const savedAttachment = item.attachments[item.attachments.length - 1];
    return NextResponse.json({ data: savedAttachment }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tester/tasks/[id]/attachments]", err);
    return NextResponse.json({ error: "Failed to save attachment" }, { status: 500 });
  }
}
