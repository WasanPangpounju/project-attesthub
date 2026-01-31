import { Schema, model, models } from "mongoose"

export type ServiceCategory = "website" | "mobile" | "physical"
export type ServicePackage = "automated" | "hybrid" | "expert"

export interface IAuditRequest {
    customerId: string
  projectName: string
  serviceCategory: ServiceCategory
  targetUrl: string
  locationAddress: string
  accessibilityStandard: string
  servicePackage: ServicePackage
  devices: string[]
  specialInstructions: string
  files?: { name: string; size: number; type: string }[]
  status: "pending" | "in_review" | "scheduled" | "completed"
  createdAt: Date
  updatedAt: Date
}

const AuditRequestSchema = new Schema<IAuditRequest>(
  {
        customerId: {
      type: String,
      required: true,
      index: true,
    },
    projectName: { type: String, required: true },
    serviceCategory: {
      type: String,
      enum: ["website", "mobile", "physical"],
      required: true,
    },
    targetUrl: { type: String, required: true },
    locationAddress: { type: String, default: "" },
    accessibilityStandard: { type: String, required: true },
    servicePackage: {
      type: String,
      enum: ["automated", "hybrid", "expert"],
      required: true,
    },
    devices: { type: [String], default: [] },
    specialInstructions: { type: String, default: "" },
    files: [
      {
        name: String,
        size: Number,
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "in_review", "scheduled", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
)

const AuditRequest =
  models.AuditRequest || model<IAuditRequest>("AuditRequest", AuditRequestSchema)

export default AuditRequest
