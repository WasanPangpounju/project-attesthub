# Customer Role — Code Review & Fixes

Status: Review done 2026-06-12, HIGH + MEDIUM fixes applied and committed
(634c9b4) 2026-06-12.

## Scope

Full review of the Customer role flow: dashboard, project list, new-project
form, project detail (comments, team members, share link), reports access,
scan history, profile. See `USER_FLOWS.md` for the overall flow map.

## Findings & Fixes

### 🔴 HIGH — Team Access (org members) broken for invited members — FIXED

Two endpoints only checked `customerId === userId || admin`, missing the
`orgMembers` check that `app/api/audit-requests/[id]/route.ts:31-35` already
uses. Result: a customer who was *invited* to a project (added to
`orgMembers`) could open the project detail page, but:

- **`app/api/customer/projects/[id]/members/route.ts`**
  - `GET` (list team members) returned `403 Forbidden` for org members
  - **Fix**: added a new `requireAccess()` helper (owner, admin, **or
    org member**) used by `GET`. `POST` (invite new member) still uses the
    original `requireOwnerOrAdmin()` — inviting remains owner/admin-only,
    matching the existing owner-only `DELETE` in
    `members/[memberId]/route.ts`.

- **`app/api/admin/audit-requests/[id]/scenarios/route.ts`**
  - `GET` (test case summary shown on project detail page) returned `403`
    for org members
  - **Fix**: added `(auditRequest.orgMembers ?? []).includes(userId)` to the
    access check alongside `customerId === userId`.

### 🟡 MEDIUM — `POST /api/audit-requests` missing role check — FIXED

`app/api/audit-requests/route.ts` only checked `if (!userId)`, so any
authenticated user (tester/admin) could call the endpoint directly to create
a project, even though the UI form is customer-only.

- **Fix**: after `connectToDatabase()`, look up
  `User.findOne({ clerkUserId: userId })` and return `403 Forbidden` unless
  `user.role === "customer"`.

### 🟡 MEDIUM — `PUT /api/profile` missing role-specific field validation — FIXED

`app/api/profile/route.ts` previously stored the raw request body as the
`ProfileChangeRequest.changes`, which the admin-approval endpoint
(`app/api/admin/profile-change-requests/[requestId]/route.ts`) applies
directly via `$set`. A customer could send a `testerProfile` (or
`adminProfile`) payload and, if approved, have those cross-role fields
written to their own user document.

- **Fix**: added `filterChangesByRole()` in `app/api/profile/route.ts`,
  applied to the body before it is saved as `changes`:
  - All roles: `firstName`, `lastName`, `jobTitle`, `phone`, `bio`
  - `customer` only: `organization`
  - `tester` only: `testerProfile` (further restricted to
    `disabilityTypes`, `wcagKnowledge`, `screenReaders`, `devices`,
    `languages`, `bio`, `yearsExperience` — excludes admin-managed
    `totalProjects`/`totalEarnings`)
  - `admin` only: `adminProfile`
  - Any other field (e.g. `testerProfile` from a customer) is silently
    dropped before the change request is created or updated.

  **Verified** (2026-06-15): temporarily exported `filterChangesByRole()`
  and ran it directly via `npx tsx` against 3 payloads (customer, tester,
  admin each sending all of `organization`/`testerProfile`/`adminProfile`).
  Result matched expectations in all 3 cases — cross-role fields
  (`testerProfile`/`adminProfile` for a customer, `organization`/
  `adminProfile` for a tester, `testerProfile`/`organization` for an admin)
  were stripped, while the role's own fields passed through.

### 🟢 LOW — Comment submission race condition — NOT FIXED

`app/dashboard/customer/projects/[id]/page.tsx:579` — `setSubmittingComment`
guard already mitigates this. Low priority, left as-is.

## Verification

- `npx tsc --noEmit` — no new type errors introduced by these changes
  (2 pre-existing `TS7006` errors in `members/route.ts` for an implicit
  `any` on `cid`, unrelated to this fix, present before these edits too)
- Not yet manually tested end-to-end (invite a second account as org member,
  confirm they can view Team Access list + Test Case Summary on
  `/dashboard/customer/projects/[id]`)

## Remaining follow-ups

- Manually verify org-member access end-to-end as noted above
- Sign-in as customer not possible from this environment (no Clerk test
  credentials, no browser automation tool) — `PUT /api/profile` was only
  verified at the `filterChangesByRole()` unit level (see above), not via a
  real authenticated HTTP request

## Session Log — 2026-06-15

- **`app/dashboard/customer/projects/[id]/page.tsx`** — "โปรเจกต์ของฉัน /
  ดูรายละเอียด" → Section 6 "Project Details" (`detailsOpen` state, ~line
  395) now defaults to `useState(true)` instead of `false`, so submitted
  project details are shown expanded by default. The open/close toggle
  button (ChevronUp/ChevronDown) is unchanged — no UI/markup changes.
- **`app/api/profile/route.ts`** — `filterChangesByRole()` is now exported
  (`export function filterChangesByRole`) so it can be unit-tested directly
  with `npx tsx --env-file=.env.local <script>.ts` (module import triggers
  `lib/mongodb.ts`, which needs `MONGODB_URI` from `.env.local`). No
  behavior change from the export itself.
- Verified `filterChangesByRole()` strips cross-role fields for
  customer/tester/admin payloads (see verification note above).
