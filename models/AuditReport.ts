import { Schema, model, models } from "mongoose"

export interface IAuditReport {
  _id: string
  auditRequestId: string
  projectName: string
  url: string
  scanScope: "single" | "full_site"
  status: "pending" | "scanning" | "completed" | "failed"
  score: number
  wcagLevel: "A" | "AA" | "AAA"
  summary: {
    passed: number
    failed: number
    warnings: number
    total: number
  }
  issues: {
    id: string
    severity: "critical" | "serious" | "moderate" | "minor"
    wcagCriteria: string
    wcagTitle: string
    element: string
    description: string
    recommendation: string
    pageUrl: string
    impact: string
  }[]
  pagesScanned: number
  scanDurationMs: number
  errorMessage?: string
  jobId?: string
  requestedBy: string
  generatedAt: Date
  completedAt?: Date
}

const IssueSchema = new Schema(
  {
    id: { type: String, required: true },
    severity: { type: String, enum: ["critical", "serious", "moderate", "minor"], required: true },
    wcagCriteria: { type: String, default: "" },
    wcagTitle: { type: String, default: "" },
    element: { type: String, default: "" },
    description: { type: String, default: "" },
    recommendation: { type: String, default: "" },
    pageUrl: { type: String, default: "" },
    impact: { type: String, default: "" },
  },
  { _id: false }
)

const AuditReportSchema = new Schema<IAuditReport>(
  {
    auditRequestId: { type: String, required: true, index: true },
    projectName: { type: String, required: true },
    url: { type: String, required: true },
    scanScope: { type: String, enum: ["single", "full_site"], default: "single" },
    status: {
      type: String,
      enum: ["pending", "scanning", "completed", "failed"],
      default: "pending",
    },
    score: { type: Number, default: 0, min: 0, max: 100 },
    wcagLevel: { type: String, enum: ["A", "AA", "AAA"], default: "AA" },
    summary: {
      passed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      warnings: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    issues: { type: [IssueSchema], default: [] },
    pagesScanned: { type: Number, default: 0 },
    scanDurationMs: { type: Number, default: 0 },
    errorMessage: { type: String },
    jobId: { type: String },
    requestedBy: { type: String, required: true, index: true },
    generatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
)

export default models.AuditReport || model<IAuditReport>("AuditReport", AuditReportSchema)
