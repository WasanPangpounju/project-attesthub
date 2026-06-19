import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"
import ProfileChangeRequest from "@/models/profile-change-request"

export const runtime = "nodejs"

const EDITABLE_FIELDS = [
  "firstName",
  "lastName",
  "jobTitle",
  "phone",
  "bio",
  "organization",
  "testerProfile",
  "adminProfile",
  "notes",
  "isActive",
] as const

function pickEditableFields(body: Record<string, unknown>) {
  const result: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) result[field] = body[field]
  }
  return result
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: adminId } = await auth()
    if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const admin = await User.findOne({ clerkUserId: adminId }).lean()
    if (admin?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { userId } = await params

    const user = await User.findOne({ clerkUserId: userId }).lean()
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const pendingRequest = await ProfileChangeRequest.findOne({
      userId,
      status: "pending",
    }).lean()

    return NextResponse.json({
      data: {
        user,
        pendingRequest: pendingRequest
          ? {
              _id: String(pendingRequest._id),
              changes: pendingRequest.changes,
              createdAt: pendingRequest.createdAt,
            }
          : undefined,
      },
    })
  } catch (err) {
    console.error("[GET /api/admin/users/[userId]/profile]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: adminId } = await auth()
    if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const admin = await User.findOne({ clerkUserId: adminId }).lean()
    if (admin?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { userId } = await params
    const body = await req.json()

    const editableFields = pickEditableFields(body as Record<string, unknown>)

    const updatedUser = await User.findOneAndUpdate(
      { clerkUserId: userId },
      { $set: { ...editableFields, updatedAt: new Date() } },
      { new: true }
    ).lean()

    if (!updatedUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

    return NextResponse.json({ data: updatedUser })
  } catch (err) {
    console.error("[PUT /api/admin/users/[userId]/profile]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
