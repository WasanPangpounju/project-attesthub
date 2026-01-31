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

export async function GET() {
  const { sessionClaims } = await auth();
  // if (getRole(sessionClaims) !== "admin") {
  //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // }

  await dbConnect();

  const items = await AuditRequest.find({}).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ items });
}
