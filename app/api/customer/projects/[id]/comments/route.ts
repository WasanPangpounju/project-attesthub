import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import AuditRequest from "@/models/audit-request"
import User from "@/models/User"
import { Types } from "mongoose"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

async function verifyOwner(userId: string, id: string) {
  const request = await AuditRequest.findById(id).lean()
  if (!request) return { error: "Project not found", status: 404 as const, request: null }
  if (request.customerId !== userId) return { error: "Forbidden", status: 403 as const, request: null }
  return { error: null, status: 200 as const, request }
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const { id } = await params
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
    }

    const { error, status, request } = await verifyOwner(userId, id)
    if (error || !request) return NextResponse.json({ error }, { status })

    return NextResponse.json({ data: request.comments ?? [] }, { status: 200 })
  } catch (err) {
    console.error("[GET /api/customer/projects/[id]/comments]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const { id } = await params
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
    }

    const { error, status } = await verifyOwner(userId, id)
    if (error) return NextResponse.json({ error }, { status })

    const body = (await req.json()) as { text?: string }
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 })
    }

    const user = await User.findOne({ clerkUserId: userId }).lean()
    const authorName =
      user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Customer" : "Customer"

    const updated = await AuditRequest.findByIdAndUpdate(
      id,
      {
        $push: {
          comments: {
            authorId: userId,
            authorName,
            text: body.text.trim(),
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).lean()

    const comments = updated?.comments ?? []
    const newComment = comments[comments.length - 1]
    return NextResponse.json({ data: newComment }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/customer/projects/[id]/comments]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
