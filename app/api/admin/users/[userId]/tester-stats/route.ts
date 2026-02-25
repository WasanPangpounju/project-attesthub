import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"
import Scenario from "@/models/scenario"

export const runtime = "nodejs"

export async function POST(
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

    const user = await User.findOne({ clerkUserId: userId })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (user.role !== "tester") {
      return NextResponse.json({ error: "User is not a tester" }, { status: 400 })
    }

    // Count distinct audit requests where this tester was assigned
    const auditRequestIds = await Scenario.distinct("auditRequestId", {
      assignedTesterId: userId,
    })
    const totalProjects = auditRequestIds.length

    user.testerProfile = {
      ...(user.testerProfile ?? {}),
      disabilityTypes: user.testerProfile?.disabilityTypes ?? [],
      wcagKnowledge: user.testerProfile?.wcagKnowledge ?? [],
      screenReaders: user.testerProfile?.screenReaders ?? [],
      devices: user.testerProfile?.devices ?? [],
      languages: user.testerProfile?.languages ?? [],
      totalProjects,
    }
    user.updatedAt = new Date()
    await user.save()

    return NextResponse.json({ data: { totalProjects } })
  } catch (err) {
    console.error("[POST /api/admin/users/[userId]/tester-stats]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
