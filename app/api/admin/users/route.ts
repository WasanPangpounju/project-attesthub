import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"

export const runtime = "nodejs"

const VALID_ROLES = ["admin", "tester", "customer"] as const
const VALID_STATUSES = ["active", "suspended"] as const

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  await connectToDatabase()
  const caller = await User.findOne({ clerkUserId: userId }).lean<{ role?: string }>()
  if (caller?.role !== "admin") return null
  return userId
}

export async function GET(req: NextRequest) {
  try {
    const adminId = await requireAdmin()
    if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")?.trim() || ""
    const role = searchParams.get("role") || ""
    const status = searchParams.get("status") || ""
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)))
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = {}
    const andConditions: Record<string, unknown>[] = []

    if (search) {
      const regex = new RegExp(search, "i")
      andConditions.push({ $or: [{ email: regex }, { firstName: regex }, { lastName: regex }] })
    }

    if (role === "unassigned") {
      filter.roleAssigned = false
    } else if (role && (VALID_ROLES as readonly string[]).includes(role)) {
      filter.role = role
      filter.roleAssigned = true
    }

    if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
      filter.status = status
    }

    const profileStatus = searchParams.get("profileStatus") || ""
    if (profileStatus === "pending_approval") {
      // "Pending Approval" covers two distinct cases: users awaiting a profile
      // change approval, and users who signed up but have no role assigned yet.
      andConditions.push({ $or: [{ profileStatus: "pending_approval" }, { roleAssigned: false }] })
    } else if (profileStatus === "active") {
      filter.profileStatus = "active"
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ])

    const data = users.map((u) => ({
      ...u,
      pendingType:
        u.profileStatus === "pending_approval"
          ? "profile_change"
          : !u.roleAssigned
          ? "unassigned_role"
          : undefined,
    }))

    return NextResponse.json(
      {
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    )
  } catch (err) {
    console.error("[GET /api/admin/users]", err)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminId = await requireAdmin()
    if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await req.json()) as {
      email?: string
      firstName?: string
      lastName?: string
      role?: string
      adminNote?: string
    }

    const { email, firstName, lastName, role, adminNote } = body

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    if (role !== undefined && !(VALID_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json(
        { error: `role must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      )
    }

    const existing = await User.findOne({ email })
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      )
    }

    const newUser = await User.create({
      clerkUserId: `pre_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email,
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      role: role || undefined,
      roleAssigned: role ? true : false,
      status: "active",
      adminNote: adminNote ?? "",
      isPreRegistered: true,
    })

    return NextResponse.json({ data: newUser }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/users]", err)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminId = await requireAdmin()
    if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await req.json()) as {
      clerkUserId?: string
      role?: string
      status?: string
      firstName?: string
      lastName?: string
      adminNote?: string
    }

    const { clerkUserId, role, status, firstName, lastName, adminNote } = body

    if (!clerkUserId) {
      return NextResponse.json({ error: "clerkUserId is required" }, { status: 400 })
    }

    if (role !== undefined && !(VALID_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json(
        { error: `role must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      )
    }

    if (status !== undefined && !(VALID_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      )
    }

    const updateFields: Record<string, unknown> = { updatedAt: new Date() }

    if (role !== undefined) {
      updateFields.role = role
      updateFields.roleAssigned = true
    }
    if (status !== undefined) updateFields.status = status
    if (firstName !== undefined) updateFields.firstName = firstName
    if (lastName !== undefined) updateFields.lastName = lastName
    if (adminNote !== undefined) updateFields.adminNote = adminNote

    const updated = await User.findOneAndUpdate(
      { clerkUserId },
      { $set: updateFields },
      { new: true }
    ).lean()

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (err) {
    console.error("[PATCH /api/admin/users]", err)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminId = await requireAdmin()
    if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await req.json()) as { clerkUserId?: string }
    const { clerkUserId } = body

    if (!clerkUserId) {
      return NextResponse.json({ error: "clerkUserId is required" }, { status: 400 })
    }

    const deleted = await User.findOneAndDelete({ clerkUserId }).lean()

    if (!deleted) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(
      { success: true, message: "User removed from platform. Clerk account is preserved." },
      { status: 200 }
    )
  } catch (err) {
    console.error("[DELETE /api/admin/users]", err)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
