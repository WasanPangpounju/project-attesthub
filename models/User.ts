// models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  clerkUserId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'tester' | 'customer';
  roleAssigned: boolean;
  status: 'active' | 'suspended';
  adminNote?: string;
  isPreRegistered: boolean;

  // Shared profile fields
  jobTitle?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;

  // Customer-specific
  organization?: {
    name?: string;
    registrationNumber?: string;
    address?: string;
    website?: string;
    billingAddress?: string;
    billingMethod?: string;
  };
  contractFiles?: {
    name: string;
    url: string;
    publicId?: string;
    uploadedAt: Date;
  }[];

  // Tester-specific
  testerProfile?: {
    disabilityTypes: string[];
    wcagKnowledge: string[];
    screenReaders: string[];
    devices: string[];
    languages: string[];
    bio?: string;
    yearsExperience?: number;
    totalProjects?: number;
    totalEarnings?: number;
  };

  // Admin-specific
  adminProfile?: {
    department?: string;
    responsibilities?: string;
  };

  // Language preference
  preferredLanguage?: 'en' | 'th';

  // Profile change request status
  profileStatus?: 'active' | 'pending_approval';

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
  adminNote: { type: String, default: '' },
  isPreRegistered: { type: Boolean, default: false },

  // Shared profile fields
  jobTitle: { type: String },
  phone: { type: String },
  bio: { type: String },
  avatarUrl: { type: String },

  // Customer-specific
  organization: {
    name: { type: String },
    registrationNumber: { type: String },
    address: { type: String },
    website: { type: String },
    billingAddress: { type: String },
    billingMethod: { type: String },
  },
  contractFiles: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  }],

  // Tester-specific
  testerProfile: {
    disabilityTypes: { type: [String], default: [] },
    wcagKnowledge: { type: [String], default: [] },
    screenReaders: { type: [String], default: [] },
    devices: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    bio: { type: String },
    yearsExperience: { type: Number },
    totalProjects: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
  },

  // Admin-specific
  adminProfile: {
    department: { type: String },
    responsibilities: { type: String },
  },

  // Language preference
  preferredLanguage: { type: String, enum: ['en', 'th'], default: 'en' },

  // Profile status
  profileStatus: { type: String, enum: ['active', 'pending_approval'], default: 'active' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
