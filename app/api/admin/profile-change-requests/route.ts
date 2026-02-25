import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"
import ProfileChangeRequest from "@/models/profile-change-request"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const admin = await User.findOne({ clerkUserId: userId }).lean()
    if (admin?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const role = searchParams.get("role")

    const filter: Record<string, unknown> = {}
    if (status) filter.status = status
    if (role) filter.userRole = role

    const requests = await ProfileChangeRequest.find(filter)
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      data: requests.map((r) => ({
        _id: String(r._id),
        userId: r.userId,
        userEmail: r.userEmail,
        userRole: r.userRole,
        userName: r.userName,
        changes: r.changes,
        status: r.status,
        createdAt: r.createdAt,
      })),
    })
  } catch (err) {
    console.error("[GET /api/admin/profile-change-requests]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
