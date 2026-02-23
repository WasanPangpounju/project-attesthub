import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import AuditRequest from "@/models/audit-request"
import User from "@/models/User"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const user = await User.findOne({ clerkUserId: userId }).lean()
    if (!user || user.role !== "customer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status")

    const filter: Record<string, string> = { customerId: userId }
    if (statusFilter) filter.status = statusFilter

    const requests = await AuditRequest.find(filter).sort({ createdAt: -1 }).lean()

    return NextResponse.json({ data: requests }, { status: 200 })
  } catch (err) {
    console.error("[GET /api/audit-requests]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const user = await User.findOne({ clerkUserId: userId }).lean()
    if (!user || user.role !== "customer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const {
      projectName,
      serviceCategory,
      targetUrl,
      locationAddress,
      accessibilityStandard,
      servicePackage,
      devices,
      specialInstructions,
      files,
    } = body

    if (!projectName || !serviceCategory || !accessibilityStandard || !servicePackage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const newRequest = await AuditRequest.create({
      customerId: userId,
      projectName,
      serviceCategory,
      targetUrl: targetUrl ?? "",
      locationAddress: locationAddress ?? "",
      accessibilityStandard,
      servicePackage,
      devices: Array.isArray(devices) ? devices : [],
      specialInstructions: specialInstructions ?? "",
      files:
        Array.isArray(files) && files.every((f: unknown) => f && typeof (f as Record<string, unknown>).name === "string")
          ? files
          : [],
      priceAmount: 0,
      priceCurrency: "THB",
    })

    return NextResponse.json({ message: "Audit request created", data: newRequest }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/audit-requests]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
