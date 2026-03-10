import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import AuditRequest from "@/models/audit-request"
import AuditReport from "@/models/AuditReport"
import User from "@/models/User"
import { scanQueue } from "@/lib/queue/scanQueue"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const user = await User.findOne({ clerkUserId: userId }).lean()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { auditRequestId } = body

    if (!auditRequestId) {
      return NextResponse.json({ error: "auditRequestId is required" }, { status: 400 })
    }

    const auditRequest = await AuditRequest.findById(auditRequestId).lean()
    if (!auditRequest) {
      return NextResponse.json({ error: "Audit request not found" }, { status: 404 })
    }

    const report = await AuditReport.create({
      auditRequestId,
      projectName: auditRequest.projectName,
      url: auditRequest.targetUrl,
      scanScope: auditRequest.scanScope ?? "single",
      status: "pending",
      requestedBy: userId,
      generatedAt: new Date(),
    })

    const job = await scanQueue.add(
      "scan",
      { auditRequestId, reportId: report._id.toString() },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      }
    )

    // บันทึก jobId ลงใน report
    await AuditReport.findByIdAndUpdate(report._id, { jobId: job.id })

    return NextResponse.json(
      { reportId: report._id.toString(), jobId: job.id },
      { status: 201 }
    )
  } catch (err) {
    console.error("[POST /api/admin/scan/start]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
