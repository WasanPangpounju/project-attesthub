# PROMPT: User Profile System — Part 1: Models + API

## Context
AttestHub Next.js 14 App Router, MongoDB/Mongoose, Clerk auth, TypeScript strict mode.
Read CLAUDE.md before starting.

---

## Overview (3-part plan)
- Part 1 (this): Extend User model, ProfileChangeRequest model, API routes
- Part 2: Profile pages (customer, tester, shared My Profile page)
- Part 3: Admin UI — Users list enhancements + profile management

---

## Step 1: Extend User model — `models/User.ts`

Add these fields to `IUser` interface:

```typescript
// Shared
jobTitle?: string
phone?: string
bio?: string
avatarUrl?: string

// Customer-specific
organization?: {
  name?: string
  registrationNumber?: string    // เลขทะเบียนนิติบุคคล
  address?: string
  website?: string
  billingAddress?: string
  billingMethod?: string         // "bank_transfer" | "credit_card" | "promptpay"
}
contractFiles?: {
  name: string
  url: string
  publicId?: string
  uploadedAt: Date
}[]

// Tester-specific
testerProfile?: {
  disabilityTypes: string[]      // "blind" | "low_vision" | "deaf" | "hard_of_hearing" | "motor" | "cognitive" | "none"
  wcagKnowledge: string[]        // "wcag_2_0" | "wcag_2_1" | "wcag_2_2" | "wcag_3_0"
  screenReaders: string[]        // "jaws" | "nvda" | "voiceover" | "talkback" | "narrator" | "orca"
  devices: string[]              // "desktop_windows" | "desktop_mac" | "ios" | "android" | "other"
  languages: string[]            // "th" | "en" | "other"
  bio?: string
  yearsExperience?: number
  // Stats (read-only, computed from tasks)
  totalProjects?: number
  totalEarnings?: number         // ยอดสะสม (admin only — skip in user-facing UI for now)
}

// Admin-specific  
adminProfile?: {
  department?: string
  responsibilities?: string
}

// Profile change request status
profileStatus?: "active" | "pending_approval"   // pending when user submitted changes awaiting admin approval
```

Add to Mongoose schema:
```typescript
jobTitle: { type: String },
phone: { type: String },
bio: { type: String },
avatarUrl: { type: String },
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
adminProfile: {
  department: { type: String },
  responsibilities: { type: String },
},
profileStatus: { type: String, enum: ["active", "pending_approval"], default: "active" },
```

---

## Step 2: Create ProfileChangeRequest model — `models/profile-change-request.ts`

This stores pending profile changes submitted by users, waiting for admin approval.

```typescript
import mongoose, { Schema, Document, Model } from "mongoose"

export interface IProfileChangeRequest extends Document {
  userId: string           // clerkUserId of the requester
  userEmail: string        // for display in admin UI
  userRole: string
  userName: string         // firstName + lastName
  changes: Record<string, unknown>   // the new field values (same shape as User profile fields)
  status: "pending" | "approved" | "rejected"
  reviewedBy?: string      // admin clerkUserId
  reviewedAt?: Date
  note?: string            // admin note on rejection (optional)
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
```

---

## Step 3: My Profile API (self-service)

### GET + PUT own profile
File: `app/api/profile/route.ts`

```
GET — return own profile (all fields except totalEarnings)
PUT — submit profile change request (creates ProfileChangeRequest, sets profileStatus to "pending_approval")
```

Auth: Clerk session required.

GET response:
```typescript
{
  data: {
    clerkUserId: string
    email: string
    firstName?: string
    lastName?: string
    role: string
    jobTitle?: string
    phone?: string
    bio?: string
    avatarUrl?: string
    profileStatus: string
    // customer fields
    organization?: { name?; registrationNumber?; address?; website?; billingAddress?; billingMethod? }
    contractFiles?: { name; url; uploadedAt }[]
    // tester fields
    testerProfile?: {
      disabilityTypes; wcagKnowledge; screenReaders; devices; languages; bio?; yearsExperience?; totalProjects?
    }
    // admin fields
    adminProfile?: { department?; responsibilities? }
    // stats
    pendingChangeRequest?: {
      _id: string
      changes: Record<string, unknown>
      createdAt: string
    }
  }
}
```

PUT body: Profile fields to update (same shape, role-appropriate)
- Validate: firstName, lastName required if provided (non-empty string)
- If user already has a pending request → update it (replace changes)
- Else → create new ProfileChangeRequest
- Set user.profileStatus = "pending_approval"
- Return updated user + the pending request

### Upload contract file (customer only)
File: `app/api/profile/contract-files/route.ts`

```
POST — upload contract file to Cloudinary (reuse /api/upload pattern)
DELETE — remove a contract file by publicId
```

Uses same Cloudinary upload logic as existing `/api/upload/route.ts`.
Only accessible by customer or admin role.

---

## Step 4: Admin — manage profile change requests

### List pending requests
File: `app/api/admin/profile-change-requests/route.ts`

```
GET — list all ProfileChangeRequests (optional ?status=pending|approved|rejected&role=customer|tester)
```

Auth: admin only.

Response:
```typescript
{
  data: {
    _id: string
    userId: string
    userEmail: string
    userRole: string
    userName: string
    changes: Record<string, unknown>
    status: string
    createdAt: string
  }[]
}
```

### Approve / Reject request
File: `app/api/admin/profile-change-requests/[requestId]/route.ts`

```
PATCH — approve or reject
Body: { action: "approve" | "reject", note?: string }
```

Approve flow:
1. Find ProfileChangeRequest by id
2. Apply `changes` to the User document (merge with existing fields using `$set`)
3. Set user.profileStatus = "active"
4. Update request: status = "approved", reviewedBy = userId, reviewedAt = now
5. Return updated user

Reject flow:
1. Set user.profileStatus = "active" (reset so they can resubmit)
2. Update request: status = "rejected", note, reviewedBy, reviewedAt

### Admin view any user's full profile
File: `app/api/admin/users/[userId]/profile/route.ts`

```
GET — return full User document + their pending change request if any
PUT — admin can directly update any user's profile (bypasses approval flow, applies immediately)
```

Auth: admin only.

For GET response, include all fields including testerProfile.totalEarnings.

---

## Step 5: Tester stats update API (utility)

File: `app/api/admin/users/[userId]/tester-stats/route.ts`

```
POST — recalculate and update testerProfile.totalProjects for a tester
Body: {} (triggers recalculation)
```

Implementation:
- Count AuditRequests where the tester was assigned to any scenario (via Scenario model: `assignedTesterId === userId`)
- Update `testerProfile.totalProjects` on the User document

---

## Step 6: Build

```bash
npm run build
```

Must pass with zero TypeScript errors. Report all files changed/created.
