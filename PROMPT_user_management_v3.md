# Task: Fix User Management — Sync + Pre-register + Full CRUD

## Background
The User Management page shows "0 users" even though users have logged in via Clerk (Google OAuth).
The root cause is likely that MongoDB `User` records are not being created automatically on first login.

This task fixes that sync issue AND adds pre-register + full CRUD for Admin.

---

## Part 1 — Fix: Auto-create MongoDB User on Clerk Login

### Investigate first
Check `app/api/profile/get-profile.ts` — this route should auto-create a MongoDB User record
when called. Confirm it calls `User.findOneAndUpdate({ clerkUserId }, {...}, { upsert: true })` or similar.

Then check: **where is this route called after login?**
- Look in `app/dashboard/page.tsx` — is `get-profile` fetched on mount?
- Look in `middleware.ts` — is there any user sync logic?

### Fix required
The dashboard redirect page (`app/dashboard/page.tsx`) must call `GET /api/profile/get-profile`
on every visit to ensure the MongoDB record exists. If it already does this, confirm the
`get-profile` route actually creates the record with upsert.

Verify `get-profile.ts` uses this pattern:
```ts
const user = await User.findOneAndUpdate(
  { clerkUserId },
  {
    $setOnInsert: {
      clerkUserId,
      email,
      firstName,
      lastName,
      roleAssigned: false,
      status: "active",
      createdAt: new Date(),
    },
    $set: { updatedAt: new Date() },
  },
  { upsert: true, new: true }
)
```

If the route doesn't do this — fix it so it does.

After fixing, the logged-in user (you) should appear in `/dashboard/admin/users` immediately.

---

## Part 2 — API: `app/api/admin/users/route.ts`

Create this file with four handlers:

### GET — List users with search/filter/pagination
Query params:
- `search` → regex on `email`, `firstName`, `lastName` (case-insensitive, `$options: "i"`)
- `role` → if `"unassigned"` filter `{ roleAssigned: false }`, else filter `{ role, roleAssigned: true }`
- `status` → `"active"` or `"suspended"`
- `page` (default `1`), `limit` (default `20`)

Sort: `{ createdAt: -1 }`
Return: `{ data: IUser[], pagination: { total, page, limit, totalPages } }`

### PATCH — Update user fields
Body: `{ clerkUserId: string, role?: string, status?: string, firstName?: string, lastName?: string, adminNote?: string }`
- `clerkUserId` required
- `role` must be one of `["admin","tester","customer"]` → also set `roleAssigned: true`
- `status` must be one of `["active","suspended"]`
- `firstName`, `lastName`, `adminNote` → update directly if provided
- Always set `updatedAt: new Date()`
- `findOneAndUpdate` with `{ new: true }`, return 404 if not found
- Return: `{ data: updatedUser }`

### POST — Pre-register user (Admin creates a placeholder)
Body: `{ email: string, firstName?: string, lastName?: string, role?: string, adminNote?: string }`
- `email` required, validate format with simple regex
- Check for existing record with same email → return 409 if exists
- Create new User with:
  ```ts
  {
    clerkUserId: `pre_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    email,
    firstName: firstName || "",
    lastName: lastName || "",
    role: role || undefined,
    roleAssigned: role ? true : false,
    status: "active",
    adminNote: adminNote || "",
    isPreRegistered: true,   // flag to know this record was created by admin
  }
  ```
- Return: `{ data: newUser }`

> Note: When the real user later logs in via Clerk and `get-profile` is called,
> it should match by email and update `clerkUserId` to the real Clerk ID.
> Update `get-profile.ts` to check `{ email }` first before creating a new record.

### DELETE — Remove MongoDB record only (Clerk untouched)
Body: `{ clerkUserId: string }`
- `clerkUserId` required
- `findOneAndDelete({ clerkUserId })`
- Return 404 if not found
- Return: `{ success: true, message: "User removed from platform. Clerk account is preserved." }`

Standard pattern for all handlers: `connectToDatabase()` + try/catch + explicit status + `console.error("[METHOD /api/admin/users]", err)`

---

## Part 3 — Update `models/User.ts`

Add `isPreRegistered` field:
```ts
isPreRegistered: { type: Boolean, default: false }
adminNote: { type: String, default: "" }
```

If `adminNote` already exists — skip. Add `isPreRegistered` only if missing.
Do not remove any existing fields.

---

## Part 4 — Component: `components/admin-user-table.tsx`

Full rewrite/create of this component. `"use client"`.

### Interfaces
```ts
interface IUser {
  _id: string
  clerkUserId: string
  email?: string
  firstName?: string
  lastName?: string
  role?: "admin" | "tester" | "customer"
  roleAssigned: boolean
  status: "active" | "suspended"
  adminNote?: string
  isPreRegistered?: boolean
  createdAt: string
}
interface IPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}
```

### Toolbar
- Search `<Input>` debounced 400ms (separate useEffect: watch `search` → delay 400ms → set `debouncedSearch` + reset page to 1)
- Role `<Select>`: All Roles / Customer / Tester / Admin / Unassigned
- Status `<Select>`: All Status / Active / Suspended  
- `"{total} users"` badge
- **"Add User" `<Button>`** (top-right) → opens Add User Modal

### Table Columns
| Column | Detail |
|--------|--------|
| User | Avatar initials + name bold + email muted below. Show `(pre-registered)` badge in secondary if `isPreRegistered: true` |
| Role | Badge: admin=destructive, tester=`bg-blue-100 text-blue-800`, customer=`bg-green-100 text-green-800`, unassigned=secondary |
| Status | Badge: active=`bg-green-100 text-green-800` with `●`, suspended=`bg-amber-100 text-amber-800` with `●` |
| Admin Note | Truncated 40 chars, `—` if empty |
| Joined | `toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })` |
| Actions | `<DropdownMenu>` with `<MoreHorizontal>` trigger |

### Inline Actions (DropdownMenu)
```
Set Role ▶  [ Customer | Tester | Admin ]   ← DropdownMenuSub
─────────────────────────────────────────
[ Suspend User ] or [ Activate User ]
─────────────────────────────────────────
[ Edit Profile ]                             ← opens Edit Modal
─────────────────────────────────────────
[ Remove from Platform ]                     ← red, opens AlertDialog
```

- Set Role → `PATCH { clerkUserId, role }` → update local state → `toast.success("Role updated to {role}")`
- Toggle Status → `PATCH { clerkUserId, status }` → update local state → toast
- Remove → `AlertDialog` with warning: "This removes the user's platform record. Their Clerk login account will be preserved." → on confirm → `DELETE` → remove from local state → toast

### Add User Modal (`<Dialog>` controlled by `addOpen` state)
Title: "Add User"
Fields:
- Email `<Input>` required
- First Name `<Input>`
- Last Name `<Input>`
- Role `<Select>`: No Role / Customer / Tester / Admin
- Admin Note `<Textarea>`

On submit → `POST /api/admin/users` → prepend new user to local state → `toast.success("User pre-registered")` → close modal
Show field-level error if email missing or duplicate (409 from API).
Loading state on Submit button.

### Edit Profile Modal (`<Dialog>` controlled by `editOpen` + `selectedUser`)
Pre-filled with selected user's data.
Fields:
- First Name `<Input>`
- Last Name `<Input>`
- Role `<Select>`: Customer / Tester / Admin
- Status `<Select>`: Active / Suspended
- Admin Note `<Textarea>`

Show read-only section:
- Email (plain text, not editable)
- Clerk User ID in `<code>` block + copy button (Copy→Check icon toggle 2s)
- Pre-registered badge if applicable

On Save → `PATCH /api/admin/users` with changed fields → update local state + `selectedUser` → toast → close on success
Loading state on Save button.

### Data Fetching
```ts
useEffect(() => {
  let cancelled = false
  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (roleFilter) params.set("role", roleFilter)
      if (statusFilter) params.set("status", statusFilter)
      params.set("page", String(page))
      params.set("limit", "20")
      const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" })
      const json = await res.json()
      if (!cancelled) {
        setUsers(json.data)
        setPagination(json.pagination)
      }
    } catch (e) {
      if (!cancelled) setError(String(e))
    } finally {
      if (!cancelled) setLoading(false)
    }
  }
  load()
  return () => { cancelled = true }
}, [debouncedSearch, roleFilter, statusFilter, page])
```

### Loading State
5 skeleton rows — each row has `<Skeleton>` per column with appropriate widths.

### Error State
`<div>` with red text error message + `<Button onClick={() => setPage(p => p)}>Retry</Button>`
(resetting page triggers re-fetch)

### Empty State
Centered column: Users icon (48px, muted) + "No users found" + "Try adjusting your search or filters."

### Pagination
Row below table:
- Left: "Showing {start}–{end} of {total} users"
- Right: Previous + Next buttons, disabled at boundaries, show current page

---

## Part 5 — Page: `app/dashboard/admin/users/page.tsx`

```tsx
import { AdminUserTable } from "@/components/admin-user-table"

export const metadata = { title: "User Management | AttestHub Admin" }

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add, edit, or remove users. Pre-registered users appear here until they log in.
          Removing a user deletes their platform record only — their Clerk login is preserved.
        </p>
      </div>
      <AdminUserTable />
    </div>
  )
}
```

---

## Part 6 — Sidebar: `components/dashboard-sidebar.tsx`

Add link in admin nav section:
- Icon: `<Users>` from `lucide-react`
- Label: `"Users"`
- Href: `/dashboard/admin/users`
- Place after existing Dashboard/Projects admin links

---

## Constraints
- Do NOT touch `components/ui/`
- Do NOT remove `FORCE_ADMIN` — handled separately
- Do NOT call Clerk Admin API (no `clerkClient.users.deleteUser` etc.)
- TypeScript strict — no `any`
- Use `cn()` from `@/lib/utils`
- Sonner: `toast.success(...)` / `toast.error(...)`

---

## Definition of Done
- [ ] Login as existing user → visit `/dashboard/admin/users` → see at least 1 user (self)
- [ ] GET with search/filter/pagination works
- [ ] POST pre-registers user, appears in table immediately
- [ ] PATCH updates role/status/name/adminNote, table row updates without full reload
- [ ] DELETE shows AlertDialog, removes row on confirm
- [ ] Add User modal validates email, shows 409 error if duplicate
- [ ] Edit modal pre-fills all fields, Clerk ID is copyable
- [ ] Pre-registered users show `(pre-registered)` indicator
- [ ] Loading skeletons, error state with retry, empty state all work
- [ ] Pagination correct
- [ ] Sidebar has Users link
- [ ] `npm run lint` passes
