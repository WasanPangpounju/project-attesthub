import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"
import AuditRequest from "@/models/audit-request"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

async function requireOwnerOrAdmin(userId: string, projectId: string) {
  await connectToDatabase()
  const user = await User.findOne({ clerkUserId: userId }).lean()
  if (user?.role === "admin") return { user, project: await AuditRequest.findById(projectId).lean() }
  const project = await AuditRequest.findById(projectId).lean()
  if (!project || project.customerId !== userId) return null
  return { user, project }
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const ctx = await requireOwnerOrAdmin(userId, id)
    if (!ctx?.project) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const project = ctx.project
    const memberIds = project.orgMembers ?? []

    const memberUsers = await User.find({ clerkUserId: { $in: memberIds } }).lean()
    const memberMap: Record<string, typeof memberUsers[0]> = {}
    for (const u of memberUsers) memberMap[u.clerkUserId] = u

    const members = memberIds.map((cid) => {
      const u = memberMap[cid]
      return {
        clerkUserId: cid,
        email: u?.email ?? "",
        firstName: u?.firstName,
        lastName: u?.lastName,
      }
    })

    return NextResponse.json({ data: members }, { status: 200 })
  } catch (err) {
    console.error("[GET /api/customer/projects/[id]/members]", err)
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const ctx = await requireOwnerOrAdmin(userId, id)
    if (!ctx?.project) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = (await req.json()) as { email?: string }
    const email = body.email?.trim().toLowerCase()
    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 })

    // Find user by email
    const targetUser = await User.findOne({ email }).lean()
    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found. They must have an AttestHub account first." },
        { status: 404 }
      )
    }

    const project = ctx.project
    const orgMembers = project.orgMembers ?? []

    if (orgMembers.includes(targetUser.clerkUserId)) {
      return NextResponse.json({ error: "Already a member" }, { status: 400 })
    }
    if (targetUser.clerkUserId === project.customerId) {
      return NextResponse.json({ error: "Already the project owner" }, { status: 400 })
    }

    const updated = await AuditRequest.findByIdAndUpdate(
      id,
      { $push: { orgMembers: targetUser.clerkUserId } },
      { new: true }
    ).lean()

    const newMemberIds = updated?.orgMembers ?? []
    const memberUsers = await User.find({ clerkUserId: { $in: newMemberIds } }).lean()
    const memberMap: Record<string, typeof memberUsers[0]> = {}
    for (const u of memberUsers) memberMap[u.clerkUserId] = u

    const members = newMemberIds.map((cid) => {
      const u = memberMap[cid]
      return {
        clerkUserId: cid,
        email: u?.email ?? "",
        firstName: u?.firstName,
        lastName: u?.lastName,
      }
    })

    return NextResponse.json({ data: members }, { status: 200 })
  } catch (err) {
    console.error("[POST /api/customer/projects/[id]/members]", err)
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 })
  }
}
