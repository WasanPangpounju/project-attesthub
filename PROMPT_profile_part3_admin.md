# PROMPT: User Profile System — Part 3: Admin Users Page + Profile Management

## Context
AttestHub Next.js 14 App Router, MongoDB/Mongoose, Clerk auth, TypeScript strict mode.
Read CLAUDE.md before starting. Parts 1 & 2 must be completed first.

---

## Overview

This part enhances the existing Admin Users page (`/dashboard/admin/users`) and adds
a full user profile management view accessible from it.

---

## Step 1: Enhance Admin Users List — `app/dashboard/admin/users/page.tsx`

Read the existing file first to understand current structure, then add:

### Add "Pending Approval" badge
For each user with `profileStatus === "pending_approval"`, show a badge:
```tsx
{user.profileStatus === "pending_approval" && (
  <Badge className="bg-yellow-100 text-yellow-800 text-xs gap-1">
    <Clock className="h-3 w-3" /> Pending Approval
  </Badge>
)}
```

### Add "View Profile" button to each user row
```tsx
<Button variant="ghost" size="sm" asChild>
  <Link href={`/dashboard/admin/users/${user.clerkUserId}/profile`}>
    <Eye className="h-4 w-4 mr-1" /> Profile
  </Link>
</Button>
```

### Add filter tab for "Pending Approval"
Add a 4th tab alongside existing role tabs: "Pending" — shows users where `profileStatus === "pending_approval"`.

Also display the count badge on the tab:
```tsx
<TabsTrigger value="pending" className="gap-2">
  Pending
  {pendingCount > 0 && (
    <span className="h-5 w-5 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center">
      {pendingCount}
    </span>
  )}
</TabsTrigger>
```

---

## Step 2: Admin User Profile Page — `app/dashboard/admin/users/[userId]/profile/page.tsx`

New page. Fetches `GET /api/admin/users/[userId]/profile`.

### Page layout:

```tsx
<main className="flex-1 p-6 lg:p-8 max-w-4xl space-y-6">
  {/* Back + header */}
  <div className="flex items-center justify-between gap-4">
    <Button variant="ghost" size="sm" asChild>
      <Link href="/dashboard/admin/users">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Users
      </Link>
    </Button>
    <div className="flex gap-2">
      {profileData.user.profileStatus === "pending_approval" && (
        <Button onClick={handleApprove} disabled={approving} className="bg-green-600 hover:bg-green-700 gap-2">
          {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Approve Changes
        </Button>
      )}
      <Button variant={adminEditMode ? "destructive" : "outline"} 
        onClick={() => setAdminEditMode(!adminEditMode)}>
        {adminEditMode ? "Cancel" : <><Pencil className="h-4 w-4 mr-1" /> Edit</>}
      </Button>
    </div>
  </div>

  {/* Pending changes panel */}
  {profileData.pendingRequest && (
    <Card className="border-yellow-200 bg-yellow-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-yellow-800">
          <Clock className="h-5 w-5" />
          Pending Profile Changes
          <span className="text-xs font-normal text-yellow-600 ml-1">
            Submitted {formatDate(profileData.pendingRequest.createdAt)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Diff view — show what changed */}
        <div className="space-y-2 text-sm">
          {Object.entries(profileData.pendingRequest.changes).map(([key, value]) => (
            <div key={key} className="flex items-start gap-3 py-1 border-b last:border-0">
              <span className="font-medium text-yellow-800 w-40 shrink-0 capitalize">
                {key.replace(/([A-Z])/g, " $1").replace(/\./g, " › ")}
              </span>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Current</span>
                  <span className="text-muted-foreground">
                    {getNestedValue(profileData.user, key) ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Requested</span>
                  <span className="font-medium text-yellow-900">
                    {typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1"
            onClick={handleApprove} disabled={approving}>
            <Check className="h-4 w-4" /> Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  )}

  {/* User info header card */}
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profileData.user.avatarUrl} />
          <AvatarFallback className="text-lg">
            {initials(profileData.user.firstName, profileData.user.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">
              {[profileData.user.firstName, profileData.user.lastName].filter(Boolean).join(" ") || "No name"}
            </h1>
            <Badge variant="outline" className="capitalize">{profileData.user.role}</Badge>
            {profileData.user.profileStatus === "pending_approval" && (
              <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending Approval</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{profileData.user.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ID: {profileData.user.clerkUserId}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Basic Info editable card */}
  <Card>
    <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
    <CardContent>
      {adminEditMode ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name</Label>
              <Input value={adminForm.firstName ?? ""} onChange={...} />
            </div>
            <div className="space-y-1">
              <Label>Last Name</Label>
              <Input value={adminForm.lastName ?? ""} onChange={...} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Job Title</Label>
            <Input value={adminForm.jobTitle ?? ""} onChange={...} />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={adminForm.phone ?? ""} onChange={...} />
          </div>
          <div className="space-y-1">
            <Label>Bio</Label>
            <Textarea value={adminForm.bio ?? ""} rows={3} onChange={...} />
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            ["Job Title", profileData.user.jobTitle],
            ["Phone", profileData.user.phone],
            ["Bio", profileData.user.bio],
          ].map(([label, val]) => (
            <div key={label} className={label === "Bio" ? "col-span-2" : ""}>
              <dt className="text-xs text-muted-foreground uppercase">{label}</dt>
              <dd className="mt-0.5">{val || "—"}</dd>
            </div>
          ))}
        </dl>
      )}
    </CardContent>
    {adminEditMode && (
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setAdminEditMode(false)}>Cancel</Button>
        <Button onClick={handleAdminSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save Changes
        </Button>
      </CardFooter>
    )}
  </Card>

  {/* Role-specific sections (same display pattern as the user-facing profile page) */}
  {/* Customer: Organization + Contract Files */}
  {/* Tester: Skills + Work History (show totalProjects) */}
  {/* Admin: Admin details */}
  {/* All sections are editable by admin in adminEditMode */}
</main>
```

### State:
```typescript
const [profileData, setProfileData] = useState<{ user: AdminUserProfile; pendingRequest?: PendingRequest } | null>(null)
const [loading, setLoading] = useState(true)
const [adminEditMode, setAdminEditMode] = useState(false)
const [adminForm, setAdminForm] = useState<Partial<AdminUserProfile>>({})
const [approving, setApproving] = useState(false)
const [saving, setSaving] = useState(false)
```

### `handleApprove`:
```typescript
async function handleApprove() {
  setApproving(true)
  try {
    const requestId = profileData!.pendingRequest!._id
    const res = await fetch(`/api/admin/profile-change-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    })
    if (!res.ok) throw new Error("Failed to approve")
    // Refetch profile
    const updated = await fetch(`/api/admin/users/${userId}/profile`).then(r => r.json())
    setProfileData(updated.data)
    toast.success("Profile changes approved!")
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Failed")
  } finally {
    setApproving(false)
  }
}
```

### `handleAdminSave`:
```typescript
async function handleAdminSave() {
  setSaving(true)
  try {
    const res = await fetch(`/api/admin/users/${userId}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adminForm),
    })
    if (!res.ok) throw new Error("Failed to save")
    const { data } = await res.json()
    setProfileData(prev => prev ? { ...prev, user: data } : prev)
    setAdminEditMode(false)
    toast.success("Profile updated!")
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Failed")
  } finally {
    setSaving(false)
  }
}
```

### Helper `getNestedValue(obj, dotPath)`:
```typescript
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}
```

---

## Step 3: Link from Admin Users page to profile page

In `app/dashboard/admin/users/page.tsx`, ensure each user row has the "Profile" button added in Step 1.
Also ensure the page links to `/dashboard/admin/users` from the sidebar nav (it should already — verify).

---

## Step 4: Pending Approval count badge on Admin sidebar nav

File: `components/dashboard-sidebar.tsx` (or wherever admin nav is)

Add a count badge on the "Users" nav item for admins showing how many profiles are pending approval.

Fetch count from `GET /api/admin/profile-change-requests?status=pending` and show it:

```tsx
// In AdminNav or similar component:
const [pendingProfileCount, setPendingProfileCount] = useState(0)

useEffect(() => {
  if (role !== "admin") return
  fetch("/api/admin/profile-change-requests?status=pending")
    .then(r => r.json())
    .then(({ data }) => setPendingProfileCount(data?.length ?? 0))
    .catch(() => {})
}, [role])

// On the Users nav item:
<span>Users</span>
{pendingProfileCount > 0 && (
  <span className="ml-auto h-5 w-5 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center">
    {pendingProfileCount}
  </span>
)}
```

---

## Step 5: Build

```bash
npm run build
```

Must pass with zero TypeScript errors. Report all files changed/created.
