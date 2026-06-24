import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import AuditReport from "@/models/AuditReport"
import AuditRequest from "@/models/audit-request"
import ProjectSitemap from "@/models/ProjectSitemap"
import User from "@/models/User"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    await connectToDatabase()

    const user = await User.findOne({ clerkUserId: userId })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const r = await AuditReport.findById(id).lean() as any
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const role = user.role

    if (role === "customer") {
      const owned = await AuditRequest.findOne(
        { _id: r.auditRequestId, customerId: userId },
        { _id: 1 }
      ).lean()
      if (!owned) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (role === "tester") {
      const assigned = await AuditRequest.findOne(
        { _id: r.auditRequestId, "assignedTesters.testerId": userId },
        { _id: 1 }
      ).lean()
      if (!assigned) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const report = {
      id: r._id.toString(),
      auditRequestId: r.auditRequestId,
      projectName: r.projectName,
      url: r.url,
      scanType: r.scanScope ?? "single",
      status: r.status,
      score: r.score,
      wcagLevel: r.wcagLevel,
      summary: r.summary,
      issues: r.issues ?? [],
      pagesScanned: r.pagesScanned ?? 0,
      scanDurationMs: r.scanDurationMs ?? 0,
      errorMessage: r.errorMessage,
      generatedAt: r.generatedAt?.toISOString() ?? new Date().toISOString(),
      requestedBy: r.requestedBy,
    }

    return NextResponse.json({ report }, { status: 200 })
  } catch (err) {
    console.error("[GET /api/audit-reports/[id]]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
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

    const report = await AuditReport.findByIdAndDelete(id).lean()
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await ProjectSitemap.updateOne(
      { "urls.auditReportId": id },
      { $unset: { "urls.$.auditReportId": 1, "urls.$.lastScanAt": 1 } }
    )

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error("[DELETE /api/audit-reports/[id]]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
