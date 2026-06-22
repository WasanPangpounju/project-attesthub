import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import AuditRequest from "@/models/audit-request"
import User from "@/models/User"
import { Types } from "mongoose"

export const runtime = "nodejs"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const { id } = await params
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
    }

    const [request, user] = await Promise.all([
      AuditRequest.findById(id).lean(),
      User.findOne({ clerkUserId: userId }).lean(),
    ])
    if (!request) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const hasAccess =
      user?.role === "admin" ||
      request.customerId === userId ||
      (request.orgMembers ?? []).includes(userId)
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const userIds = new Set<string>([request.customerId])
    for (const t of request.assignedTesters ?? []) userIds.add(t.testerId)

    const users = await User.find(
      { clerkUserId: { $in: [...userIds] } },
      { clerkUserId: 1, firstName: 1, lastName: 1, email: 1 }
    ).lean()

    const userMap = new Map(users.map((u) => [u.clerkUserId, u]))
    const nameOf = (id: string) => {
      const u = userMap.get(id)
      if (!u) return id
      return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || id
    }

    const data = {
      ...request,
      customerName: nameOf(request.customerId),
      assignedTesters: (request.assignedTesters ?? []).map((t: { testerId: string }) => ({
        ...t,
        testerName: nameOf(t.testerId),
      })),
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (err) {
    console.error("[GET /api/audit-requests/[id]]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const { id } = await params
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
    }

    const request = await AuditRequest.findById(id).lean()
    if (!request) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    if (request.customerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "Cannot delete a project that is already in progress" },
        { status: 400 }
      )
    }

    await AuditRequest.findByIdAndDelete(id)
    return NextResponse.json({ message: "Project deleted" }, { status: 200 })
  } catch (err) {
    console.error("[DELETE /api/audit-requests/[id]]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
