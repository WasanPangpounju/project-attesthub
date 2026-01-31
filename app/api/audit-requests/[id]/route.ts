// app/api/audit-requests/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AuditRequest from "@/models/audit-request";
import { Types } from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectToDatabase();

    // Handle both sync and async params
    const resolvedParams = await Promise.resolve(params);
    const id = decodeURIComponent(resolvedParams.id);

    // Validate MongoDB ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const request = await AuditRequest.findById(id).lean();

    if (!request) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: request }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/audit-requests/[id]] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectToDatabase();

    // Handle both sync and async params
    const resolvedParams = await Promise.resolve(params);
    const id = decodeURIComponent(resolvedParams.id);
    const body = await req.json();

    // Validate MongoDB ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Allowed fields for admin update
    const allowedFields = [
      "projectName",
      "status",
      "priority",
      "dueDate",
      "adminNotes",
      "priceAmount",
      "priceCurrency",
      "priceNote",
      "aiConfidence",
      "aiReportStatus",
    ];

    // Filter body to only include allowed fields
    const updateData: Record<string, any> = {};
    allowedFields.forEach((field) => {
      if (field in body) {
        updateData[field] = body[field];
      }
    });

    // Add status history entry if status is changing
    if (body.status) {
      const existing = await AuditRequest.findById(id).lean();
      if (existing && existing.status !== body.status) {
        updateData.$push = {
          statusHistory: {
            from: existing.status,
            to: body.status,
            changedAt: new Date(),
            changedBy: "admin", // In real app, get from authenticated user
            note: body.statusNote || "",
          },
        };
      }
    }

    const updated = await AuditRequest.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Project updated successfully", data: updated },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[PATCH /api/audit-requests/[id]] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectToDatabase();

    // Handle both sync and async params
    const resolvedParams = await Promise.resolve(params);
    const id = decodeURIComponent(resolvedParams.id);

    // Validate MongoDB ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const deleted = await AuditRequest.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Project deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("[DELETE /api/audit-requests/[id]] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
