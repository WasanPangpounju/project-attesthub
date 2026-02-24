import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"
import AuditRequest from "@/models/audit-request"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ projectId: string }> }

async function requireAccess(userId: string, projectId: string) {
  const user = await User.findOne({ clerkUserId: userId }).lean()
  const project = await AuditRequest.findById(projectId).lean()
  if (!project) return null
  const allowed = user?.role === "admin" || project.customerId === userId
  return allowed ? { user, project } : null
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const { projectId } = await params
    const ctx = await requireAccess(userId, projectId)
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const token = crypto.randomBytes(32).toString("hex")
    await AuditRequest.findByIdAndUpdate(projectId, {
      shareToken: token,
      shareTokenExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    })

    return NextResponse.json({
      data: { token, shareUrl: `/reports/shared/${token}` },
    }, { status: 200 })
  } catch (err) {
    console.error("[POST /api/reports/[projectId]/share]", err)
    return NextResponse.json({ error: "Failed to generate share token" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const { projectId } = await params
    const ctx = await requireAccess(userId, projectId)
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    await AuditRequest.findByIdAndUpdate(projectId, {
      $unset: { shareToken: "", shareTokenExpiry: "" },
    })

    return NextResponse.json({ data: { revoked: true } }, { status: 200 })
  } catch (err) {
    console.error("[DELETE /api/reports/[projectId]/share]", err)
    return NextResponse.json({ error: "Failed to revoke share token" }, { status: 500 })
  }
}
