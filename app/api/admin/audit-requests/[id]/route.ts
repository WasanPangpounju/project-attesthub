import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import AuditRequest from "@/models/audit-request";

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
    const { sessionClaims } = await auth();

    // ✅ ตอนนี้คุณใช้ user test เลยคอมเมนต์ไว้ก่อน
    // const role =
    //   (sessionClaims as any)?.metadata?.role ||
    //   (sessionClaims as any)?.publicMetadata?.role ||
    //   (sessionClaims as any)?.privateMetadata?.role;
    // if (role !== "admin") {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    // ✅ ใช้ ctx.params ก่อน ถ้าไม่มีค่อย fallback จาก URL
    const rawFromParams = ctx?.params?.id;
    const requestedId = normalizeId(rawFromParams || getIdFromUrl(req));

    if (!requestedId || requestedId === "undefined" || requestedId === "audit-requests") {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Missing or invalid id param",
          debug: {
            url: req.url,
            rawFromParams: rawFromParams ?? null,
            parsedFromUrl: getIdFromUrl(req),
            requestedId,
          },
        },
        { status: 400 }
      );
    }

    await dbConnect();

    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { error: "MongoDB not ready", debug: { readyState: mongoose.connection.readyState } },
        { status: 500 }
      );
    }

    const col = db.collection("auditrequests");

    let item: any = null;

    // 1) native: ObjectId
    if (isHexObjectId(requestedId)) {
      item = await col.findOne({ _id: new mongoose.Types.ObjectId(requestedId) });
    }

    // 2) native: string (เผื่อเคยบันทึกแบบ string)
    if (!item) {
      item = await col.findOne({ _id: requestedId });
    }

    // 3) fallback: mongoose model
    if (!item) {
      item = await AuditRequest.findById(requestedId).lean();
    }

    if (!item) {
      const sample = await col.findOne({}, { projection: { _id: 1, projectName: 1 } });
      return NextResponse.json(
        {
          error: "Not found",
          debug: {
            requestedId,
            requestedIdHex24: isHexObjectId(requestedId),
            sampleId: sample?._id ?? null,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
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
