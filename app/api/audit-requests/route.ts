import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import AuditRequest from "@/models/audit-request"
import { encryptPassword } from "@/lib/crypto"

export const runtime = "nodejs"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const requests = await AuditRequest.find({ customerId: userId }).sort({ createdAt: -1 }).lean()

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

    const body = await req.json()

    if (body.loginCredentials?.password) {
      body.loginCredentials.encryptedPassword = encryptPassword(body.loginCredentials.password)
      delete body.loginCredentials.password
    }

    const newRequest = await AuditRequest.create({
      ...body,
      customerId: userId,
    })

    return NextResponse.json({ data: newRequest }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/audit-requests]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
