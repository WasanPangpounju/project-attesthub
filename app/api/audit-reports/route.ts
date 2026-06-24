import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import AuditReport from "@/models/AuditReport"
import AuditRequest from "@/models/audit-request"
import User from "@/models/User"

export const runtime = "nodejs"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const user = await User.findOne({ clerkUserId: userId })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const role = user.role
    let query: Record<string, any> = {}

    if (role === "customer") {
      const requests = await AuditRequest.find(
        { customerId: userId },
        { _id: 1 }
      ).lean()
      const requestIds = (requests as any[]).map((r) => r._id.toString())
      query = { auditRequestId: { $in: requestIds } }
    } else if (role === "tester") {
      // Find auditRequests where this tester is assigned
      const requests = await AuditRequest.find(
        { "assignedTesters.testerId": userId },
        { _id: 1 }
      ).lean()
      const requestIds = (requests as any[]).map((r) => r._id.toString())
      query = { auditRequestId: { $in: requestIds } }
    } else if (role === "admin") {
      query = {}
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const docs = await AuditReport.find(query).sort({ generatedAt: -1 }).lean()

    const reports = (docs as any[]).map((r) => ({
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
    }))

    return NextResponse.json({ reports }, { status: 200 })
  } catch (err) {
    console.error("[GET /api/audit-reports]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
