# AttestHub — User Flows

Status: snapshot as of 2026-06-11. Sources: codebase (`models/`, `middleware.ts`,
`app/`, `app/api/`), `CLAUDE.md`, `landing-hero-scan-widget.md`,
`ai-summary-feature.md`.

## 1. Roles

The system supports **4 user types**:

| Role | Stored as | Description |
|------|-----------|-------------|
| **Guest** | (no account) | Unauthenticated visitor — free-scan only |
| **Customer** | `User.role = "customer"` | Submits audit requests, views progress/reports |
| **Tester** | `User.role = "tester"` | Performs accessibility audits on assigned projects |
| **Admin** | `User.role = "admin"` | Manages users, assigns roles/testers, oversees all projects |

**Role determination (`models/User.ts`):**
- `role: 'admin' | 'tester' | 'customer' | null`
- `roleAssigned: boolean` — false until an admin assigns a role
- `status: 'active' | 'suspended'`

**Auth flow:**
1. User signs up via Clerk → MongoDB `User` record created with `roleAssigned: false`
2. `/dashboard` checks the role:
   - `roleAssigned === false` → `/dashboard/pending` ("contact support" message)
   - `role === "admin"` → `/dashboard/admin`
   - `role === "tester"` → `/dashboard/tester`
   - `role === "customer"` → `/dashboard/customer`
3. Admin assigns role via `POST /api/admin/assign-role`

**Guards:**
- Server: `middleware.ts` protects all routes except public paths
  (`/`, `/sign-in`, `/sign-up`, `/free-scan`, `/api/guest-scan/*`,
  `/reports/shared/*`, `/api/reports/shared/*`)
  — `/reports/shared/(.*)` and `/api/reports/shared/(.*)` were added to
  `isPublicRoute` in `middleware.ts` on 2026-06-19 (previously missing,
  which would have forced guests to log in before viewing a shared report)
- Client: `components/role-guard.tsx` (`RoleGuard`) checks role on each
  protected page, shows "Role Assignment Pending" / "Access Denied"

**Known temporary hardcodes (per `CLAUDE.md`):**
- `app/dashboard/admin/page.tsx:87` — `FORCE_ADMIN = true` bypasses the role
  check (temporary, while role-based routing is finalized)
- `app/dashboard/page.tsx:14` — defaults redirect to admin dashboard

---

## 2. Guest

### Can do
- View landing page, run a free accessibility scan via the hero widget or
  `/free-scan`, view AI-generated summary + issues, view a publicly shared
  report (with valid token).

### Pages
- `/` — landing page (hero + free-scan widget, services, testimonials)
- `/free-scan` — standalone free-scan entry
- `/free-scan/result/[reportId]` — scan progress + results
- `/sign-in`, `/sign-up` — Clerk auth
- `/reports/shared/[token]` — public shared report (no login)

### Flow: Free Scan
```
/ (hero widget) or /free-scan
  → enter URL, submit
  → POST /api/guest-scan/start
      - validates URL
      - rate limit: 5 scans/hour/IP
      - 30-day cache per domain (returns cached result if fresh)
      - creates GuestScanReport (status: pending) → queues BullMQ job
  → redirect to /free-scan/result/[reportId]?cached=true|false
      - poll GET /api/guest-scan/[reportId]/status every 3s
        (status: pending → scanning → completed | failed)
      - on completed: GET /api/guest-scan/[reportId] (full report incl. aiSummary)
  → ResultView: score, issues, AI summary (overview/topIssues/recommendations/urgency)
  → sticky CTA bar: "สมัครใช้งานฟรี" → /sign-up | "ดูแพ็กเกจ" → /#services
```
See `ai-summary-feature.md` for AI summary internals (Anthropic Claude,
`models/GuestScanReport.ts`, 30-day TTL).

### Flow: Shared Report
```
/reports/shared/[token]
  → GET /api/reports/shared/[token]/data
      - checks shareToken + shareTokenExpiry on AuditRequest
  → view-only report page (no auth)
```

---

## 3. Customer

### Can do
- Create audit request projects, track status/progress, comment, manage
  team members (org members), generate/revoke share links, view reports
  (summary + WCAG), download PDF, edit own profile.

### Pages
- `/dashboard/customer` — projects list (cards, status filter tabs)
- `/dashboard/customer/new-project` — 3-step audit request form
- `/dashboard/customer/projects/[id]` — project detail
- `/dashboard/profile` — profile edit
- `/dashboard/reports/[projectId]`, `/summary`, `/wcag` — reports (own projects only)

### Flow: Onboarding
```
/sign-up → Clerk account created → MongoDB User (roleAssigned: false)
  → /dashboard → /dashboard/pending ("รอ admin กำหนดสิทธิ์")
  → [Admin assigns role = customer via POST /api/admin/assign-role]
  → /dashboard → /dashboard/customer
```

### Flow: Create & Track Project
```
/dashboard/customer
  → "สร้างโปรเจกต์ใหม่" → /dashboard/customer/new-project
      Step 1: project name, category (website/mobile/physical), target URL
      Step 2: WCAG standard, service package (automated/hybrid/expert), devices
      Step 3: special instructions, file uploads, login requirements
  → POST /api/audit-requests (status set to "pending", customerId from session)
  → redirect to /dashboard/customer/projects/[id]

/dashboard/customer/projects/[id]
  - Overview: details, current status, assigned testers
  - Status timeline (pending → open → in_review → scheduled → completed | cancelled)
  - Test case summary (per scenario, pass/fail/skip counts)
  - Comments: GET/POST /api/customer/projects/[id]/comments
  - Team Access: GET/POST /api/customer/projects/[id]/members,
    DELETE .../members/[memberId] (invite org members by email)
  - Share Link: POST/DELETE /api/reports/[projectId]/share
    (90-day token) → share /reports/shared/[token]
  - Report buttons → /dashboard/reports/[projectId] (summary/WCAG/PDF)
```

---

## 4. Tester

### Can do
- View assigned tasks, accept/start/complete work, update progress %,
  submit per-test-case results (pass/fail/skip), comment, upload
  attachments/evidence, edit own profile.

### Pages
- `/dashboard/tester` — task list (tabs: All/Assigned/In Progress/Done)
- `/dashboard/profile` — profile edit
- `/dashboard/reports/[projectId]`, `/summary`, `/wcag` — reports for assigned projects

### Flow: Onboarding
```
/sign-up → /dashboard → /dashboard/pending
  → [Admin assigns role = tester]
  → /dashboard → /dashboard/tester
```

### Flow: Task Workflow
```
/dashboard/tester
  → GET /api/tester/tasks (filtered by assignedTesters.testerId / workStatus)
  → Task card → open Sheet drawer:
      - Overview tab: customer/project details, target URL, standard, package,
        devices, special instructions, role (lead/member/reviewer)
      - Progress tab:
          * workStatus transitions via PATCH /api/tester/tasks/[id]:
            assigned --(accept)--> accepted --(start)--> working --(done)--> done
            (any) --(reject)--> removed
          * progress % slider (debounced) → PATCH /api/tester/tasks/[id]/progress
      - Test Cases tab: GET /api/tester/tasks/[id]/scenarios
          * per test case: result (pass/fail/skip) via
            PATCH .../scenarios/[scenarioId]/test-cases/[tcId]/result
          * evidence upload via POST .../test-cases/[tcId]/attachments (Cloudinary)
      - Comments tab: GET/POST /api/tester/tasks/[id]/comments
      - Files tab: POST /api/tester/tasks/[id]/attachments
```

---

## 5. Admin

### Can do
- Assign roles, manage all users, manage all audit requests/projects,
  assign/remove testers, change project status, manage scenarios/test
  cases & recommendations, run/schedule scans, view & validate all
  reports, manage profile-change requests.

### Pages
- `/dashboard/admin` — overview (metrics + recent projects table)
- `/dashboard/admin/users` — user list (`?role=customer`/`?role=tester`)
- `/dashboard/admin/users/[userId]/profile` — edit user, view tester stats
- `/dashboard/admin/projects/[id]` — project detail (General/Testers/Timeline/Comments tabs)
- `/dashboard/admin/scan` — manual/scheduled scans
- `/dashboard/profile` — profile edit
- `/dashboard/reports/[projectId]`, `/summary`, `/wcag` — all reports

### Flow: Role Assignment
```
/dashboard/admin/users?role=customer (or tester)
  → select user → POST /api/admin/assign-role { clerkUserId, role }
  → roleAssigned: true, role set
  → user redirected to correct dashboard on next /dashboard visit
```

### Flow: Project & Tester Management
```
/dashboard/admin → recent projects table → "View" → /dashboard/admin/projects/[id]
  - General tab: edit project details; change status
    (pending → open → in_review → scheduled → completed | cancelled)
  - Testers tab:
      * "Assign Tester" dialog → POST .../assign-tester
        (sets AssignedTester { testerId, role: lead|member|reviewer, workStatus: "assigned" })
        → status auto-opens pending → open on first assignment
      * remove tester (AlertDialog) → DELETE .../assign-tester
      * progress bars per tester (workStatus/progressPercent)
  - Timeline tab: status change history
  - Comments tab: admin comments + view all
  - Scenarios/Test Cases: GET/POST .../scenarios, .../test-cases,
    .../recommendations (incl. WCAG criteria multi-select)
```

### Flow: Scan Management
```
/dashboard/admin/scan
  - Manual: POST /api/admin/scan/start → poll GET /api/admin/scan/[jobId]/status
  - Scheduled: POST /api/admin/scan/schedule (cron expression)
  - View guest scans: GET /api/admin/guest-scans/[reportId]
```

---

## 6. Status Lifecycles

**AuditRequest.status** (`models/audit-request.ts`):
```
pending → open → in_review → scheduled → completed
                                  (cancelled possible from most states)
```
- pending: customer submitted, awaiting admin
- open: admin opened for tester acceptance (auto-set on first tester assign)
- in_review: tester(s) actively working
- scheduled: future audit scheduled (if scheduleEnabled)
- completed: all testers done, results compiled
- cancelled: terminated by admin

**AssignedTester.workStatus**:
```
assigned → accepted → working → done
   └────────────→ removed (from assigned or accepted)
```

---

## 7. Top-Level Flow Diagram (text)

```
Guest
 ├─ "/" (landing, hero scan widget)
 │    └─ POST /api/guest-scan/start → /free-scan/result/[reportId] (AI summary)
 ├─ "/free-scan" → same result flow
 ├─ "/reports/shared/[token]" (public, if valid)
 └─ "/sign-up" or "/sign-in"
       └─ Clerk account created → MongoDB User (roleAssigned: false)
            └─ "/dashboard" → "/dashboard/pending" (waiting for admin)

Admin (assigns role)
 └─ POST /api/admin/assign-role { role: customer|tester|admin }

Customer
 "/dashboard" → "/dashboard/customer"
   ├─ "new-project" (3-step form) → POST /api/audit-requests (status: pending)
   ├─ "projects/[id]"
   │    ├─ status timeline (pending→open→in_review→scheduled→completed/cancelled)
   │    ├─ comments, team members (org members), share link
   │    └─ "/dashboard/reports/[projectId]" (summary, WCAG, PDF, share)
   └─ "/dashboard/profile"

Tester
 "/dashboard" → "/dashboard/tester"
   └─ task list → task drawer
        ├─ workStatus: assigned → accepted → working → done (or removed)
        ├─ progress %, test case results (pass/fail/skip), evidence uploads
        └─ comments

Admin
 "/dashboard" → "/dashboard/admin"
   ├─ "users" → assign roles, manage testers/customers
   ├─ "projects/[id]" → assign/remove testers, change status, scenarios/test cases
   ├─ "scan" → manual/scheduled scans
   └─ "/dashboard/reports/[projectId]" → view/validate all reports
```

---

## 8. Related Documentation

- `CLAUDE.md` — architecture overview, tech stack, known hardcodes
- `landing-hero-scan-widget.md` — hero free-scan widget implementation details
- `ai-summary-feature.md` — AI summary generation & storage (guest scans)
- Other root-level `*.md` files (e.g. `ARCHITECTURE.md`, `PROJECT_BRIEF.md`,
  `audit-reports-ui.md`, `i18n-implementation.md`, etc.) contain
  feature-specific implementation notes from past work — consult them for
  deep dives on specific subsystems.

## 9. Open Questions / Gaps

- No "scan history" list for logged-in users to browse past free-scan
  reports (see `ai-summary-feature.md`).
- `FORCE_ADMIN = true` and the default-to-admin redirect in
  `app/dashboard/page.tsx` are temporary — verify these are resolved before
  relying on role-based routing in production.
- Some API routes have role checks "commented out / TODO" per `CLAUDE.md` —
  audit before production.
