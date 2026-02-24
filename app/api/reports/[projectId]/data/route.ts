import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"
import AuditRequest from "@/models/audit-request"
import { buildReportData } from "@/lib/report-builder"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ projectId: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const { projectId } = await params

    const user = await User.findOne({ clerkUserId: userId }).lean()
    const request = await AuditRequest.findById(projectId).lean()
    if (!request) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const hasAccess =
      user?.role === "admin" ||
      request.customerId === userId ||
      (request.orgMembers ?? []).includes(userId)

    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const data = await buildReportData(projectId)
    return NextResponse.json({ data }, { status: 200 })
  } catch (err) {
    console.error("[GET /api/reports/[projectId]/data]", err)
    return NextResponse.json({ error: "Failed to generate report data" }, { status: 500 })
  }
}
