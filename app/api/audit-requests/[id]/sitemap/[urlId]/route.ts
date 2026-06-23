import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import AuditRequest from "@/models/audit-request";
import ProjectSitemap from "@/models/ProjectSitemap";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; urlId: string }> };

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
function isValidObjectId(id: string) {
  return OBJECT_ID_RE.test(id);
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, urlId } = await params;
    if (!isValidObjectId(id) || !isValidObjectId(urlId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const [user, auditRequest] = await Promise.all([
      User.findOne({ clerkUserId: userId }).lean(),
      AuditRequest.findById(id).lean(),
    ]);
    if (!auditRequest) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const canEdit = user?.role === "admin" || auditRequest.customerId === userId;
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const sitemap = await ProjectSitemap.findOneAndUpdate(
      { auditRequestId: id },
      { $pull: { urls: { _id: urlId } } },
      { new: true }
    ).lean();

    if (!sitemap) return NextResponse.json({ error: "Sitemap not found" }, { status: 404 });

    return NextResponse.json({ data: sitemap }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/audit-requests/[id]/sitemap/[urlId]]", err);
    return NextResponse.json({ error: "Failed to delete URL" }, { status: 500 });
  }
}
