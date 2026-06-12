# Customer Role — Code Review & Fixes

Status: Review done 2026-06-12, HIGH + MEDIUM fixes applied 2026-06-12.

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

### 🟡 MEDIUM — `PUT /api/profile` missing role-specific field validation — NOT YET FIXED

`app/api/profile/route.ts:134-196` accepts `testerProfile` /
`customerProfile` payloads without checking the submitter's role matches.
UI prevents this in practice but the API boundary doesn't enforce it.
Deferred — lower priority, no immediate exploit path found.

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
- Consider addressing the MEDIUM profile-role-check issue in a future pass
