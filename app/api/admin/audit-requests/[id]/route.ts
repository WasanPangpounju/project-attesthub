import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import AuditRequest from "@/models/audit-request";
import User from "@/models/User";

export const runtime = "nodejs";

function normalizeId(raw: unknown) {
  const s = String(raw ?? "");
  try {
    return decodeURIComponent(s).trim();
  } catch {
    return s.trim();
  }
}

function isHexObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

function getIdFromUrl(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // .../api/admin/audit-requests/<id>
  return parts[parts.length - 1] || "";
}

export async function GET(req: Request, ctx: any) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const caller = await User.findOne({ clerkUserId: userId }).lean();
    if (!caller || caller.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ ใช้ ctx.params ก่อน ถ้าไม่มีค่อย fallback จาก URL
    const rawFromParams = ctx?.params?.id;
    const requestedId = normalizeId(rawFromParams || getIdFromUrl(req));

    if (!requestedId || requestedId === "undefined" || requestedId === "audit-requests") {
      return NextResponse.json(
        { error: "Bad Request", message: "Missing or invalid id param" },
        { status: 400 }
      );
    }

    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "MongoDB not ready" }, { status: 500 });
    }

    const col = db.collection("auditrequests");

    let item: any = null;

    // 1) native: ObjectId
    if (isHexObjectId(requestedId)) {
      item = await col.findOne({ _id: new mongoose.Types.ObjectId(requestedId) });
    }

    // 2) native: string (เผื่อเคยบันทึกแบบ string)
    if (!item) {
      item = await col.findOne({ _id: requestedId as unknown as mongoose.Types.ObjectId });
    }

    // 3) fallback: mongoose model
    if (!item) {
      item = await AuditRequest.findById(requestedId).lean();
    }

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const userIds = new Set<string>([item.customerId]);
    for (const t of item.assignedTesters ?? []) userIds.add(t.testerId);

    const users = await User.find(
      { clerkUserId: { $in: [...userIds] } },
      { clerkUserId: 1, firstName: 1, lastName: 1, email: 1 }
    ).lean();

    const userMap = new Map(users.map((u) => [u.clerkUserId, u]));
    const nameOf = (id: string) => {
      const u = userMap.get(id);
      if (!u) return id;
      return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || id;
    };

    const data = {
      ...item,
      customerName: nameOf(item.customerId),
      assignedTesters: (item.assignedTesters ?? []).map((t: any) => ({
        ...t,
        testerName: nameOf(t.testerId),
      })),
    };

    return NextResponse.json({ item: data });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Server error",
        message: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
