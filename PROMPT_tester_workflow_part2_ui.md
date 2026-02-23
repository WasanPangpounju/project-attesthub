# Task: Tester Workflow + Admin Assign — Part 2: UI

## Prerequisites
Complete Part 1 (API Routes) before starting this part.
Read CLAUDE.md and PROJECT_BRIEF.md before starting.

---

## Overview
Replace all mock data in the Tester Dashboard with real API calls,
and add Tester Assignment UI to the Admin Project Detail page.

---

## Section A: Tester Dashboard (`app/dashboard/tester/page.tsx`)

Rewrite this page. Keep the bilingual (EN/TH) toggle if it already exists.
Replace ALL mock data with real API calls.

### Layout
```
[Header: "My Tasks" + language toggle]
[Stats Bar: Assigned | Accepted | In Progress | Done]
[Tab: All | Assigned | In Progress | Done]
[Task Cards list]
```

### Data Fetching
- On mount: `GET /api/tester/tasks`
- Pass `status` filter based on active tab
- Use cancelled-flag useEffect pattern

### Stats Bar
Count tasks by `workStatus` from API response:
- Assigned = `workStatus === "assigned"`
- Accepted = `workStatus === "accepted"`
- In Progress = `workStatus === "working"`
- Done = `workStatus === "done"`

### Task Card (per AuditRequest)
Each card shows:
- Project name + service category badge (website/mobile/physical)
- Customer ID (muted)
- Accessibility standard + service package
- **Progress bar** — from tester's `progressPercent` (0–100%)
- **workStatus badge** — color coded
- Due date (if set)
- **Action buttons** based on current workStatus:
  - `assigned` → [Accept] [Reject]
  - `accepted` → [Start Working]
  - `working` → [Mark as Done] + progress slider
  - `done` → [View Report] (disabled for now)
- Click card → opens Task Detail Drawer

### Task Detail Drawer (`<Sheet>` from Shadcn)
Opens from right side. Shows full task detail with tabs:

**Tab 1: Overview**
- All project info (name, URL/address, standard, package, devices)
- Priority badge + due date
- Admin notes (read-only)

**Tab 2: Progress**
- Current workStatus
- Progress percentage slider (0–100, step 5)
  - On change → debounce 500ms → call `PATCH /api/tester/tasks/[id]/progress`
  - Show saved indicator (checkmark) after success
- Action buttons (same as card)

**Tab 3: Comments**
- List existing comments (newest first)
  - Avatar + name + timestamp + text
- Add comment form at bottom:
  - `<Textarea>` + Send button
  - On submit → `POST /api/tester/tasks/[id]/comments`
  - Append to local state on success

**Tab 4: Attachments**
- List existing attachments with file icon + name + size
- Upload button → `<input type="file">` (hidden, triggered by button)
  - Accept: image/*, video/*, .pdf, .zip
  - On select → POST metadata to `/api/tester/tasks/[id]/attachments`
  - Show in list immediately (optimistic)

### Action Handlers
All actions call `PATCH /api/tester/tasks/[id]` with `{ action: "accept"|"reject"|"start"|"done" }`
- On success → update local task state (no full reload)
- Show Sonner toast on success/error
- Accept: toast "Task accepted"
- Reject: toast "Task rejected" + remove from list or move to removed
- Start: toast "Started working"
- Done: toast "Marked as complete"

---

## Section B: Admin Project Detail — Tester Assignment Tab

**Path:** `app/dashboard/admin/projects/[id]/page.tsx`

Find the **Testers tab** in the existing 4-tab layout. Replace mock/empty state with:

### Current Testers List
Fetch from the project's `assignedTesters` array (already in project detail API).
For each assigned tester:
- Avatar + name (fetch name from User by testerId if needed)
- Role badge (lead/member/reviewer)
- workStatus badge
- Progress bar (`progressPercent`)
- Assigned date
- Remove button (red) → calls `DELETE /api/admin/audit-requests/[id]/assign-tester`
  with `{ testerId }` → confirm with `<AlertDialog>` first

### Assign New Tester Form
Below the list, show a form:
- Tester `<Select>` — fetch from `GET /api/admin/testers`, show name + email
- Role `<Select>`: Lead / Member / Reviewer
- Note `<Input>` (optional)
- [Assign Tester] button → `POST /api/admin/audit-requests/[id]/assign-tester`
  → on success → append to local tester list → toast "Tester assigned"
- Disable tester options already assigned (workStatus !== "removed")

### Loading & Empty states
- Loading: skeleton rows
- Empty: "No testers assigned yet" with icon

---

## Section C: Admin Dashboard Stats (minor update)

**Path:** `app/dashboard/admin/page.tsx`

The "Active Testers" metric card currently shows mock data.
Update it to count distinct `testerId` values across all projects where
`workStatus` is `"accepted"` or `"working"`.

This can be done by adding a count to `GET /api/admin/audit-requests` response,
OR by a simple aggregation query in the admin page server component.

---

## Styling & Component Conventions
- Use `cn()` from `@/lib/utils`
- Shadcn components: `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `Slider`, `Progress`, `Textarea`, `Badge`, `Button`, `Avatar`, `AvatarFallback`, `Select`, `AlertDialog`
- Lucide icons: `CheckCircle`, `XCircle`, `Play`, `Flag`, `Upload`, `MessageSquare`, `Paperclip`, `ChevronRight`, `Clock`, `BarChart`
- Bilingual strings: keep existing EN/TH toggle pattern if present in tester page
- ARIA labels on all icon-only buttons
- Cancelled-flag useEffect for all data fetching
- Sonner toasts for all actions

---

## Definition of Done
- [ ] Tester dashboard shows real tasks from API (no mock data)
- [ ] Stats bar counts correctly from real data
- [ ] Tab filtering works (All / Assigned / In Progress / Done)
- [ ] Task card shows progress bar + correct action buttons per workStatus
- [ ] Accept/Reject/Start/Done actions call API and update UI
- [ ] Task detail drawer opens with 4 tabs
- [ ] Progress slider saves to API with debounce
- [ ] Comments tab loads and posts new comments
- [ ] Attachments tab lists and uploads file metadata
- [ ] Admin Testers tab shows real assigned testers
- [ ] Admin can assign new tester from dropdown of active testers
- [ ] Admin can remove tester (with AlertDialog confirm)
- [ ] `npm run build` passes
