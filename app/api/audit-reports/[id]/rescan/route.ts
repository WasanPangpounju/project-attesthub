import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import AuditReport from "@/models/AuditReport"
import ProjectSitemap from "@/models/ProjectSitemap"
import User from "@/models/User"
import { scanQueue, type AuditScanJobData } from "@/lib/queue/scanQueue"

export const runtime = "nodejs"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    await connectToDatabase()

    const user = await User.findOne({ clerkUserId: userId }).lean()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const report = await AuditReport.findById(id).lean() as any
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (report.status === "scanning") {
      return NextResponse.json({ error: "Report is already scanning" }, { status: 409 })
    }

    const sitemap = await ProjectSitemap.findOne(
      { auditRequestId: report.auditRequestId, "urls.auditReportId": id },
      { "urls.$": 1 }
    ).lean() as any
    const sitemapUrlId = sitemap?.urls?.[0]?._id?.toString() ?? ""
    const normalizedUrl = report.url.startsWith("http") ? report.url : `https://${report.url}`

    await AuditReport.findByIdAndUpdate(id, {
      $set: {
        status: "pending",
        score: 0,
        summary: { passed: 0, failed: 0, warnings: 0, total: 0 },
        issues: [],
        pagesScanned: 0,
        scanDurationMs: 0,
        generatedAt: new Date(),
        url: normalizedUrl,
      },
      $unset: {
        aiSummary: 1,
        aiSummaryError: 1,
        errorMessage: 1,
        completedAt: 1,
        jobId: 1,
      },
    })

    const jobData: AuditScanJobData = {
      type: "sitemap_url",
      auditRequestId: report.auditRequestId,
      sitemapUrlId,
      url: normalizedUrl,
      reportId: id,
    }
    const job = await scanQueue.add("sitemap_url_scan", jobData)

    await AuditReport.findByIdAndUpdate(id, { jobId: job.id })

    return NextResponse.json({ success: true, jobId: job.id }, { status: 200 })
  } catch (err) {
    console.error("[POST /api/audit-reports/[id]/rescan]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
