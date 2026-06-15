import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"
import ProfileChangeRequest from "@/models/profile-change-request"

export const runtime = "nodejs"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const clerkUser = await currentUser()
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? ""

    await connectToDatabase()

    let user = await User.findOne({ clerkUserId: userId }).lean()

    // Merge pre-registered record if needed
    if (!user && email) {
      const preReg = await User.findOne({ email })
      if (preReg) {
        preReg.clerkUserId = userId
        preReg.isPreRegistered = false
        if (!preReg.firstName && clerkUser?.firstName) preReg.firstName = clerkUser.firstName
        if (!preReg.lastName && clerkUser?.lastName) preReg.lastName = clerkUser.lastName
        preReg.updatedAt = new Date()
        await preReg.save()
        user = preReg.toObject()
      }
    }

    if (!user) {
      const created = await User.create({
        clerkUserId: userId,
        email,
        firstName: clerkUser?.firstName ?? "",
        lastName: clerkUser?.lastName ?? "",
        roleAssigned: false,
        status: "active",
        isPreRegistered: false,
        profileStatus: "active",
      })
      user = created.toObject()
    }

    // Fetch pending change request if any
    const pendingRequest = await ProfileChangeRequest.findOne({
      userId,
      status: "pending",
    }).lean()

    // Build response — exclude totalEarnings from user-facing response
    const testerProfile = user.testerProfile
      ? {
          disabilityTypes: user.testerProfile.disabilityTypes ?? [],
          wcagKnowledge: user.testerProfile.wcagKnowledge ?? [],
          screenReaders: user.testerProfile.screenReaders ?? [],
          devices: user.testerProfile.devices ?? [],
          languages: user.testerProfile.languages ?? [],
          bio: user.testerProfile.bio,
          yearsExperience: user.testerProfile.yearsExperience,
          totalProjects: user.testerProfile.totalProjects ?? 0,
        }
      : undefined

    return NextResponse.json({
      data: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        jobTitle: user.jobTitle,
        phone: user.phone,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        profileStatus: user.profileStatus ?? "active",
        organization: user.organization,
        contractFiles: (user.contractFiles ?? []).map((f) => ({
          name: f.name,
          url: f.url,
          publicId: f.publicId,
          uploadedAt: f.uploadedAt,
        })),
        testerProfile,
        preferredLanguage: user.preferredLanguage ?? "en",
        adminProfile: user.adminProfile,
        pendingChangeRequest: pendingRequest
          ? {
              _id: String(pendingRequest._id),
              changes: pendingRequest.changes,
              createdAt: pendingRequest.createdAt,
            }
          : undefined,
      },
    })
  } catch (err) {
    console.error("[GET /api/profile]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { preferredLanguage } = body

    if (!preferredLanguage || !["en", "th"].includes(preferredLanguage)) {
      return NextResponse.json({ error: "Invalid preferredLanguage. Must be 'en' or 'th'" }, { status: 400 })
    }

    await connectToDatabase()

    const user = await User.findOne({ clerkUserId: userId })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    user.preferredLanguage = preferredLanguage
    user.updatedAt = new Date()
    await user.save()

    return NextResponse.json({ data: { preferredLanguage: user.preferredLanguage } })
  } catch (err) {
    console.error("[PATCH /api/profile]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Fields any role may submit
const SHARED_FIELDS = ["firstName", "lastName", "jobTitle", "phone", "bio"] as const

// Sub-fields of testerProfile a tester may self-edit (excludes admin-managed
// totalProjects/totalEarnings)
const TESTER_PROFILE_FIELDS = [
  "disabilityTypes",
  "wcagKnowledge",
  "screenReaders",
  "devices",
  "languages",
  "bio",
  "yearsExperience",
] as const

function pick<T extends Record<string, unknown>>(obj: T, keys: readonly string[]) {
  const result: Record<string, unknown> = {}
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) result[key] = obj[key]
  }
  return result
}

// Filter the incoming payload down to the fields the user's role is allowed
// to change, dropping any cross-role fields (e.g. testerProfile from a
// customer, organization from a tester).
export function filterChangesByRole(body: Record<string, unknown>, role?: string | null) {
  const changes = pick(body, SHARED_FIELDS)

  if (role === "customer" && body.organization && typeof body.organization === "object") {
    changes.organization = body.organization
  }

  if (role === "tester" && body.testerProfile && typeof body.testerProfile === "object") {
    changes.testerProfile = pick(body.testerProfile as Record<string, unknown>, TESTER_PROFILE_FIELDS)
  }

  if (role === "admin" && body.adminProfile && typeof body.adminProfile === "object") {
    changes.adminProfile = body.adminProfile
  }

  return changes
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()

    await connectToDatabase()

    const user = await User.findOne({ clerkUserId: userId })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    // Validate firstName/lastName if provided
    if (body.firstName !== undefined && typeof body.firstName === "string" && !body.firstName.trim()) {
      return NextResponse.json({ error: "First name cannot be empty" }, { status: 400 })
    }
    if (body.lastName !== undefined && typeof body.lastName === "string" && !body.lastName.trim()) {
      return NextResponse.json({ error: "Last name cannot be empty" }, { status: 400 })
    }

    const changes = filterChangesByRole(body, user.role)

    const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || userId

    // Update existing pending request or create a new one
    const existing = await ProfileChangeRequest.findOne({ userId, status: "pending" })

    if (existing) {
      existing.changes = changes
      existing.updatedAt = new Date()
      await existing.save()
    } else {
      await ProfileChangeRequest.create({
        userId,
        userEmail: user.email ?? "",
        userRole: user.role ?? "unknown",
        userName,
        changes,
        status: "pending",
      })
    }

    // Set profileStatus to pending_approval
    user.profileStatus = "pending_approval"
    user.updatedAt = new Date()
    await user.save()

    const updatedRequest = await ProfileChangeRequest.findOne({ userId, status: "pending" }).lean()

    return NextResponse.json({
      data: {
        profileStatus: user.profileStatus,
        pendingChangeRequest: updatedRequest
          ? {
              _id: String(updatedRequest._id),
              changes: updatedRequest.changes,
              createdAt: updatedRequest.createdAt,
            }
          : undefined,
      },
    })
  } catch (err) {
    console.error("[PUT /api/profile]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
