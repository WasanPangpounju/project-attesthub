import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import AuditRequest from "@/models/audit-request";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function requireTesterOrAdmin(userId: string | null) {
  if (!userId) return null;
  const user = await User.findOne({ clerkUserId: userId }).lean();
  if (!user || !user.role || !["tester", "admin"].includes(user.role)) return null;
  return user;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const user = await requireTesterOrAdmin(userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const item = await AuditRequest.findById(id).lean();

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (user.role === "tester") {
      const isAssigned = item.assignedTesters.some((t) => t.testerId === userId);
      if (!isAssigned) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ data: item.comments ?? [] }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/tester/tasks/[id]/comments]", err);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    const user = await requireTesterOrAdmin(userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = (await req.json()) as { text?: string; authorId?: string; authorName?: string };
    const { text, authorId, authorName } = body;

    if (!text || !authorId || !authorName) {
      return NextResponse.json(
        { error: "text, authorId, and authorName are required" },
        { status: 400 }
      );
    }

    const item = await AuditRequest.findById(id);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (user.role === "tester") {
      const isAssigned = item.assignedTesters.some((t) => t.testerId === userId);
      if (!isAssigned) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    item.comments.push({ authorId, authorName, text, createdAt: new Date() });
    await item.save();

    const savedComment = item.comments[item.comments.length - 1];
    return NextResponse.json({ data: savedComment }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tester/tasks/[id]/comments]", err);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
