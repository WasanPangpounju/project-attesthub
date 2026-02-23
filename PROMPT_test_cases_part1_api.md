# PROMPT: Test Cases & Scenarios — Part 1 (API + Models)

## Context
AttestHub is a Next.js 14 App Router project using MongoDB/Mongoose, Clerk auth, TypeScript strict mode.
Read CLAUDE.md for project conventions before starting.

Existing patterns to follow:
- API routes use `export const runtime = "nodejs"`
- Auth via `auth()` from `@clerk/nextjs/server`
- DB via `connectToDatabase()` from `@/lib/mongodb`
- Role checked by querying `User` model (`clerkUserId` field)
- Always return `NextResponse.json({ data: ... })` on success
- Always return `NextResponse.json({ error: "..." }, { status: N })` on error
- Use try/catch in every route

---

## Task: Backend only — NO UI changes

### 1. Create Model: `models/scenario.ts`

```typescript
export interface IScenario {
  auditRequestId: string        // ref to AuditRequest._id (string)
  title: string
  description?: string
  assignedTesterId: string      // clerkUserId of assigned tester
  order: number                 // display order within project
  createdBy: string             // clerkUserId of admin
  createdAt: Date
  updatedAt: Date
}
```

Schema rules:
- `auditRequestId` required, indexed
- `assignedTesterId` required
- `order` default 0
- timestamps: true
- Export default as `Scenario` model (guard against re-compile: `mongoose.models.Scenario || mongoose.model(...)`)

---

### 2. Create Model: `models/test-case.ts`

```typescript
export interface ITestStep {
  order: number
  instruction: string
}

export interface ITesterResult {
  testerId: string              // clerkUserId
  status: "pending" | "pass" | "fail" | "skip"
  note?: string
  attachments: {
    name: string
    size: number
    type: string
    url?: string
    uploadedAt: Date
  }[]
  testedAt?: Date
}

export interface ITestCase {
  scenarioId: string            // ref to Scenario._id (string)
  auditRequestId: string        // denormalized for easy query
  title: string
  description?: string
  steps: ITestStep[]
  expectedResult: string
  priority: "low" | "medium" | "high" | "critical"
  order: number                 // sequence within scenario — Tester must follow this order
  results: ITesterResult[]      // one entry per tester
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
```

Schema rules:
- `scenarioId` required, indexed
- `auditRequestId` required, indexed
- `steps` array with `{ order: Number, instruction: String }`
- `results` array with subdoc `{ _id: true }`, `attachments` nested array
- `priority` enum default `"medium"`
- `order` default 0
- timestamps: true
- Guard re-compile

---

### 3. Create API Routes

#### Admin — Scenarios

**`app/api/admin/audit-requests/[id]/scenarios/route.ts`**
- `GET` — list all scenarios for this auditRequest, sorted by `order` asc
  - populate each scenario with testCase count
  - return `{ data: scenarios }`
- `POST` — create scenario
  - body: `{ title, description?, assignedTesterId, order? }`
  - validate: title required, assignedTesterId required
  - check assignedTesterId exists in User collection with role "tester"
  - auto-set `order` to `(max existing order + 1)` if not provided
  - return `{ data: newScenario }` status 201

**`app/api/admin/audit-requests/[id]/scenarios/[scenarioId]/route.ts`**
- `GET` — get single scenario with its test cases (sorted by order)
- `PUT` — update scenario (title, description, assignedTesterId, order)
- `DELETE` — delete scenario AND all its test cases

#### Admin — Test Cases

**`app/api/admin/audit-requests/[id]/scenarios/[scenarioId]/test-cases/route.ts`**
- `GET` — list test cases in this scenario, sorted by `order` asc
- `POST` — create test case
  - body: `{ title, description?, steps: [{order, instruction}], expectedResult, priority?, order? }`
  - validate: title required, expectedResult required, steps must be array
  - auto-set `order` if not provided
  - set `scenarioId` and `auditRequestId` automatically
  - return `{ data: newTestCase }` status 201

**`app/api/admin/audit-requests/[id]/scenarios/[scenarioId]/test-cases/[tcId]/route.ts`**
- `GET` — single test case with all results
- `PUT` — update (title, description, steps, expectedResult, priority, order)
- `DELETE` — delete test case

#### Tester — View & Submit

**`app/api/tester/tasks/[id]/scenarios/route.ts`**
- `GET` — list scenarios assigned to THIS tester only
  - filter: `assignedTesterId === caller's clerkUserId`
  - for each scenario, include its test cases sorted by order
  - for each test case, include caller's result (from `results` array where `testerId === caller`)
  - if no result exists for caller, inject `{ status: "pending", note: "", attachments: [] }`
  - return `{ data: scenarios }`

**`app/api/tester/tasks/[id]/scenarios/[scenarioId]/test-cases/[tcId]/result/route.ts`**
- `PATCH` — submit or update result for this test case
  - body: `{ status: "pass"|"fail"|"skip", note? }`
  - validate caller is assigned to this scenario
  - **Order enforcement**: before allowing status change from "pending", check that all test cases with lower `order` in this scenario have a non-pending result for this tester. If not, return 400 `{ error: "Complete previous test cases first" }`
  - if result for this tester already exists → update it
  - if not → push new result
  - set `testedAt: new Date()`
  - return `{ data: updatedTestCase }`

**`app/api/tester/tasks/[id]/scenarios/[scenarioId]/test-cases/[tcId]/attachments/route.ts`**
- `POST` — add attachment metadata to tester's result
  - body: `{ name, size, type }`
  - validate caller is assigned to this scenario
  - find or create tester's result entry
  - push attachment to result's attachments array
  - return `{ data: updatedResult }`

---

### 4. Auth helpers (consistent with existing routes)

```typescript
async function requireAdmin(userId: string | null) {
  if (!userId) return null
  const user = await User.findOne({ clerkUserId: userId }).lean()
  return user?.role === "admin" ? user : null
}

async function requireTester(userId: string | null) {
  if (!userId) return null
  const user = await User.findOne({ clerkUserId: userId }).lean()
  return user?.role === "tester" ? user : null
}
```

---

### 5. After implementation

Run `npm run build` and confirm it passes with zero TypeScript errors before finishing.
Report all created files and routes.
