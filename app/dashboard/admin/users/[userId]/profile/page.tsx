"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft, Pencil, Loader2, Check, Clock, FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"

// ─── Types ──────────────────────────────────────────────────────────────────

interface AdminUserProfile {
  _id: string
  clerkUserId: string
  email?: string
  firstName?: string
  lastName?: string
  role?: string
  roleAssigned: boolean
  status: string
  adminNote?: string
  jobTitle?: string
  phone?: string
  bio?: string
  avatarUrl?: string
  profileStatus?: string
  organization?: {
    name?: string
    registrationNumber?: string
    address?: string
    website?: string
    billingAddress?: string
    billingMethod?: string
  }
  contractFiles?: { name: string; url: string; publicId?: string; uploadedAt: string }[]
  testerProfile?: {
    disabilityTypes: string[]
    wcagKnowledge: string[]
    screenReaders: string[]
    devices: string[]
    languages: string[]
    bio?: string
    yearsExperience?: number
    totalProjects?: number
    totalEarnings?: number
  }
  adminProfile?: {
    department?: string
    responsibilities?: string
  }
}

interface PendingRequest {
  _id: string
  changes: Record<string, unknown>
  createdAt: string
}

interface ProfilePageData {
  user: AdminUserProfile
  pendingRequest?: PendingRequest
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(firstName?: string, lastName?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  if (firstName) return firstName[0].toUpperCase()
  return "?"
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  } catch { return "—" }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminUserProfilePage() {
  const { userId } = useParams<{ userId: string }>()

  const [profileData, setProfileData] = useState<ProfilePageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [adminEditMode, setAdminEditMode] = useState(false)
  const [adminForm, setAdminForm] = useState<Partial<AdminUserProfile>>({})
  const [approving, setApproving] = useState(false)
  const [saving, setSaving] = useState(false)

  async function fetchProfile() {
    const res = await fetch(`/api/admin/users/${userId}/profile`, { cache: "no-store" })
    if (!res.ok) throw new Error("Failed to load profile")
    const { data } = await res.json()
    return data as ProfilePageData
  }

  useEffect(() => {
    fetchProfile()
      .then(setProfileData)
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  function startAdminEdit() {
    if (!profileData) return
    setAdminForm({
      firstName: profileData.user.firstName ?? "",
      lastName: profileData.user.lastName ?? "",
      jobTitle: profileData.user.jobTitle ?? "",
      phone: profileData.user.phone ?? "",
      bio: profileData.user.bio ?? "",
      organization: profileData.user.organization,
      testerProfile: profileData.user.testerProfile,
      adminProfile: profileData.user.adminProfile,
    })
    setAdminEditMode(true)
  }

  async function handleApprove() {
    if (!profileData?.pendingRequest) return
    setApproving(true)
    try {
      const res = await fetch(`/api/admin/profile-change-requests/${profileData.pendingRequest._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      })
      if (!res.ok) throw new Error("Failed to approve")
      const updated = await fetchProfile()
      setProfileData(updated)
      toast.success("Profile changes approved!")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setApproving(false)
    }
  }

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
      setProfileData((prev) => prev ? { ...prev, user: data } : prev)
      setAdminEditMode(false)
      toast.success("Profile updated!")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setSaving(false)
    }
  }

  function setField(key: string, value: unknown) {
    setAdminForm((prev) => ({ ...prev, [key]: value }))
  }

  function setOrgField(key: string, value: string) {
    setAdminForm((prev) => ({ ...prev, organization: { ...(prev.organization ?? {}), [key]: value } }))
  }

  function setAdminProfileField(key: string, value: string) {
    setAdminForm((prev) => ({ ...prev, adminProfile: { ...(prev.adminProfile ?? {}), [key]: value } }))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 lg:p-8 max-w-4xl space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </main>
        </div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 lg:p-8">
            <p className="text-muted-foreground">User not found.</p>
          </main>
        </div>
      </div>
    )
  }

  const { user, pendingRequest } = profileData

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-4xl space-y-6">

            {/* Back + header actions */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/admin/users">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to Users
                </Link>
              </Button>
              <div className="flex gap-2">
                {user.profileStatus === "pending_approval" && (
                  <Button onClick={handleApprove} disabled={approving}
                    className="bg-green-600 hover:bg-green-700 gap-2">
                    {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve Changes
                  </Button>
                )}
                <Button variant={adminEditMode ? "destructive" : "outline"}
                  onClick={() => adminEditMode ? setAdminEditMode(false) : startAdminEdit()}>
                  {adminEditMode ? "Cancel" : <><Pencil className="h-4 w-4 mr-1" /> Edit</>}
                </Button>
              </div>
            </div>

            {/* Pending changes panel */}
            {pendingRequest && (
              <Card className="border-yellow-200 bg-yellow-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-yellow-800">
                    <Clock className="h-5 w-5" />
                    Pending Profile Changes
                    <span className="text-xs font-normal text-yellow-600 ml-1">
                      Submitted {formatDate(pendingRequest.createdAt)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {Object.entries(pendingRequest.changes).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-3 py-1 border-b last:border-0">
                        <span className="font-medium text-yellow-800 w-40 shrink-0 capitalize">
                          {key.replace(/([A-Z])/g, " $1").replace(/\./g, " › ")}
                        </span>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-xs text-muted-foreground block mb-0.5">Current</span>
                            <span className="text-muted-foreground text-xs">
                              {String(getNestedValue(user as unknown as Record<string, unknown>, key) ?? "—")}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block mb-0.5">Requested</span>
                            <span className="font-medium text-yellow-900 text-xs">
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

            {/* User header card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="text-lg">
                      {initials(user.firstName, user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold">
                        {[user.firstName, user.lastName].filter(Boolean).join(" ") || "No name"}
                      </h1>
                      <Badge variant="outline" className="capitalize">{user.role ?? "Unassigned"}</Badge>
                      {user.profileStatus === "pending_approval" && (
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending Approval</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">ID: {user.clerkUserId}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card>
              <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
              <CardContent>
                {adminEditMode ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>First Name</Label>
                        <Input value={(adminForm.firstName as string) ?? ""} onChange={(e) => setField("firstName", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Last Name</Label>
                        <Input value={(adminForm.lastName as string) ?? ""} onChange={(e) => setField("lastName", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Job Title</Label>
                      <Input value={(adminForm.jobTitle as string) ?? ""} onChange={(e) => setField("jobTitle", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Phone</Label>
                      <Input value={(adminForm.phone as string) ?? ""} onChange={(e) => setField("phone", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Bio</Label>
                      <Textarea value={(adminForm.bio as string) ?? ""} rows={3} onChange={(e) => setField("bio", e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    {([
                      ["Job Title", user.jobTitle],
                      ["Phone", user.phone],
                      ["Bio", user.bio],
                    ] as [string, string | undefined][]).map(([label, val]) => (
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
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </CardFooter>
              )}
            </Card>

            {/* Customer: Organization */}
            {user.role === "customer" && (
              <Card>
                <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
                <CardContent>
                  {adminEditMode ? (
                    <div className="space-y-3">
                      {([
                        ["name", "Organization Name"],
                        ["registrationNumber", "Registration Number"],
                        ["address", "Address"],
                        ["website", "Website"],
                        ["billingAddress", "Billing Address"],
                        ["billingMethod", "Billing Method"],
                      ] as [string, string][]).map(([key, label]) => (
                        <div key={key} className="space-y-1">
                          <Label>{label}</Label>
                          <Input
                            value={(adminForm.organization as Record<string, string> | undefined)?.[key] ?? ""}
                            onChange={(e) => setOrgField(key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <dl className="space-y-3 text-sm">
                      {([
                        ["Organization", user.organization?.name],
                        ["Registration No.", user.organization?.registrationNumber],
                        ["Address", user.organization?.address],
                        ["Website", user.organization?.website],
                        ["Billing Address", user.organization?.billingAddress],
                        ["Billing Method", user.organization?.billingMethod?.replace(/_/g, " ")],
                      ] as [string, string | undefined][]).map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-xs text-muted-foreground uppercase">{label}</dt>
                          <dd className="mt-0.5">{value || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Customer: Contract Files (read-only for admin) */}
            {user.role === "customer" && (user.contractFiles ?? []).length > 0 && (
              <Card>
                <CardHeader><CardTitle>Contracts & Documents</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {user.contractFiles?.map((file, idx) => (
                      <li key={idx} className="flex items-center gap-3 p-2 rounded-lg border text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <a href={file.url} target="_blank" rel="noopener noreferrer"
                          className="flex-1 truncate text-primary hover:underline">
                          {file.name}
                        </a>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tester: Skills + Work History */}
            {user.role === "tester" && (
              <>
                <Card>
                  <CardHeader><CardTitle>Accessibility Skills</CardTitle></CardHeader>
                  <CardContent>
                    <dl className="space-y-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground uppercase">Disability Types</dt>
                        <dd className="mt-1 flex flex-wrap gap-1">
                          {(user.testerProfile?.disabilityTypes ?? []).length > 0
                            ? user.testerProfile!.disabilityTypes.map((d) => (
                                <Badge key={d} variant="secondary" className="text-xs">{d.replace(/_/g, " ")}</Badge>
                              ))
                            : <span className="text-muted-foreground">—</span>}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground uppercase">WCAG Knowledge</dt>
                        <dd className="mt-1 flex flex-wrap gap-1">
                          {(user.testerProfile?.wcagKnowledge ?? []).map((v) => (
                            <Badge key={v} variant="outline" className="text-xs font-mono">
                              {v.replace("wcag_", "WCAG ").replace("_", ".")}
                            </Badge>
                          ))}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground uppercase">Screen Readers</dt>
                        <dd className="mt-1 flex flex-wrap gap-1">
                          {(user.testerProfile?.screenReaders ?? []).map((v) => (
                            <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
                          ))}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground uppercase">Devices</dt>
                        <dd className="mt-1 flex flex-wrap gap-1">
                          {(user.testerProfile?.devices ?? []).map((v) => (
                            <Badge key={v} variant="outline" className="text-xs">{v.replace(/_/g, " ")}</Badge>
                          ))}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground uppercase">Years Experience</dt>
                        <dd className="mt-0.5">{user.testerProfile?.yearsExperience ?? "—"}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Work History</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-3xl font-bold">{user.testerProfile?.totalProjects ?? 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Projects</p>
                      </div>
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-3xl font-bold">{user.testerProfile?.totalEarnings ?? 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total Earnings (satang)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Admin details */}
            {user.role === "admin" && (
              <Card>
                <CardHeader><CardTitle>Admin Details</CardTitle></CardHeader>
                <CardContent>
                  {adminEditMode ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label>Department</Label>
                        <Input
                          value={(adminForm.adminProfile as Record<string, string> | undefined)?.department ?? ""}
                          onChange={(e) => setAdminProfileField("department", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Responsibilities</Label>
                        <Textarea
                          value={(adminForm.adminProfile as Record<string, string> | undefined)?.responsibilities ?? ""}
                          rows={3}
                          onChange={(e) => setAdminProfileField("responsibilities", e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground uppercase">Department</dt>
                        <dd className="mt-0.5">{user.adminProfile?.department || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground uppercase">Responsibilities</dt>
                        <dd className="mt-0.5 whitespace-pre-wrap">{user.adminProfile?.responsibilities || "—"}</dd>
                      </div>
                    </dl>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}
