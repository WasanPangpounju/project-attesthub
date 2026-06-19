# Admin Role — Code Review & Fixes

Status: Review done 2026-06-19. HIGH + MEDIUM issues fixed and committed (a9da4d8).

## Scope

Full review of the Admin role API security: role checks, commented-out auth,
input validation, and debug info leaks across all admin endpoints.
See `USER_FLOWS.md` for the overall flow map.

## Findings & Fixes

### 🔴 HIGH — Auth check commented out on `GET /api/admin/audit-requests/[id]` — FIXED

`app/api/admin/audit-requests/[id]/route.ts` had its role check commented out
with a Thai note "// ✅ ตอนนี้คุณใช้ user test เลยคอมเมนต์ไว้ก่อน", leaving
the endpoint accessible to any logged-in user (not just admins), exposing all
audit request data — a clear IDOR / broken access control vulnerability.

- **Fix**: replaced the commented-out `sessionClaims` check with a proper
  MongoDB lookup: `auth()` → `userId` (401 if missing) →
  `User.findOne({ clerkUserId: userId })` → 403 if `role !== "admin"`.
  Pattern matches all other admin endpoints in the project.
- `dbConnect()` was also moved above the user lookup so the DB is ready
  before the role check runs.

### 🔴 HIGH — Debug info leaked in error responses — FIXED

The same file returned internal debug properties in 400/404/500 responses:
`url`, `rawFromParams`, `parsedFromUrl`, `requestedId`, `requestedIdHex24`,
`sampleId` (a sample document `_id` fetched for debug purposes), and
`readyState` (MongoDB connection state).

- **Fix**: all debug fields removed from all three error responses (400, 404,
  500). The sample document query in the 404 branch was also deleted.

### 🟡 MEDIUM — `POST /api/admin/assign-role` was dead code — FIXED

`app/api/admin/assign-role.ts` was placed directly in `app/api/admin/` as a
plain `.ts` file rather than inside an `assign-role/` folder as `route.ts`.
Next.js App Router never registered it as an endpoint, so
`POST /api/admin/assign-role` returned 404 — meaning role assignment from the
Admin UI had never actually worked via this file.

- **Fix**: moved/recreated the file at `app/api/admin/assign-role/route.ts`
  (correct App Router path). Added `clerkUserId` non-empty validation (400 if
  missing). Deleted the old dead-code file via `git rm`.

### 🟢 LOW — No self-demotion safeguard

`PATCH /api/admin/users` and `POST /api/admin/assign-role` allow an admin to
change their own role or demote the last admin, potentially locking out all
admin access. No fix applied (low operational risk, would require coordination
between multiple admins to trigger accidentally); noted for future hardening.

### ~~🟢 LOW — `PUT .../test-cases/[tcId]` does not verify tcId belongs to scenarioId~~ (Fixed 2026-06-19)

~~`app/api/admin/audit-requests/[id]/scenarios/[scenarioId]/test-cases/[tcId]/route.ts`
queries `TestCase.findById(tcId)` without filtering by `scenarioId` or
`auditRequestId` from the URL. Since this endpoint is admin-only, the
practical risk is low, but the URL hierarchy contract is not enforced.~~
Fixed — see Session Log entry below.

### ✅ No issues in remaining endpoints

`audit-requests/route.ts`, `users/route.ts`, `testers/route.ts`,
`audit-requests/[id]/scenarios/route.ts`,
`profile-change-requests/[requestId]/route.ts` — all have MongoDB-based role
checks, no commented-out auth, and reasonable input validation.

Note on `profile-change-requests/[requestId]/route.ts`: the `approve` action
applies `changeReq.changes` via `$set`. This is safe because
`filterChangesByRole()` in `app/api/profile/route.ts` strips dangerous fields
(e.g. `role`, `clerkUserId`) from `changes` at creation time (fixed in
commit `634c9b4`). If that upstream filter were ever removed, this endpoint
would become a privilege-escalation vector.

## Verification

- `npx tsc --noEmit` — no new type errors introduced by any of these changes;
  all ~50 errors in the output are pre-existing in unrelated files
- Not manually end-to-end tested (no separate non-admin Clerk test credentials
  to confirm the 403 gate)

## Remaining follow-ups

- Manual end-to-end test: sign in as a non-admin, attempt
  `GET /api/admin/audit-requests/<id>` directly (expect 403)
- Scan remaining admin routes not covered in this review:
  `guest-scans/[reportId]`, `scan/*`, `users/[userId]/profile`,
  `users/[userId]/tester-stats`, `recommendations/*`
- Consider adding a self-demotion guard to `PATCH /api/admin/users` and
  `POST /api/admin/assign-role`

## Session Log — 2026-06-19

- **`app/api/admin/users/[userId]/profile/route.ts`** (PUT) — added
  `EDITABLE_FIELDS` whitelist and `pickEditableFields()` helper; request body
  is now filtered before `$set`, preventing admin from overwriting sensitive
  fields (`clerkUserId`, `_id`, `role`, `roleAssigned`, `status`, `email`,
  `createdAt`). Only `firstName`, `lastName`, `jobTitle`, `phone`, `bio`,
  `organization`, `testerProfile`, `adminProfile`, `notes`, and `isActive`
  can be updated through this endpoint now. Committed as `fe1745e`.
- **`app/api/admin/audit-requests/[id]/scenarios/[scenarioId]/route.ts`**
  (GET/PUT/DELETE) — replaced `Scenario.findById(scenarioId)` /
  `findByIdAndUpdate` / `findByIdAndDelete` with `findOne` /
  `findOneAndUpdate` / `findOneAndDelete` filtered on
  `{ _id: scenarioId, auditRequestId: id }`. Closes the LOW-severity
  hierarchy gap noted above: a scenario ID no longer resolves under the
  wrong audit request's URL — mismatches now return 404. Committed as
  `5b8990b`.
- **`app/api/admin/audit-requests/[id]/scenarios/[scenarioId]/test-cases/[tcId]/route.ts`**
  (GET/PUT/DELETE) — replaced `TestCase.findById(tcId)` with
  `TestCase.findOne({ _id: tcId, scenarioId })` so the URL hierarchy is
  enforced: a test case ID no longer resolves under the wrong scenario's URL.
  Committed as `8861fba`.
