"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const GuestScanIssueSchema = new mongoose_1.Schema({
    severity: {
        type: String,
        enum: ['critical', 'serious', 'moderate', 'minor'],
        required: true,
    },
    wcagCriteria: { type: String, default: '' },
    element: { type: String, default: '' },
    description: { type: String, required: true },
    recommendation: { type: String, default: '' },
}, { _id: false });
const GuestScanReportSchema = new mongoose_1.Schema({
    domain: { type: String, required: true, index: true },
    url: { type: String, required: true },
    visitorIp: { type: String, default: '' },
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
}, { collection: 'guestscanreports' });
// TTL index — ลบ document อัตโนมัติหลัง 30 วัน
GuestScanReportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
const GuestScanReport = mongoose_1.default.models.GuestScanReport ||
    mongoose_1.default.model('GuestScanReport', GuestScanReportSchema);
exports.default = GuestScanReport;
