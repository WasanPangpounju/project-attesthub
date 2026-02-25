import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"
import ProfileChangeRequest from "@/models/profile-change-request"
import { Types } from "mongoose"

export const runtime = "nodejs"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const admin = await User.findOne({ clerkUserId: userId }).lean()
    if (admin?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { requestId } = await params
    if (!Types.ObjectId.isValid(requestId)) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 })
    }

    const body = await req.json()
    const { action, note } = body as { action: "approve" | "reject"; note?: string }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 })
    }

    const changeReq = await ProfileChangeRequest.findById(requestId)
    if (!changeReq) return NextResponse.json({ error: "Request not found" }, { status: 404 })
    if (changeReq.status !== "pending") {
      return NextResponse.json({ error: "Request is no longer pending" }, { status: 400 })
    }

    if (action === "approve") {
      // Apply changes to user document
      const updatedUser = await User.findOneAndUpdate(
        { clerkUserId: changeReq.userId },
        {
          $set: {
            ...(changeReq.changes as Record<string, unknown>),
            profileStatus: "active",
            updatedAt: new Date(),
          },
        },
        { new: true }
      ).lean()

      if (!updatedUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

      changeReq.status = "approved"
      changeReq.reviewedBy = userId
      changeReq.reviewedAt = new Date()
      await changeReq.save()

      return NextResponse.json({ data: updatedUser })
    } else {
      // Reject: reset profileStatus so user can resubmit
      await User.findOneAndUpdate(
        { clerkUserId: changeReq.userId },
        { $set: { profileStatus: "active", updatedAt: new Date() } }
      )

      changeReq.status = "rejected"
      changeReq.reviewedBy = userId
      changeReq.reviewedAt = new Date()
      if (note) changeReq.note = note
      await changeReq.save()

      return NextResponse.json({ message: "Request rejected" })
    }
  } catch (err) {
    console.error("[PATCH /api/admin/profile-change-requests/[requestId]]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
