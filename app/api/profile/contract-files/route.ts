import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"
import cloudinary from "@/lib/cloudinary"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const user = await User.findOne({ clerkUserId: userId })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (user.role !== "customer" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 })

    const allowedTypes = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png", "image/jpeg"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "attesthub/contracts", resource_type: "auto", use_filename: true, unique_filename: true },
        (error, res) => {
          if (error || !res) reject(error)
          else resolve(res)
        }
      )
      stream.end(buffer)
    })

    const contractFile = {
      name: file.name,
      url: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date(),
    }

    user.contractFiles = [...(user.contractFiles ?? []), contractFile]
    user.updatedAt = new Date()
    await user.save()

    return NextResponse.json({ data: contractFile }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/profile/contract-files]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { publicId } = body as { publicId?: string }
    if (!publicId) return NextResponse.json({ error: "publicId is required" }, { status: 400 })

    await connectToDatabase()

    const user = await User.findOne({ clerkUserId: userId })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (user.role !== "customer" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Remove from Cloudinary
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" }).catch(() => {
      // Also try image type if raw fails
      return cloudinary.uploader.destroy(publicId)
    })

    user.contractFiles = (user.contractFiles ?? []).filter((f) => f.publicId !== publicId)
    user.updatedAt = new Date()
    await user.save()

    return NextResponse.json({ message: "File deleted" })
  } catch (err) {
    console.error("[DELETE /api/profile/contract-files]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
