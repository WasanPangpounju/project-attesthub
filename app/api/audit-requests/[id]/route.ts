import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import AuditRequest from "@/models/audit-request"
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

    const request = await AuditRequest.findById(id).lean()
    if (!request) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    if (request.customerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    return NextResponse.json({ data: request }, { status: 200 })
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
