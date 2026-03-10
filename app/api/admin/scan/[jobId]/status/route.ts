import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import AuditReport from "@/models/AuditReport"
import User from "@/models/User"
import { scanQueue } from "@/lib/queue/scanQueue"

export const runtime = "nodejs"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const user = await User.findOne({ clerkUserId: userId }).lean()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { jobId } = await params

    const job = await scanQueue.getJob(jobId)
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const state = await job.getState()
    const progress = job.progress

    const report = await AuditReport.findOne({ jobId }).lean()

    return NextResponse.json(
      {
        jobId,
        status: state,
        progress: typeof progress === "number" ? progress : 0,
        reportId: report ? report._id.toString() : null,
        reportStatus: report?.status ?? null,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error("[GET /api/admin/scan/[jobId]/status]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
