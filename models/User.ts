// models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

interface IUser extends Document {
  clerkUserId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'tester' | 'customer';
  roleAssigned: boolean;
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  clerkUserId: { type: String, required: true, unique: true },
  email: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  role: {
    type: String,
    enum: ['admin', 'tester', 'customer'],
    default: null,
  },
  roleAssigned: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
