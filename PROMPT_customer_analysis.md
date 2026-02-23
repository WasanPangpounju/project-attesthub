# PROMPT: Customer Dashboard — Full Implementation

## Context
AttestHub is a Next.js 16 App Router project using MongoDB/Mongoose, Clerk auth, TypeScript strict mode.
Read CLAUDE.md for project conventions before starting.

Existing patterns to follow:
- API routes use `export const runtime = "nodejs"`
- Auth via `auth()` from `@clerk/nextjs/server`
- DB via `connectToDatabase()` from `@/lib/mongodb`
- Role checked by querying `User` model (`clerkUserId` field)
- Always return `NextResponse.json({ data: ... })` on success
- Always return `NextResponse.json({ error: "..." }, { status: N })` on error
- Use try/catch in every route
- Next.js 16 params: `{ params }: { params: Promise<{ id: string }> }` then `await params`

---

## Current Problems to Fix

1. `GET /api/audit-requests` — does not use Clerk auth. It accepts `customerId` from a query param (unauthenticated). Any user can read any other user's projects by guessing a Clerk userId.
2. `POST /api/audit-requests` — accepts `customerId` from the request body (unauthenticated). Must be set server-side from the Clerk session.
3. `components/projects-list.tsx` — fetches all requests and filters client-side; leaks data; "View Details" and "Download Report" buttons do nothing.
4. No customer-facing project detail page exists.

---

## Part 1: Fix API Routes (backend only)

### File: `app/api/audit-requests/route.ts` (MODIFY)

#### GET — List the current customer's audit requests
- Get `userId` from Clerk `auth()`
- If no `userId` → return 401
- Verify `User.findOne({ clerkUserId: userId })` has `role === "customer"` — return 403 if not
- Query `AuditRequest.find({ customerId: userId })` sorted by `createdAt: -1`
- Support optional query param `status` to filter by project status
- Return `{ data: auditRequests }`

#### POST — Create a new audit request for the current customer
- Get `userId` from Clerk `auth()`
- If no `userId` → return 401
- Verify user has `role === "customer"` → return 403 if not
- **Ignore any `customerId` in the request body** — always use `userId` from Clerk session
- Required body fields: `projectName`, `serviceCategory`, `targetUrl` (or `locationAddress` for physical), `accessibilityStandard`, `servicePackage`
- Set `priceAmount: 0` and `priceCurrency: "THB"` as defaults (admin will update later)
- Return `{ data: newAuditRequest }` with status 201

---

### File: `app/api/audit-requests/[id]/route.ts` (MODIFY)

#### GET — Get a single audit request (customer must own it)
- Get `userId` from Clerk `auth()`
- Return 401 if not authenticated
- Find `AuditRequest` by `_id`
- Return 404 if not found
- Return 403 if `auditRequest.customerId !== userId`
- Return `{ data: auditRequest }`

#### DELETE — Cancel/delete own audit request (only if status === "pending")
- Get `userId` from Clerk `auth()`
- Verify ownership: `customerId === userId`, else 403
- Only allow deletion if `status === "pending"` — return 400 with `{ error: "Cannot delete a project that is already in progress" }` otherwise
- Delete and return `{ message: "Project deleted" }`

Remove the PATCH handler from this file (it was for admin use only — admin already has `app/api/admin/audit-requests/[id]/route.ts`).

---

### File: `app/api/customer/projects/[id]/comments/route.ts` (CREATE)

#### GET — List comments on a project the customer owns
- Verify `userId` from Clerk auth
- Verify `AuditRequest.customerId === userId`
- Return `{ data: auditRequest.comments }`

#### POST — Customer posts a comment
- Body: `{ text: string }`
- Verify ownership
- Push comment with `authorId: userId`, `authorName` from `User` record (firstName + lastName), `text`, `createdAt: new Date()`
- Return `{ data: newComment }`

---

## Part 2: Customer Dashboard UI

### File: `components/projects-list.tsx` (MODIFY)

Rewrite to use Clerk auth server-side (the API now scopes by session):

- Remove the client-side `customerId` filter — `GET /api/audit-requests` now returns only the current customer's projects
- Add a `status` filter tab bar: **All | Pending | In Progress | Completed**
  - "Pending" → status `pending`
  - "In Progress" → status `open | in_review | scheduled`
  - "Completed" → status `completed | cancelled`
- Map all 6 API statuses to proper display labels and badge colors:
  | DB Status    | Label       | Badge color class                      |
  |-------------|-------------|----------------------------------------|
  | pending     | Pending     | `bg-muted text-muted-foreground`       |
  | open        | Open        | `bg-blue-500/20 text-blue-600`         |
  | in_review   | In Review   | `bg-yellow-500/20 text-yellow-600`     |
  | scheduled   | Scheduled   | `bg-purple-500/20 text-purple-600`     |
  | completed   | Completed   | `bg-green-500/20 text-green-600`       |
  | cancelled   | Cancelled   | `bg-destructive/15 text-destructive`   |
- Make "View Details" button a `<Link href={`/dashboard/customer/projects/${project.id}`}>` (real navigation)
- Remove the "Download Report" button (not implemented yet; don't show fake buttons)
- Show real progress derived from workStatus of assignedTesters:
  - No testers assigned → 0%
  - Any tester `working` → average of their `progressPercent` values (default 0 if missing)
  - All testers `done` → 100%
  - Fall back to status-based estimate if no tester entries

---

### File: `app/dashboard/customer/projects/[id]/page.tsx` (CREATE)

Customer project detail page. Server component that fetches data server-side.

Layout: full-page with a back button → `/dashboard/customer`

#### Section 1 — Project Header
- Project name (h1), status badge, service category + package badges
- Created date, due date (if set), accessibility standard

#### Section 2 — Status Timeline
Show a horizontal step indicator with these stages in order:
`Pending → Open → In Review → Scheduled → Completed`
- Highlight completed steps (those before/including current status) in primary color
- If cancelled, show a "Cancelled" indicator instead

#### Section 3 — Overview Cards (3-column grid)
- **Assigned Testers**: count of active testers (workStatus != "removed"), their roles
- **Overall Progress**: average progressPercent across non-removed testers, shown as a progress bar
- **Target**: `targetUrl` (clickable link) or `locationAddress` (for physical)

#### Section 4 — Test Cases Summary (read-only)
- Fetch `GET /api/admin/audit-requests/[id]/scenarios` (reuse admin endpoint — add customer access: allow if `AuditRequest.customerId === userId`)
- For each scenario, show: title, assigned tester name (display as "Tester" if not resolvable), number of test cases, pass/fail/skip/pending counts
- Collapsed by default; expandable per scenario
- Do NOT show step-by-step instructions — only titles and results summary

#### Section 5 — Comments
- Fetch comments from `GET /api/customer/projects/[id]/comments`
- Show a list of comments (author name, date, text)
- Post new comment form: `<Textarea>` + submit button
  - Use `POST /api/customer/projects/[id]/comments`
  - Optimistic update: append comment immediately, then refresh
- Use Sonner toast for success/error

#### Section 6 — Project Details
Collapsible card showing all submitted details:
- Service category, service package, devices, special instructions
- Files submitted at creation (name + size only; no download link unless `url` is stored)

---

## Part 3: API Access for Customer on Scenarios

### File: `app/api/admin/audit-requests/[id]/scenarios/route.ts` (MODIFY)

Currently admin-only. Add customer read access:

#### GET — also allow the project owner (customer) to read
- After verifying `userId`, check if user is admin OR if `AuditRequest.customerId === userId`
- If neither → 403
- Customer sees the same response as admin (no filtering needed for read)

---

## Constraints
- TypeScript strict — no `any` unless unavoidable (annotate with `// eslint-disable-line`)
- All API routes: `connectToDatabase()` + try/catch + `console.error("[ROUTE]", err)`
- Role verification on every route
- Do NOT modify `components/ui/`
- Do NOT modify the Admin dashboard or Tester dashboard
- Follow the DashboardLayout / RoleGuard patterns already used in `app/dashboard/customer/page.tsx`
- Use Sonner (`import { toast } from "sonner"`) for all user-facing notifications

---

## Definition of Done
- [ ] `GET /api/audit-requests` requires Clerk auth, returns only caller's projects
- [ ] `POST /api/audit-requests` sets `customerId` from Clerk session (ignores body field)
- [ ] `GET /api/audit-requests/[id]` enforces ownership (403 if not owner)
- [ ] `DELETE /api/audit-requests/[id]` only allows pending projects
- [ ] `GET/POST /api/customer/projects/[id]/comments` works with ownership check
- [ ] `components/projects-list.tsx` uses real status tabs, proper badges, working "View Details" links
- [ ] `app/dashboard/customer/projects/[id]/page.tsx` renders all 6 sections
- [ ] Customer can read scenarios/test case summaries on their own project
- [ ] Customer can post and view comments
- [ ] `npm run build` passes with no TypeScript errors in new/modified files
