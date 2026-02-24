import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"
import AuditRequest from "@/models/audit-request"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string; memberId: string }> }

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const { id, memberId } = await params

    const user = await User.findOne({ clerkUserId: userId }).lean()
    const project = await AuditRequest.findById(id).lean()
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const isAdmin = user?.role === "admin"
    const isOwner = project.customerId === userId
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Cannot remove the owner
    if (memberId === project.customerId) {
      return NextResponse.json({ error: "Cannot remove the project owner" }, { status: 400 })
    }

    await AuditRequest.findByIdAndUpdate(id, { $pull: { orgMembers: memberId } })

    return NextResponse.json({ data: { removed: true } }, { status: 200 })
  } catch (err) {
    console.error("[DELETE /api/customer/projects/[id]/members/[memberId]]", err)
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
  }
}
