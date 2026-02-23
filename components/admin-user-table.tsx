"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Search,
  MoreHorizontal,
  Shield,
  User,
  Ban,
  CheckCircle,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Users,
  UserPlus,
} from "lucide-react"

// ─── Interfaces ───────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(firstName?: string, lastName?: string, email?: string) {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  if (firstName) return firstName[0].toUpperCase()
  if (email) return email[0].toUpperCase()
  return "?"
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

function getFullName(user: IUser) {
  const parts = [user.firstName, user.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : user.email || user.clerkUserId
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────

function RoleBadge({ role, roleAssigned }: { role?: string; roleAssigned: boolean }) {
  if (!roleAssigned || !role) {
    return <Badge variant="secondary">Unassigned</Badge>
  }
  const styles: Record<string, string> = {
    admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    tester: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    customer: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  }
  return (
    <Badge variant="secondary" className={cn(styles[role] ?? "bg-muted text-muted-foreground")}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  )
}

function StatusBadge({ status }: { status: "active" | "suspended" }) {
  if (status === "active") {
    return (
      <Badge
        variant="secondary"
        className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1.5"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
        Active
      </Badge>
    )
  }
  return (
    <Badge
      variant="secondary"
      className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 gap-1.5"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
      Suspended
    </Badge>
  )
}

// ─── Skeleton rows ─────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="border-border">
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
        </TableRow>
      ))}
    </>
  )
}

// ─── Add User Modal ────────────────────────────────────────────────────────────

interface AddUserModalProps {
  open: boolean
  onClose: () => void
  onCreated: (user: IUser) => void
}

function AddUserModal({ open, onClose, onCreated }: AddUserModalProps) {
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [role, setRole] = useState("")
  const [adminNote, setAdminNote] = useState("")
  const [emailError, setEmailError] = useState("")
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setEmail("")
    setFirstName("")
    setLastName("")
    setRole("")
    setAdminNote("")
    setEmailError("")
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError("")

    if (!email.trim()) {
      setEmailError("Email is required")
      return
    }

    setSaving(true)
    try {
      const body: Record<string, string> = { email: email.trim() }
      if (firstName.trim()) body.firstName = firstName.trim()
      if (lastName.trim()) body.lastName = lastName.trim()
      if (role) body.role = role
      if (adminNote.trim()) body.adminNote = adminNote.trim()

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      })
      const json = await res.json()

      if (res.status === 409) {
        setEmailError((json?.error as string) || "A user with this email already exists")
        return
      }
      if (!res.ok) throw new Error((json?.error as string) || `Request failed (${res.status})`)

      onCreated(json.data as IUser)
      toast.success("User pre-registered")
      handleClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create user")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Email <span className="text-destructive">*</span></label>
            <Input
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError("") }}
              placeholder="user@example.com"
              type="email"
              autoComplete="off"
            />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">First Name</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Last Name</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Role</label>
            <Select value={role} onValueChange={(v) => setRole(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="No Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Role</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="tester">Tester</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Admin Note</label>
            <Textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Internal notes about this user..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Profile Modal ────────────────────────────────────────────────────────

interface EditProfileModalProps {
  user: IUser | null
  open: boolean
  onClose: () => void
  onUpdate: (updated: IUser) => void
}

function EditProfileModal({ user, open, onClose, onUpdate }: EditProfileModalProps) {
  const [editFirstName, setEditFirstName] = useState("")
  const [editLastName, setEditLastName] = useState("")
  const [editRole, setEditRole] = useState("")
  const [editStatus, setEditStatus] = useState("")
  const [editAdminNote, setEditAdminNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user) {
      setEditFirstName(user.firstName ?? "")
      setEditLastName(user.lastName ?? "")
      setEditRole(user.role ?? "")
      setEditStatus(user.status)
      setEditAdminNote(user.adminNote ?? "")
    }
  }, [user])

  if (!user) return null

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const body: Record<string, string> = { clerkUserId: user.clerkUserId }
      if (editFirstName !== (user.firstName ?? "")) body.firstName = editFirstName
      if (editLastName !== (user.lastName ?? "")) body.lastName = editLastName
      if (editRole && editRole !== (user.role ?? "")) body.role = editRole
      if (editStatus !== user.status) body.status = editStatus
      if (editAdminNote !== (user.adminNote ?? "")) body.adminNote = editAdminNote

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok) throw new Error((json?.error as string) || `Request failed (${res.status})`)
      onUpdate(json.data as IUser)
      toast.success("User updated")
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update user")
    } finally {
      setSaving(false)
    }
  }

  function handleCopy() {
    if (!user) return
    navigator.clipboard.writeText(user.clerkUserId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Read-only info */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 shrink-0">
                <AvatarFallback className="text-base bg-primary/10 text-primary">
                  {getInitials(user.firstName, user.lastName, user.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold leading-tight">{getFullName(user)}</p>
                <p className="text-sm text-muted-foreground">{user.email ?? "—"}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <RoleBadge role={user.role} roleAssigned={user.roleAssigned} />
                  <StatusBadge status={user.status} />
                  {user.isPreRegistered && (
                    <Badge variant="secondary" className="text-xs">pre-registered</Badge>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Clerk User ID</p>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy Clerk User ID"
                className="flex items-center gap-2 w-full rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors text-left"
              >
                <code className="flex-1 truncate font-mono">{user.clerkUserId}</code>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
              </button>
            </div>
          </div>

          <Separator />

          {/* Edit fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">First Name</label>
                <Input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Last Name</label>
                <Input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Role</label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="tester">Tester</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Admin Note</label>
              <Textarea
                value={editAdminNote}
                onChange={(e) => setEditAdminNote(e.target.value)}
                placeholder="Internal notes about this user..."
                rows={3}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Row Actions ───────────────────────────────────────────────────────────────

interface RowActionsProps {
  user: IUser
  onUpdate: (updated: IUser) => void
  onEdit: (user: IUser) => void
  onDelete: (user: IUser) => void
}

function RowActions({ user, onUpdate, onEdit, onDelete }: RowActionsProps) {
  async function patchUser(fields: { role?: string; status?: string }) {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkUserId: user.clerkUserId, ...fields }),
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok) throw new Error((json?.error as string) || `Request failed (${res.status})`)
      onUpdate(json.data as IUser)
      if (fields.role) toast.success(`Role updated to ${fields.role}`)
      else toast.success(fields.status === "suspended" ? "User suspended" : "User activated")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update user")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Actions for ${getFullName(user)}`}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <Shield className="h-4 w-4" aria-hidden="true" />
            Set Role
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => patchUser({ role: "customer" })}>
              <User className="h-4 w-4 mr-2" aria-hidden="true" />
              Customer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => patchUser({ role: "tester" })}>
              <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
              Tester
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => patchUser({ role: "admin" })}>
              <Shield className="h-4 w-4 mr-2" aria-hidden="true" />
              Admin
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {user.status === "active" ? (
          <DropdownMenuItem
            onClick={() => patchUser({ status: "suspended" })}
            className="text-amber-600 focus:text-amber-600"
          >
            <Ban className="h-4 w-4 mr-2" aria-hidden="true" />
            Suspend User
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => patchUser({ status: "active" })}
            className="text-green-600 focus:text-green-600"
          >
            <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
            Activate User
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onEdit(user)}>
          <User className="h-4 w-4 mr-2" aria-hidden="true" />
          Edit Profile
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => onDelete(user)}
          className="text-destructive focus:text-destructive"
        >
          <Ban className="h-4 w-4 mr-2" aria-hidden="true" />
          Remove from Platform
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function AdminUserTable() {
  const [users, setUsers] = useState<IUser[]>([])
  const [pagination, setPagination] = useState<IPagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  const [addOpen, setAddOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteUser, setDeleteUser] = useState<IUser | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [search])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [roleFilter, statusFilter])

  // Fetch users
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

        const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" })
        const json = await res.json()
        if (!res.ok) throw new Error((json?.error as string) || `Request failed (${res.status})`)

        if (!cancelled) {
          setUsers(Array.isArray(json.data) ? (json.data as IUser[]) : [])
          setPagination(json.pagination as IPagination)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load users")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [debouncedSearch, roleFilter, statusFilter, page, refreshKey])

  function handleUserUpdate(updated: IUser) {
    setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)))
    if (selectedUser?._id === updated._id) setSelectedUser(updated)
  }

  function openEdit(user: IUser) {
    setSelectedUser(user)
    setEditOpen(true)
  }

  function openDeleteConfirm(user: IUser) {
    setDeleteUser(user)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deleteUser) return
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkUserId: deleteUser.clerkUserId }),
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok) throw new Error((json?.error as string) || `Request failed (${res.status})`)
      setUsers((prev) => prev.filter((u) => u.clerkUserId !== deleteUser.clerkUserId))
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }))
      toast.success("User removed from platform")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove user")
    } finally {
      setDeleteOpen(false)
      setDeleteUser(null)
    }
  }

  const showingFrom = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const showingTo = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-48 flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="user-search" className="sr-only">Search users</label>
            <Input
              id="user-search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border"
              autoComplete="off"
            />
          </div>

          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40" aria-label="Filter by role">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="tester">Tester</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40" aria-label="Filter by status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>

          {!loading && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              <span className="font-medium text-foreground">{pagination.total}</span>{" "}
              {pagination.total === 1 ? "user" : "users"}
            </span>
          )}
        </div>

        <Button onClick={() => setAddOpen(true)} className="shrink-0">
          <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
          Add User
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between gap-4"
        >
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">User</TableHead>
              <TableHead className="text-muted-foreground">Role</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Admin Note</TableHead>
              <TableHead className="text-muted-foreground">Joined</TableHead>
              <TableHead className="text-muted-foreground w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows />
            ) : users.length === 0 ? (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                    <Users className="h-12 w-12 opacity-30" aria-hidden="true" />
                    <p className="text-sm font-medium">No users found</p>
                    <p className="text-xs">Try adjusting your search or filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id} className="border-border hover:bg-muted/50">
                  {/* User */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(user.firstName, user.lastName, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-foreground leading-none">
                          {getFullName(user)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                        {user.isPreRegistered && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-1 h-4">
                            pre-registered
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell>
                    <RoleBadge role={user.role} roleAssigned={user.roleAssigned} />
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusBadge status={user.status} />
                  </TableCell>

                  {/* Admin Note */}
                  <TableCell className="text-sm text-muted-foreground max-w-[160px]">
                    {user.adminNote
                      ? user.adminNote.length > 40
                        ? user.adminNote.slice(0, 40) + "…"
                        : user.adminNote
                      : "—"}
                  </TableCell>

                  {/* Joined */}
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <RowActions
                      user={user}
                      onUpdate={handleUserUpdate}
                      onEdit={openEdit}
                      onDelete={openDeleteConfirm}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && pagination.total > 0 && (
        <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>
            Showing{" "}
            <span className="font-medium text-foreground">{showingFrom}</span>–
            <span className="font-medium text-foreground">{showingTo}</span> of{" "}
            <span className="font-medium text-foreground">{pagination.total}</span> users
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
              Previous
            </Button>
            <span className="text-sm">
              Page <span className="font-medium text-foreground">{pagination.page}</span> of{" "}
              <span className="font-medium text-foreground">{pagination.totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(user) => setUsers((prev) => [user, ...prev])}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        user={selectedUser}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onUpdate={handleUserUpdate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user from platform?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the user&apos;s platform record.{" "}
              {deleteUser && <strong>{getFullName(deleteUser)}</strong>}
              {deleteUser && "'s"} Clerk login account will be preserved — they can still
              sign in but will have no assigned role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
