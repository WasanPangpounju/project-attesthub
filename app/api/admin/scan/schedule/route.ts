import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import AuditRequest from "@/models/audit-request"
import User from "@/models/User"

export const runtime = "nodejs"

// regex ตรวจ cron expression แบบ 5-field เช่น "0 2 * * 1"
const CRON_REGEX =
  /^(\*|([0-5]?\d)) (\*|(1?\d|2[0-3])) (\*|([1-2]?\d|3[01])) (\*|(0?[1-9]|1[0-2])) (\*|[0-6])$/

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
    const { auditRequestId, cronExpression } = body

    if (!auditRequestId) {
      return NextResponse.json({ error: "auditRequestId is required" }, { status: 400 })
    }

    if (!cronExpression || !CRON_REGEX.test(cronExpression.trim())) {
      return NextResponse.json(
        { error: 'Invalid cron expression. Expected format: "0 2 * * 1"' },
        { status: 400 }
      )
    }

    const auditRequest = await AuditRequest.findById(auditRequestId)
    if (!auditRequest) {
      return NextResponse.json({ error: "Audit request not found" }, { status: 404 })
    }

    await AuditRequest.findByIdAndUpdate(auditRequestId, {
      scheduleEnabled: true,
      scheduleCron: cronExpression.trim(),
    })

    return NextResponse.json({ message: "Schedule saved" }, { status: 200 })
  } catch (err) {
    console.error("[POST /api/admin/scan/schedule]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
