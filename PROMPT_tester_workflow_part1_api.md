# Task: Tester Workflow + Admin Assign — Part 1: API Routes

## Overview
Build the backend API for the full Tester Workflow and Admin Tester Assignment.
Do NOT touch any UI files in this part — backend only.

Read CLAUDE.md and PROJECT_BRIEF.md before starting.

---

## Data Model Reference (from models/audit-request.ts)

```ts
assignedTesters: {
  testerId: string          // clerkUserId of tester
  role: "lead" | "member" | "reviewer"
  workStatus: "assigned" | "accepted" | "working" | "done" | "removed"
  assignedAt: Date
  acceptedAt?: Date
  completedAt?: Date
  assignedBy?: string
  note?: string
}[]

status: "pending" | "open" | "in_review" | "scheduled" | "completed" | "cancelled"
```

---

## File 1: `app/api/tester/tasks/route.ts` (CREATE)

### GET — List tasks assigned to the current tester
- Get `userId` from Clerk `auth()`
- Verify user exists in MongoDB and has role `"tester"` — return 403 if not
- Query `AuditRequest` where `assignedTesters.testerId === userId`
- Support query params:
  - `status` — filter by `workStatus` of the tester's entry (assigned/accepted/working/done)
  - `search` — regex on `projectName`
- Return array of projects, each including the tester's own `assignedTesters` entry
- Return: `{ data: ITask[] }`

### Standard pattern: connectToDatabase() + try/catch + explicit status codes

---

## File 2: `app/api/tester/tasks/[id]/route.ts` (CREATE)

### GET — Get single task detail
- Verify caller is a tester
- Find `AuditRequest` by `_id`
- Verify caller is in `assignedTesters` — return 403 if not
- Return full audit request + caller's tester entry
- Return: `{ data: IAuditRequest }`

### PATCH — Update tester's workStatus on a task
- Body: `{ action: "accept" | "reject" | "start" | "done" }`
- Verify caller is in `assignedTesters` of this project
- Apply workStatus transitions:
  - `accept` → `assigned` → `accepted`, set `acceptedAt: new Date()`
  - `reject` → `assigned` → `removed`, set `note: "Rejected by tester"`
  - `start` → `accepted` → `working`
  - `done` → `working` → `done`, set `completedAt: new Date()`
- Invalid transitions return 400 with message
- Save and return updated document
- Return: `{ data: updatedAuditRequest }`

---

## File 3: `app/api/tester/tasks/[id]/progress/route.ts` (CREATE)

### PATCH — Update task progress percentage
- Body: `{ progressPercent: number }` (0–100)
- Verify caller is assigned tester
- Store on the tester's entry in `assignedTesters`:
  add field `progressPercent: number` to that subdocument
- Return: `{ data: updatedAuditRequest }`

> Note: Add `progressPercent?: number` field to the `assignedTesters` subdocument
> in `models/audit-request.ts` if it doesn't exist.

---

## File 4: `app/api/tester/tasks/[id]/comments/route.ts` (CREATE)

### GET — List comments for a task
### POST — Add a comment
- Body: `{ text: string, authorId: string, authorName: string }`
- Comments stored in `AuditRequest.comments` array (add field if needed):
  ```ts
  comments: {
    _id: ObjectId (auto)
    authorId: string
    authorName: string
    text: string
    createdAt: Date
  }[]
  ```
- Verify caller is either assigned tester OR admin
- Return: `{ data: comment[] }`

> Add `comments` array to `models/audit-request.ts` if it doesn't exist.

---

## File 5: `app/api/tester/tasks/[id]/attachments/route.ts` (CREATE)

### POST — Save attachment metadata (file upload handled client-side for now)
- Body: `{ name: string, size: number, type: string, url?: string, testCaseId?: string }`
- Store in `AuditRequest.attachments`:
  ```ts
  attachments: {
    _id: ObjectId (auto)
    uploadedBy: string      // clerkUserId
    name: string
    size: number
    type: string
    url?: string
    testCaseId?: string
    uploadedAt: Date
  }[]
  ```
- Verify caller is assigned tester
- Return: `{ data: attachment }`

> Add `attachments` array to `models/audit-request.ts` if it doesn't exist.

---

## File 6: `app/api/admin/audit-requests/[id]/assign-tester/route.ts` (CREATE)

### POST — Admin assigns a tester to a project
- Body: `{ testerId: string, role: "lead" | "member" | "reviewer", note?: string }`
- Verify caller is admin
- Verify `testerId` exists in MongoDB and has role `"tester"`
- Check no duplicate tester (schema already validates but double-check)
- Push to `assignedTesters`:
  ```ts
  {
    testerId,
    role,
    workStatus: "assigned",
    assignedAt: new Date(),
    assignedBy: callerUserId,
    note: note || ""
  }
  ```
- If project status is `"pending"` → change to `"open"`
- Append to `statusHistory` if status changed
- Return: `{ data: updatedAuditRequest }`

### DELETE — Admin removes a tester from a project
- Body: `{ testerId: string }`
- Verify caller is admin
- Set that tester's `workStatus` to `"removed"` (do not delete from array — preserve history)
- Return: `{ data: updatedAuditRequest }`

---

## File 7: `app/api/admin/testers/route.ts` (CREATE)

### GET — List all users with role "tester" (for admin to pick when assigning)
- Query `User` where `{ role: "tester", status: "active" }`
- Return: `{ data: ITester[] }` with fields: `clerkUserId`, `firstName`, `lastName`, `email`

---

## Model Updates: `models/audit-request.ts`

Add these fields if they don't exist:
```ts
// In assignedTesters subdocument:
progressPercent: { type: Number, default: 0, min: 0, max: 100 }

// Top-level arrays:
comments: [CommentSchema]    // see File 4 above
attachments: [AttachmentSchema]  // see File 5 above
```

Create `CommentSchema` and `AttachmentSchema` as subdocuments with `{ _id: true }` (needs IDs for deletion later).

---

## Constraints
- TypeScript strict — no `any`
- All routes: connectToDatabase() + try/catch + console.error prefix + explicit status codes
- Role verification on every route (tester routes verify tester, admin routes verify admin)
- Do NOT modify `components/ui/`

---

## Definition of Done
- [ ] GET `/api/tester/tasks` returns tester's assigned projects
- [ ] PATCH `/api/tester/tasks/[id]` transitions workStatus correctly, rejects invalid transitions
- [ ] PATCH `/api/tester/tasks/[id]/progress` saves progressPercent
- [ ] GET/POST `/api/tester/tasks/[id]/comments` works
- [ ] POST `/api/tester/tasks/[id]/attachments` saves metadata
- [ ] POST `/api/admin/audit-requests/[id]/assign-tester` assigns tester, auto-opens project
- [ ] DELETE `/api/admin/audit-requests/[id]/assign-tester` sets workStatus to removed
- [ ] GET `/api/admin/testers` returns active testers list
- [ ] AuditRequest model updated with new fields
- [ ] `npm run build` passes (or at minimum no TypeScript errors in new files)
