# Claude Code Prompt — Admin User Management

## Context
This is the AttestHub project (Next.js 16 App Router, TypeScript strict, Tailwind CSS 4, Shadcn/ui, Clerk auth, MongoDB/Mongoose).
Read `PROJECT_BRIEF.md` at the root for full architecture reference before making any changes.

---

## Task
Build a **User Management** feature for the Admin dashboard. This includes:
1. A new API route to list and update users
2. A reusable `AdminUserTable` component
3. A new Admin page at `/dashboard/admin/users`

Follow ALL existing coding conventions from PROJECT_BRIEF.md section 7.

---

## File 1 — API Route
**Path:** `app/api/admin/users/route.ts`

Create two handlers:

### GET `/api/admin/users`
- Connect to MongoDB, query the `User` model
- Support query params:
  - `search` — regex match on `email`, `firstName`, `lastName` (case-insensitive)
  - `role` — filter by role (`admin`, `tester`, `customer`). If `role=unassigned`, filter `{ roleAssigned: false }`
  - `status` — filter by `active` or `suspended`
  - `page` (default `1`) and `limit` (default `20`) for pagination
- Sort by `createdAt` descending
- Return: `{ data: User[], pagination: { total, page, limit, totalPages } }`

### PATCH `/api/admin/users`
- Accept JSON body: `{ clerkUserId: string, role?: string, status?: string }`
- Validate `clerkUserId` is present
- If `role` provided: validate it is one of `["admin", "tester", "customer"]`, set `role` and `roleAssigned: true`
- If `status` provided: validate it is one of `["active", "suspended"]`
- Use `findOneAndUpdate` with `{ new: true }`, always set `updatedAt: new Date()`
- Return: `{ data: UpdatedUser }`
- Return 404 if user not found

Use the standard try/catch + connectToDatabase() + explicit status code pattern.

---

## File 2 — Component
**Path:** `components/admin-user-table.tsx`

`"use client"` component. Full feature list:

### Data fetching
- Fetch from `GET /api/admin/users` on mount and whenever search/filter/page changes
- Use the cancelled-flag useEffect pattern from PROJECT_BRIEF.md
- Track `loading`, `error`, `users`, `pagination` state

### UI — Toolbar (above table)
- **Search input** — debounced 400ms, searches by name/email, shows Search icon inside input
- **Role filter** — `<Select>` dropdown: All Roles / Customer / Tester / Admin / Unassigned
- **Status filter** — `<Select>` dropdown: All Status / Active / Suspended
- **User count badge** — shows total number of users found (e.g. "24 users")

### UI — Table columns
| Column | Notes |
|---|---|
| User | Avatar (initials fallback) + Full name + Email below |
| Role | `<Badge>` with color: Admin=red, Tester=blue, Customer=green, Unassigned=gray |
| Status | `<Badge>`: Active=green with dot, Suspended=amber with dot |
| Joined | Formatted date (e.g. "12 Jan 2025") |
| Actions | Inline dropdown menu (see below) |

### UI — Inline Actions (Actions column)
Use Shadcn `<DropdownMenu>` triggered by a `⋯` icon button per row. Menu items:

1. **Assign Role** — submenu or grouped items to set role to Customer / Tester / Admin
2. **Toggle Status** — shows "Suspend User" if active, "Activate User" if suspended
3. Separator
4. **View Profile** — opens a Profile Modal (see below)

On action click → call `PATCH /api/admin/users` → on success update the row in local state (optimistic or re-fetch) → show Sonner toast success/error.

### UI — Profile Modal
`<Dialog>` that opens when "View Profile" is clicked. Shows:
- Avatar (large, initials fallback) + Full name + Email
- Role badge + Status badge
- Joined date
- Clerk User ID (monospace, copyable — click to copy, show checkmark briefly)
- **Edit section inside modal:**
  - Role `<Select>` (pre-filled with current role)
  - Status `<Select>` (pre-filled with current status)
  - Save button → calls PATCH → updates local state → Sonner toast

### UI — Loading & Empty states
- Loading: show skeleton rows (5 rows, matching table structure) using Shadcn `<Skeleton>`
- Error: show inline error message with retry button
- Empty: show centered message "No users found" with icon

### UI — Pagination
Below the table, show:
- "Showing X–Y of Z users" text
- Previous / Next buttons (disabled at boundaries)
- Current page indicator

### Styling conventions
- Use `cn()` from `@/lib/utils` for conditional classes
- Use Shadcn/ui components: `Table`, `Badge`, `Button`, `Input`, `Select`, `Dialog`, `DropdownMenu`, `Skeleton`, `Avatar`
- Use Lucide icons: `Search`, `MoreHorizontal`, `Shield`, `User`, `Ban`, `CheckCircle`, `Copy`, `Check`, `ChevronLeft`, `ChevronRight`
- ARIA labels on all icon-only buttons
- Responsive: table scrolls horizontally on small screens (`overflow-x-auto`)

---

## File 3 — Page
**Path:** `app/dashboard/admin/users/page.tsx`

Simple server component:
```tsx
import { AdminUserTable } from "@/components/admin-user-table"

export const metadata = {
  title: "User Management | AttestHub Admin",
}

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage user roles and account status across the platform.
        </p>
      </div>
      <AdminUserTable />
    </div>
  )
}
```

---

## File 4 — Sidebar Navigation (Edit existing)
**Path:** `components/dashboard-sidebar.tsx`

Add a nav link to the Admin section pointing to `/dashboard/admin/users` with label "Users" and icon `Users` from Lucide.
Place it after the existing "Projects" or "Dashboard" link in the admin nav group.

---

## Important Notes
- Do NOT modify anything in `components/ui/` (Shadcn primitives)
- Do NOT remove or modify `FORCE_ADMIN` bypasses — those will be handled in a separate task
- All Sonner toasts: use `toast.success("...")` and `toast.error("...")`
- The User model is at `models/User.ts` — import it as `import User from "@/models/User"`
- MongoDB connection: `import { connectToDatabase } from "@/lib/mongodb"`
- TypeScript strict — no `any` types; define interfaces for API response shapes

---

## Definition of Done
- [ ] `GET /api/admin/users` returns paginated user list with search/filter support
- [ ] `PATCH /api/admin/users` updates role and/or status correctly
- [ ] Table renders all columns with correct badges and formatting
- [ ] Inline role assignment works end-to-end (UI → API → local state update → toast)
- [ ] Inline suspend/activate works end-to-end
- [ ] Profile modal opens, displays data, and allows editing
- [ ] Loading skeletons show during fetch
- [ ] Empty and error states handled
- [ ] Pagination works correctly
- [ ] Sidebar has link to `/dashboard/admin/users`
- [ ] No TypeScript errors (`npm run lint` passes)
