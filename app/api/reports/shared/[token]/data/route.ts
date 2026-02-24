import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import AuditRequest from "@/models/audit-request"
import { buildReportData } from "@/lib/report-builder"

export const runtime = "nodejs"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    await connectToDatabase()

    const request = await AuditRequest.findOne({ shareToken: token }).lean()
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Check expiry
    if (request.shareTokenExpiry && new Date() > request.shareTokenExpiry) {
      return NextResponse.json({ error: "This link has expired" }, { status: 410 })
    }

    const data = await buildReportData(request._id.toString())
    return NextResponse.json({ data }, { status: 200 })
  } catch (err) {
    console.error("[GET /api/reports/shared/[token]/data]", err)
    return NextResponse.json({ error: "Failed to load shared report" }, { status: 500 })
  }
}
