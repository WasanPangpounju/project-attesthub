import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import AuditRequest from "@/models/audit-request";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
function isValidObjectId(id: string) {
  return OBJECT_ID_RE.test(id);
}

const MAX_URLS = 50;

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    await connectToDatabase();

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const [user, auditRequest] = await Promise.all([
      User.findOne({ clerkUserId: userId }).lean(),
      AuditRequest.findById(id).lean(),
    ]);
    if (!auditRequest) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const canEdit = user?.role === "admin" || auditRequest.customerId === userId;
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await req.json()) as { sitemapUrl?: string };
    const { sitemapUrl } = body;

    if (!sitemapUrl) {
      return NextResponse.json({ error: "sitemapUrl is required" }, { status: 400 });
    }

    try {
      new URL(sitemapUrl);
    } catch {
      return NextResponse.json({ error: "Invalid sitemap URL format" }, { status: 400 });
    }

    const res = await fetch(sitemapUrl);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch sitemap: ${res.status}` },
        { status: 400 }
      );
    }

    const xml = await res.text();
    const matches = xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi);
    const urls = [...new Set([...matches].map((m) => m[1]))].slice(0, MAX_URLS);

    return NextResponse.json({ urls }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/audit-requests/[id]/sitemap/fetch]", err);
    return NextResponse.json({ error: "Failed to fetch sitemap" }, { status: 500 });
  }
}
