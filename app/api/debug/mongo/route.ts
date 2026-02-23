import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";

export async function GET() {
  await dbConnect();

  const db = mongoose.connection.db;
  if (!db) {
    return NextResponse.json({ error: "MongoDB not ready" }, { status: 500 });
  }

  const dbName = db.databaseName;
  const cols = await db.listCollections().toArray();

  // เอาเฉพาะชื่อ collection ที่เกี่ยวกับ audit (เพื่อไม่โชว์เยอะ)
  const auditLike = cols
    .map((c) => c.name)
    .filter((name) => name.toLowerCase().includes("audit"));

  return NextResponse.json({
    dbName,
    auditCollections: auditLike,
    allCollectionsCount: cols.length,
  });
}
