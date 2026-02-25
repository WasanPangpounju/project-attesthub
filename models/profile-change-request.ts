import mongoose, { Schema, Document, Model } from "mongoose"

export interface IProfileChangeRequest extends Document {
  userId: string
  userEmail: string
  userRole: string
  userName: string
  changes: Record<string, unknown>
  status: "pending" | "approved" | "rejected"
  reviewedBy?: string
  reviewedAt?: Date
  note?: string
  createdAt: Date
  updatedAt: Date
}

const ProfileChangeRequestSchema = new Schema<IProfileChangeRequest>(
  {
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, required: true },
    userName: { type: String, required: true },
    changes: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    note: { type: String },
  },
  { timestamps: true }
)

const ProfileChangeRequest: Model<IProfileChangeRequest> =
  mongoose.models.ProfileChangeRequest ||
  mongoose.model<IProfileChangeRequest>("ProfileChangeRequest", ProfileChangeRequestSchema)

export default ProfileChangeRequest
