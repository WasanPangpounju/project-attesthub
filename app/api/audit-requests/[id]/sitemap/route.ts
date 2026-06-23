import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import AuditRequest, { AssignedTester } from "@/models/audit-request";
import ProjectSitemap, { ISitemapUrl } from "@/models/ProjectSitemap";
import { isSameDomain } from "@/lib/domain-validator";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
function isValidObjectId(id: string) {
  return OBJECT_ID_RE.test(id);
}

async function loadAccess(id: string, userId: string) {
  const [user, auditRequest] = await Promise.all([
    User.findOne({ clerkUserId: userId }).lean(),
    AuditRequest.findById(id).lean(),
  ]);
  if (!auditRequest) return { user, auditRequest: null, canView: false, canEdit: false };

  const isAdmin = user?.role === "admin";
  const isOwner = auditRequest.customerId === userId;
  const isOrgMember = (auditRequest.orgMembers ?? []).includes(userId);
  const isAssignedTester = (auditRequest.assignedTesters ?? []).some(
    (t: AssignedTester) => t.testerId === userId && t.workStatus !== "removed"
  );

  return {
    user,
    auditRequest,
    isAdmin,
    canView: isAdmin || isOwner || isOrgMember || isAssignedTester,
    canEdit: isAdmin || isOwner,
  };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const { auditRequest, canView } = await loadAccess(id, userId);
    if (!auditRequest) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let sitemap = await ProjectSitemap.findOne({ auditRequestId: id }).lean();
    if (!sitemap) {
      const created = await ProjectSitemap.create({ auditRequestId: id, urls: [] });
      sitemap = created.toObject();
    }

    const addedByIds = [...new Set(sitemap.urls.map((u: ISitemapUrl) => u.addedBy))];
    const users = await User.find(
      { clerkUserId: { $in: addedByIds } },
      { clerkUserId: 1, firstName: 1, lastName: 1, email: 1 }
    ).lean();
    const userMap = new Map(
      users.map((u) => [
        u.clerkUserId,
        `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u.clerkUserId,
      ])
    );

    const data = {
      ...sitemap,
      urls: sitemap.urls.map((u: ISitemapUrl) => ({
        ...u,
        addedByName: userMap.get(u.addedBy) ?? u.addedBy,
      })),
    };

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/audit-requests/[id]/sitemap]", err);
    return NextResponse.json({ error: "Failed to fetch sitemap" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const { auditRequest, canEdit, isAdmin } = await loadAccess(id, userId);
    if (!auditRequest) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await req.json()) as { url?: string; label?: string };
    const { url, label } = body;

    if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    if (!isAdmin && !isSameDomain(auditRequest.targetUrl, url)) {
      const targetHost = new URL(auditRequest.targetUrl).hostname.replace(/^www\./, "");
      return NextResponse.json(
        { error: `URL ต้องอยู่ใน domain เดียวกับโปรเจกต์ (${targetHost})` },
        { status: 400 }
      );
    }

    let sitemap = await ProjectSitemap.findOne({ auditRequestId: id });
    if (!sitemap) {
      sitemap = await ProjectSitemap.create({ auditRequestId: id, urls: [] });
    }

    const isDuplicate = sitemap.urls.some((u: ISitemapUrl) => u.url === url);
    if (isDuplicate) {
      return NextResponse.json({ error: "URL already exists in sitemap" }, { status: 409 });
    }

    sitemap.urls.push({
      url,
      label,
      addedBy: userId,
      addedAt: new Date(),
    } as never);

    await sitemap.save();

    return NextResponse.json({ data: sitemap }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/audit-requests/[id]/sitemap]", err);
    return NextResponse.json({ error: "Failed to add URL" }, { status: 500 });
  }
}
