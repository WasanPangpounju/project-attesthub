# Tester Role — Code Review

Status: Review done 2026-06-19. No HIGH or MEDIUM issues found. All security checks passed.

## Scope

Full review of the Tester role API security: role checks, ownership checks,
status validation, and auth patterns across all 7 tester/assign-tester endpoints.
See `USER_FLOWS.md` for the overall flow map.

## Findings

### ✅ All endpoints — Role check via MongoDB (not Clerk-only)

All 7 endpoints use `requireTester()` or `requireAdmin()` helpers that perform
`User.findOne({ clerkUserId: userId })` and verify `user.role === "tester"` or
`"admin"` from MongoDB. No endpoint relies on Clerk `sessionClaims` alone.

### ✅ All tester endpoints — Ownership enforced

- `GET /api/tester/tasks` — query filter `"assignedTesters.testerId": userId`
- `GET/PATCH /api/tester/tasks/[id]` — `assignedTesters.find(t => t.testerId === userId)`, 403 if not found
- `PATCH /api/tester/tasks/[id]/progress` — `findOneAndUpdate` with `"assignedTesters.testerId": userId` as filter
- `GET /api/tester/tasks/[id]/scenarios` — `Scenario.find({ assignedTesterId: userId })`
- `PATCH .../test-cases/[tcId]/result` — verifies `scenario.assignedTesterId === userId` before update

### ✅ Status/action validation present

- `PATCH /api/tester/tasks/[id]` — `VALID_ACTIONS = ["accept","reject","start","done"]` + state-machine
  `TRANSITIONS` map enforces valid from→to transitions; invalid states return 400
- `PATCH .../result` — `VALID_STATUSES = ["pass","fail","skip"]` + order enforcement:
  previous test cases (lower order) must not be "pending" before submitting current result
- `PATCH /api/tester/tasks/[id]/progress` — validates `progressPercent` is number between 0–100
- `POST /api/admin/.../assign-tester` — validates tester role ∈ `["lead","member","reviewer"]`,
  checks testerId has `role: "tester"` in MongoDB, and prevents duplicate assignment (409)

### 🟡 LOW — Admin bypasses ownership check on comments (by design)

`GET/POST /api/tester/tasks/[id]/comments` uses `requireTesterOrAdmin()`.
For tester callers, `isAssigned` check enforces ownership. For admin callers,
no ownership check — admin can read/post comments on any task.
This is intentional per spec (admin oversight), but is an asymmetry worth noting.
No fix needed.

## No Issues Found

- No TODO or commented-out auth in any of the 7 reviewed files
- No endpoints that skip role check
- No endpoints where a tester can access another tester's task

## Verification

- `npx tsc --noEmit` — repo-wide run shows ~50 pre-existing errors, none of them
  auth/security related. Within the 7 reviewed files, `tsc` reports TS7006
  ("implicit any" on `.find()`/`.filter()` callback params) in all 7 files:
  `tasks/route.ts` (2), `tasks/[id]/route.ts` (2), `tasks/[id]/comments/route.ts` (2),
  `tasks/[id]/scenarios/route.ts` (1), `.../test-cases/[tcId]/result/route.ts` (2),
  `.../test-cases/[tcId]/attachments/route.ts` (2), and
  `admin/audit-requests/[id]/assign-tester/route.ts` (1). These are type-inference
  style issues only (missing explicit param types on array callbacks) — they do
  not affect runtime behavior, auth logic, or any of the findings above.
- Not manually end-to-end tested (no tester Clerk credentials available)

## Remaining follow-ups

- Manual end-to-end test: sign in as tester, confirm task list shows only
  assigned tasks, attempt to access another tester's task ID directly (expect 403)
- `app/api/tester/tasks/[id]/attachments/route.ts` not reviewed in this session
  (POST metadata only — not a high-risk endpoint, but worth a quick scan)
- Optional cleanup: add explicit param types to the TS7006 callback sites listed above
