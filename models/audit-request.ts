import { Schema, model, models } from "mongoose";

export type ServiceCategory = "website" | "mobile" | "physical";
export type ServicePackage = "automated" | "hybrid" | "expert";

export type ProjectStatus =
  | "pending" // customer ส่งเข้ามา
  | "open" // เปิดให้ tester รับงาน
  | "in_review" // กำลังตรวจ
  | "scheduled"
  | "completed"
  | "cancelled";

export type TesterRole = "lead" | "member" | "reviewer";
export type TesterWorkStatus =
  | "assigned" // admin ใส่ชื่อ / หรือ auto after accept
  | "accepted" // tester กดรับงาน
  | "working"
  | "done"
  | "removed";

export interface AssignedTester {
  testerId: string;
  role: TesterRole;
  workStatus: TesterWorkStatus;
  assignedAt: Date;
  assignedBy?: string; // adminId ที่ assign
  acceptedAt?: Date;
  completedAt?: Date;
  note?: string;
}

export interface StatusHistoryItem {
  from?: ProjectStatus;
  to: ProjectStatus;
  changedAt: Date;
  changedBy?: string; // adminId
  note?: string;
}

export interface IAuditRequest {
  customerId: string;

  projectName: string;
  serviceCategory: ServiceCategory;
  targetUrl: string;
  locationAddress: string;
  accessibilityStandard: string;
  servicePackage: ServicePackage;
  devices: string[];
  specialInstructions: string;
  files?: { name: string; size: number; type: string }[];

  // ✅ ราคา/ค่าจ้าง ให้ tester เห็นตอนกดรับงาน
  // แนะนำเก็บเป็นหน่วยเล็กสุด (เช่น สตางค์) เพื่อไม่เจอปัญหาทศนิยม
  priceAmount: number; // เช่น 150000 = 1,500.00 THB ถ้าใช้ satang
  priceCurrency: "THB" | "USD"; // จะใช้แค่ THB ก็ได้
  priceNote?: string; // รายละเอียดราคา/ขอบเขต

  status: ProjectStatus;

  // ✅ หลาย tester ต่อ 1 งาน
  assignedTesters: AssignedTester[];

  // ✅ ประวัติสถานะ
  statusHistory: StatusHistoryItem[];

  // optional admin fields
  priority?: "low" | "normal" | "high" | "urgent";
  dueDate?: Date;
  adminNotes?: string;

  // optional AI fields
  aiConfidence?: number;
  aiReportStatus?: "none" | "generated" | "validated" | "rejected";

  createdAt: Date;
  updatedAt: Date;
}

const AssignedTesterSchema = new Schema<AssignedTester>(
  {
    testerId: { type: String, required: true },
    role: { type: String, enum: ["lead", "member", "reviewer"], default: "member" },
    workStatus: {
      type: String,
      enum: ["assigned", "accepted", "working", "done", "removed"],
      default: "assigned",
    },
    assignedAt: { type: Date, default: Date.now },
    assignedBy: { type: String },
    acceptedAt: { type: Date },
    completedAt: { type: Date },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const StatusHistorySchema = new Schema<StatusHistoryItem>(
  {
    from: { type: String },
    to: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const AuditRequestSchema = new Schema<IAuditRequest>(
  {
    customerId: { type: String, required: true, index: true },

    projectName: { type: String, required: true },
    serviceCategory: { type: String, enum: ["website", "mobile", "physical"], required: true },
    targetUrl: { type: String, required: true },
    locationAddress: { type: String, default: "" },
    accessibilityStandard: { type: String, required: true },
    servicePackage: { type: String, enum: ["automated", "hybrid", "expert"], required: true },

    devices: { type: [String], default: [] },
    specialInstructions: { type: String, default: "" },
    files: [{ name: String, size: Number, type: String }],

    // ✅ ราคา (required)
    priceAmount: { type: Number, required: true, min: 0 },
    priceCurrency: { type: String, enum: ["THB", "USD"], default: "THB" },
    priceNote: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "open", "in_review", "scheduled", "completed", "cancelled"],
      default: "pending",
      index: true,
    },

    assignedTesters: { type: [AssignedTesterSchema], default: [] },
    statusHistory: { type: [StatusHistorySchema], default: [] },

    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    dueDate: { type: Date },
    adminNotes: { type: String, default: "" },

    aiConfidence: { type: Number, min: 0, max: 100 },
    aiReportStatus: { type: String, enum: ["none", "generated", "validated", "rejected"], default: "none" },
  },
  { timestamps: true }
);

// ✅ กัน tester ซ้ำ “ในระดับ model” (ช่วยกันพลาด)
// หมายเหตุ: กันได้ตอน save/create แต่การ update แบบ $push ต้องกันฝั่ง API ด้วย
AuditRequestSchema.path("assignedTesters").validate(function (arr: AssignedTester[]) {
  const ids = arr.map((x) => x.testerId);
  return new Set(ids).size === ids.length;
}, "Duplicate testerId in assignedTesters is not allowed.");

// Index เพื่อ query เร็ว
AuditRequestSchema.index({ customerId: 1, createdAt: -1 });
AuditRequestSchema.index({ status: 1, createdAt: -1 });
AuditRequestSchema.index({ "assignedTesters.testerId": 1 });

// 🔒 สำคัญมาก: ล็อกชื่อ collection ให้ตรงกับ DB จริง (จาก debug = "auditrequests")
const COLLECTION_NAME = "auditrequests";

export default models.AuditRequest || model<IAuditRequest>("AuditRequest", AuditRequestSchema, COLLECTION_NAME);
