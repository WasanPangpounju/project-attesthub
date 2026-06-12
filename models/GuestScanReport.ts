import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGuestScanIssue {
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagCriteria: string;
  element: string;
  description: string;
  recommendation: string;
}

export interface IGuestScanAiSummary {
  overview: string;
  topIssues: string[];
  recommendations: string[];
  urgency: 'ด่วนมาก' | 'ด่วน' | 'ควรแก้ไข' | 'แนะนำ';
}

export interface IGuestScanReport extends Document {
  domain: string;
  url: string;
  visitorIp: string;
  clerkUserId?: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  jobId?: string;
  score?: number;
  wcagLevel?: 'A' | 'AA' | 'AAA' | 'None';
  summary?: {
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  };
  issues: IGuestScanIssue[];
  aiSummary?: IGuestScanAiSummary;
  pagesScanned?: number;
  scanDurationMs?: number;
  errorMessage?: string;
  createdAt: Date;
}

const GuestScanIssueSchema = new Schema<IGuestScanIssue>(
  {
    severity: {
      type: String,
      enum: ['critical', 'serious', 'moderate', 'minor'],
      required: true,
    },
    wcagCriteria: { type: String, default: '' },
    element: { type: String, default: '' },
    description: { type: String, required: true },
    recommendation: { type: String, default: '' },
  },
  { _id: false }
);

const GuestScanReportSchema = new Schema<IGuestScanReport>(
  {
    domain: { type: String, required: true, index: true },
    url: { type: String, required: true },
    visitorIp: { type: String, default: '' },
    clerkUserId: { type: String, index: true },
    status: {
      type: String,
      enum: ['pending', 'scanning', 'completed', 'failed'],
      default: 'pending',
    },
    jobId: { type: String },
    score: { type: Number, min: 0, max: 100 },
    wcagLevel: {
      type: String,
      enum: ['A', 'AA', 'AAA', 'None'],
    },
    summary: {
      passed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      warnings: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    issues: { type: [GuestScanIssueSchema], default: [] },
    aiSummary: {
      overview: { type: String },
      topIssues: { type: [String], default: [] },
      recommendations: { type: [String], default: [] },
      urgency: {
        type: String,
        enum: ['ด่วนมาก', 'ด่วน', 'ควรแก้ไข', 'แนะนำ'],
      },
    },
    pagesScanned: { type: Number },
    scanDurationMs: { type: Number },
    errorMessage: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'guestscanreports' }
);

// TTL index — ลบ document อัตโนมัติหลัง 30 วัน
GuestScanReportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const GuestScanReport: Model<IGuestScanReport> =
  mongoose.models.GuestScanReport ||
  mongoose.model<IGuestScanReport>('GuestScanReport', GuestScanReportSchema);

export default GuestScanReport;
