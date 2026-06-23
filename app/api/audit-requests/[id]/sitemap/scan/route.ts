import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import AuditRequest from "@/models/audit-request";
import ProjectSitemap, { ISitemapUrl } from "@/models/ProjectSitemap";
import AuditReport from "@/models/AuditReport";
import { scanQueue, type AuditScanJobData } from "@/lib/queue/scanQueue";
import { isSameDomain } from "@/lib/domain-validator";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
function isValidObjectId(id: string) {
  return OBJECT_ID_RE.test(id);
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

    const [user, auditRequest] = await Promise.all([
      User.findOne({ clerkUserId: userId }).lean(),
      AuditRequest.findById(id).lean(),
    ]);
    if (!auditRequest) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const isAdmin = user?.role === "admin";
    const isOwner = auditRequest.customerId === userId;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sitemap = await ProjectSitemap.findOne({ auditRequestId: id });
    if (!sitemap || sitemap.urls.length === 0) {
      return NextResponse.json({ error: "No URLs in sitemap" }, { status: 400 });
    }

    if (!isAdmin) {
      const invalidUrls = sitemap.urls
        .filter((u: ISitemapUrl) => !isSameDomain(auditRequest.targetUrl, u.url))
        .map((u: ISitemapUrl) => u.url);

      if (invalidUrls.length > 0) {
        const allowedDomain = new URL(auditRequest.targetUrl).hostname.replace(/^www\./, "");
        return NextResponse.json(
          {
            error: "บาง URL ไม่อยู่ใน domain ของโปรเจกต์",
            invalidUrls,
            allowedDomain,
          },
          { status: 400 }
        );
      }
    }

    const reportIds: string[] = [];
    for (const entry of sitemap.urls as ISitemapUrl[]) {
      const report = await AuditReport.create({
        auditRequestId: id,
        url: entry.url,
        projectName: auditRequest.projectName,
        status: "pending",
        scanScope: "single",
        requestedBy: userId,
        generatedAt: new Date(),
      });
      reportIds.push(report._id.toString());

      const jobData: AuditScanJobData = {
        type: "sitemap_url",
        auditRequestId: id,
        sitemapUrlId: entry._id.toString(),
        url: entry.url,
        reportId: report._id.toString(),
      };
      await scanQueue.add("sitemap_url_scan", jobData);
    }

    return NextResponse.json(
      { queued: reportIds.length, reportIds, invalidUrls: [] },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/audit-requests/[id]/sitemap/scan]", err);
    return NextResponse.json({ error: "Failed to start scan" }, { status: 500 });
  }
}
