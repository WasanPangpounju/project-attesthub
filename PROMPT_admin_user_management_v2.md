# Task: Admin User Management Feature

## Goal
Build a complete User Management system for the Admin dashboard.
Admin can view, edit, and delete users. Authentication is handled by Clerk (Google OAuth),
but business data (role, status, name, notes) is stored separately in MongoDB,
linked via `clerkUserId` as a foreign key.

---

## Architecture Reminder
- **Clerk** = Login / Session / Identity only (do NOT call Clerk Admin API)
- **MongoDB `User` model** = Role, status, name, adminNote — this is what admin manages
- Deleting a user = delete MongoDB record only → user can still login via Clerk but will have no role (treated as new unassigned user)
- Model path: `models/User.ts` | DB connection: `lib/mongodb.ts`

---

## Files to Create / Modify

### 1. `app/api/admin/users/route.ts` (CREATE)

**GET** — List all users with search + filter + pagination
- Query params: `search` (regex on email/firstName/lastName), `role` (admin/tester/customer/unassigned), `status` (active/suspended), `page` (default 1), `limit` (default 20)
- If `role=unassigned` → filter `{ roleAssigned: false }`
- Sort: `createdAt` descending
- Return: `{ data: IUser[], pagination: { total, page, limit, totalPages } }`

**PATCH** — Update a user's editable fields
- Body: `{ clerkUserId: string, role?: string, status?: string, firstName?: string, lastName?: string, adminNote?: string }`
- Validate `clerkUserId` required
- If `role` provided: must be one of `["admin","tester","customer"]` → also set `roleAssigned: true`
- If `status` provided: must be one of `["active","suspended"]`
- `firstName`, `lastName`, `adminNote` → update directly if provided
- Use `findOneAndUpdate` with `{ new: true }`, always update `updatedAt: new Date()`
- Return 404 if not found
- Return: `{ data: IUser }`

**DELETE** — Remove MongoDB record only (Clerk account untouched)
- Body: `{ clerkUserId: string }`
- Validate `clerkUserId` required
- Use `findOneAndDelete({ clerkUserId })`
- Return 404 if not found
- Return: `{ success: true, message: "User removed from platform. Clerk account is preserved." }`

Follow the standard pattern: `connectToDatabase()` + try/catch + explicit HTTP status codes + `console.error("[METHOD /api/admin/users]", err)`

---

### 2. `components/admin-user-table.tsx` (CREATE)

`"use client"` component. Full implementation:

#### State
```ts
const [users, setUsers] = useState<IUser[]>([])
const [pagination, setPagination] = useState<IPagination>({ total: 0, page: 1, limit: 20, totalPages: 1 })
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [search, setSearch] = useState("")
const [debouncedSearch, setDebouncedSearch] = useState("")
const [roleFilter, setRoleFilter] = useState("")
const [statusFilter, setStatusFilter] = useState("")
const [page, setPage] = useState(1)
const [selectedUser, setSelectedUser] = useState<IUser | null>(null)  // for profile modal
const [profileOpen, setProfileOpen] = useState(false)
```

#### Interfaces (define at top of file)
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
  createdAt: string
}

interface IPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}
```

#### Data Fetching
- useEffect with cancelled-flag pattern (see CLAUDE.md conventions)
- Fetch `/api/admin/users?search=...&role=...&status=...&page=...&limit=20`
- Triggers: debouncedSearch, roleFilter, statusFilter, page changes
- Separate useEffect for debounce: 400ms delay on `search` → set `debouncedSearch`, reset `page` to 1

#### Toolbar (above table)
- Search `<Input>` with `<Search>` icon inside (left-padded), placeholder "Search by name or email..."
- Role `<Select>`: options = All Roles / Customer / Tester / Admin / Unassigned
- Status `<Select>`: options = All Status / Active / Suspended
- Badge showing total: e.g. `"24 users"`
- All filters reset page to 1 on change

#### Table Columns
| Column | Detail |
|--------|--------|
| **User** | `<Avatar>` with initials fallback (firstName[0]+lastName[0] or email[0]) + Full name bold + email below in muted text |
| **Role** | `<Badge>`: admin=destructive, tester=blue (use `className` override), customer=green override, unassigned=secondary |
| **Status** | `<Badge>`: active=green with `●` dot prefix, suspended=amber with `●` dot prefix |
| **Name** | firstName + lastName (editable via modal) |
| **Admin Note** | Truncated to 40 chars, dash if empty |
| **Joined** | `new Date(createdAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })` |
| **Actions** | `<DropdownMenu>` with `⋯` `<MoreHorizontal>` trigger button |

#### Inline Actions (DropdownMenu per row)
```
Set Role →  [ Customer ] [ Tester ] [ Admin ]   ← DropdownMenuSub
──────────────────────────────────────────────
[ Suspend User ] or [ Activate User ]            ← toggle based on status
──────────────────────────────────────────────
[ View / Edit Profile ]                          ← opens Profile Modal
──────────────────────────────────────────────
[ Remove from Platform ]                         ← destructive, red text
```

- **Set Role**: call `PATCH` with `{ clerkUserId, role }` → update row in local state → `toast.success("Role updated")`
- **Toggle Status**: call `PATCH` with `{ clerkUserId, status: "suspended" | "active" }` → update row → toast
- **Remove**: show `<AlertDialog>` confirmation first → on confirm call `DELETE` → remove row from local state → `toast.success("User removed from platform")`
- All errors: `toast.error("Failed to ...")`
- Local state update pattern (no full re-fetch): `setUsers(prev => prev.map(u => u.clerkUserId === clerkUserId ? { ...u, ...updatedFields } : u))`

#### Profile Modal (`<Dialog>`)
Opens when "View / Edit Profile" clicked. `selectedUser` drives the content.

**Display section:**
- Large `<Avatar>` (size ~16) with initials
- Full name (h2) + email (muted)
- Role badge + Status badge side by side
- Joined date
- Clerk User ID in `<code>` monospace block + copy button (icon toggles Copy→Check for 2s)

**Edit section (below a `<Separator>`):**
- Label "Edit User"
- `firstName` `<Input>` pre-filled
- `lastName` `<Input>` pre-filled
- Role `<Select>` pre-filled (options: Customer/Tester/Admin)
- Status `<Select>` pre-filled (Active/Suspended)
- `adminNote` `<Textarea>` pre-filled, placeholder "Internal notes about this user..."
- Save `<Button>` → call `PATCH` with all changed fields → update `selectedUser` state + update row in table local state → `toast.success("User updated")` → close modal on success
- Loading state on Save button while saving

#### Loading State
5 skeleton rows matching table column widths using `<Skeleton>` — show when `loading === true`

#### Error State
Inline alert with retry `<Button>` — show when `error !== null`

#### Empty State
Centered: Users icon + "No users found" heading + "Try adjusting your search or filters." subtext

#### Pagination (below table)
- Left: "Showing X–Y of Z users" (calculate X = (page-1)*limit+1, Y = min(page*limit, total))
- Center: Page N of M
- Right: `<Button variant="outline">` Previous + Next, disabled at boundaries
- On page change → setPage → triggers re-fetch

---

### 3. `app/dashboard/admin/users/page.tsx` (CREATE)

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
          Manage user roles, status, and profile data. Removing a user deletes their platform
          record only — their Clerk login account is preserved.
        </p>
      </div>
      <AdminUserTable />
    </div>
  )
}
```

---

### 4. `components/dashboard-sidebar.tsx` (EDIT)

Find the admin navigation section. Add a link to `/dashboard/admin/users`:
- Icon: `<Users>` from `lucide-react`
- Label: `"Users"`
- Place after the existing Dashboard/Projects link in the admin nav group

Do not modify any other part of the sidebar.

---

## Constraints
- Do NOT touch `components/ui/` (Shadcn primitives)
- Do NOT remove or change `FORCE_ADMIN` — handled separately
- Do NOT call Clerk Admin API (no `clerkClient.users.deleteUser(...)` etc.)
- TypeScript strict — no `any`. Use the `IUser` and `IPagination` interfaces defined above
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes
- Sonner toasts only: `toast.success(...)` / `toast.error(...)`
- Shadcn components to use: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `Badge`, `Button`, `Input`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuSub`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`, `DropdownMenuTrigger`, `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `Skeleton`, `Avatar`, `AvatarFallback`, `Separator`, `Textarea`

---

## Definition of Done
- [ ] GET `/api/admin/users` — search, filter by role/status, pagination all work
- [ ] PATCH `/api/admin/users` — updates role, status, firstName, lastName, adminNote
- [ ] DELETE `/api/admin/users` — removes MongoDB record only, returns success message
- [ ] Table renders all 7 columns correctly
- [ ] Set Role inline action works end-to-end with toast
- [ ] Suspend/Activate inline action works end-to-end with toast
- [ ] Remove user shows AlertDialog confirmation before deleting
- [ ] Profile modal opens pre-filled, Save updates all fields, toast shown
- [ ] Clerk User ID copyable in modal
- [ ] Loading skeletons render during fetch
- [ ] Error state shows with retry button
- [ ] Empty state shows when no results
- [ ] Pagination "Showing X-Y of Z" and Prev/Next work correctly
- [ ] Sidebar has Users link pointing to `/dashboard/admin/users`
- [ ] `npm run lint` passes with zero errors
