import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import AuditRequest, { AssignedTester } from "@/models/audit-request";
import ProjectSitemap, { ISitemapUrl } from "@/models/ProjectSitemap";
import AuditReport, { IAuditReport } from "@/models/AuditReport";

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
  if (!auditRequest) return { user, auditRequest: null, canView: false };

  const isAdmin = user?.role === "admin";
  const isOwner = auditRequest.customerId === userId;
  const isOrgMember = (auditRequest.orgMembers ?? []).includes(userId);
  const isAssignedTester = (auditRequest.assignedTesters ?? []).some(
    (t: AssignedTester) => t.testerId === userId && t.workStatus !== "removed"
  );

  return {
    user,
    auditRequest,
    canView: isAdmin || isOwner || isOrgMember || isAssignedTester,
  };
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
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

    const reportIds = sitemap.urls
      .map((u: ISitemapUrl) => u.auditReportId)
      .filter((rid: string | undefined): rid is string => !!rid);

    const reportDocs = reportIds.length
      ? await AuditReport.find({ _id: { $in: reportIds } }).lean()
      : [];
    const reportMap = new Map(
      (reportDocs as IAuditReport[]).map((r) => [r._id.toString(), r])
    );

    const urls = sitemap.urls.map((u: ISitemapUrl) => ({
      ...u,
      addedByName: userMap.get(u.addedBy) ?? u.addedBy,
      report: (u.auditReportId && reportMap.get(u.auditReportId)) ?? null,
    }));

    const completedReports = (reportDocs as IAuditReport[]).filter((r) => r.status === "completed");

    let criticalCount = 0;
    let seriousCount = 0;
    let moderateCount = 0;
    let minorCount = 0;
    let totalIssues = 0;
    for (const r of completedReports) {
      for (const issue of r.issues ?? []) {
        totalIssues++;
        if (issue.severity === "critical") criticalCount++;
        else if (issue.severity === "serious") seriousCount++;
        else if (issue.severity === "moderate") moderateCount++;
        else if (issue.severity === "minor") minorCount++;
      }
    }

    const avgScore = completedReports.length
      ? Math.round(
          completedReports.reduce((sum, r) => sum + (r.score ?? 0), 0) / completedReports.length
        )
      : 0;

    const summary = {
      totalUrls: sitemap.urls.length,
      scannedUrls: reportDocs.length,
      avgScore,
      totalIssues,
      criticalCount,
      seriousCount,
      moderateCount,
      minorCount,
      wcagPassCount: completedReports.filter((r) => (r.score ?? 0) >= 70).length,
      wcagFailCount: completedReports.filter((r) => (r.score ?? 0) < 70).length,
    };

    return NextResponse.json(
      { data: { auditRequestId: id, urls, summary } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/audit-requests/[id]/sitemap/reports]", err);
    return NextResponse.json({ error: "Failed to fetch sitemap reports" }, { status: 500 });
  }
}
