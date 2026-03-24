import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import AuditRequest from "@/models/audit-request";

function getRole(sessionClaims: any) {
  return (
    sessionClaims?.metadata?.role ||
    sessionClaims?.publicMetadata?.role ||
    sessionClaims?.privateMetadata?.role
  );
}

export const runtime = "nodejs"

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (getRole(sessionClaims) !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const items = await AuditRequest.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[GET /api/admin/audit-requests]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
