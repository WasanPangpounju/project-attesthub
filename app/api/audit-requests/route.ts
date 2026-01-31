// app/api/audit-requests/route.ts 
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import AuditRequest from "@/models/audit-request"

// --- helper: ดึง customerId จาก request ---
// ตอนนี้ทำแบบ generic ก่อน:
// 1) ลองอ่านจาก header: x-customer-id
// 2) ถ้าไม่มี ลองอ่านจาก query: ?customerId=xxxx
// ภายหลัง คุณสามารถแก้ให้ดึงจากระบบ login จริง เช่น Clerk / NextAuth ได้
function getCustomerIdFromRequest(req: NextRequest): string | null {
  // ตัวเลือก A: อ่านจาก header
  const headerId = req.headers.get("x-customer-id")
  if (headerId) return headerId

  // ตัวเลือก B: อ่านจาก query string
  const { searchParams } = new URL(req.url)
  const queryId = searchParams.get("customerId")
  if (queryId) return queryId

  return null
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customerId")

    const filter: Record<string, any> = {}

    // ถ้ามี customerId → ดึงเฉพาะของลูกค้าคนนั้น
    if (customerId) {
      filter.customerId = customerId
    }

    const requests = await AuditRequest.find(filter)
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ data: requests }, { status: 200 })
  } catch (err) {
    console.error("[GET /api/audit-requests] error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
  }


export async function POST(req: NextRequest) {
  try {
    await connectToDatabase()

    const body = await req.json()
    const {
      customerId,          // 👈 ดึงค่าเพิ่ม
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

    if (!customerId) {
      return NextResponse.json(
        { error: "Missing customerId" },
        { status: 400 }
      )
    }

    if (
      !projectName ||
      !serviceCategory ||
      !targetUrl ||
      !accessibilityStandard ||
      !servicePackage
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const newRequest = await AuditRequest.create({
      customerId,                    // 👈 เซฟลง DB ตรง ๆ
      projectName,
      serviceCategory,
      targetUrl,
      locationAddress,
      accessibilityStandard,
      servicePackage,
      devices: Array.isArray(devices) ? devices : [],
      specialInstructions: specialInstructions ?? "",
      files:
        Array.isArray(files) &&
        files.every((f) => f && typeof f.name === "string")
          ? files
          : [],
    })

    return NextResponse.json(
      { message: "Audit request created", data: newRequest },
      { status: 201 }
    )
  } catch (err) {
    console.error("[POST /api/audit-requests] error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

