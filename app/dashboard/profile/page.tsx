"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import {
  Clock, Pencil, Loader2, FileText, Upload, X, ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { RoleGuard } from "@/components/role-guard"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { useTranslation } from "@/lib/i18n/useTranslation"

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContractFile {
  name: string
  url: string
  publicId?: string
  uploadedAt: string
}

interface TesterProfileData {
  disabilityTypes: string[]
  wcagKnowledge: string[]
  screenReaders: string[]
  devices: string[]
  languages: string[]
  bio?: string
  yearsExperience?: number
  totalProjects?: number
}

interface ProfileData {
  clerkUserId: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  jobTitle?: string
  phone?: string
  bio?: string
  avatarUrl?: string
  profileStatus: string
  organization?: {
    name?: string
    registrationNumber?: string
    address?: string
    website?: string
    billingAddress?: string
    billingMethod?: string
  }
  contractFiles?: ContractFile[]
  testerProfile?: TesterProfileData
  adminProfile?: {
    department?: string
    responsibilities?: string
  }
  pendingChangeRequest?: {
    _id: string
    changes: Record<string, unknown>
    createdAt: string
  }
}

interface ProfileForm {
  firstName: string
  lastName: string
  jobTitle: string
  phone: string
  bio: string
  organization: {
    name: string
    registrationNumber: string
    address: string
    website: string
    billingAddress: string
    billingMethod: string
  }
  testerProfile: {
    disabilityTypes: string[]
    wcagKnowledge: string[]
    screenReaders: string[]
    devices: string[]
    languages: string[]
    bio: string
    yearsExperience: number | ""
  }
  adminProfile: {
    department: string
    responsibilities: string
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(firstName?: string, lastName?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  if (firstName) return firstName[0].toUpperCase()
  return "?"
}

function buildForm(p: ProfileData): ProfileForm {
  return {
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    jobTitle: p.jobTitle ?? "",
    phone: p.phone ?? "",
    bio: p.bio ?? "",
    organization: {
      name: p.organization?.name ?? "",
      registrationNumber: p.organization?.registrationNumber ?? "",
      address: p.organization?.address ?? "",
      website: p.organization?.website ?? "",
      billingAddress: p.organization?.billingAddress ?? "",
      billingMethod: p.organization?.billingMethod ?? "",
    },
    testerProfile: {
      disabilityTypes: p.testerProfile?.disabilityTypes ?? [],
      wcagKnowledge: p.testerProfile?.wcagKnowledge ?? [],
      screenReaders: p.testerProfile?.screenReaders ?? [],
      devices: p.testerProfile?.devices ?? [],
      languages: p.testerProfile?.languages ?? [],
      bio: p.testerProfile?.bio ?? "",
      yearsExperience: p.testerProfile?.yearsExperience ?? "",
    },
    adminProfile: {
      department: p.adminProfile?.department ?? "",
      responsibilities: p.adminProfile?.responsibilities ?? "",
    },
  }
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { t } = useTranslation()
  const p = t.profilePage

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingContract, setUploadingContract] = useState(false)
  const contractFileRef = useRef<HTMLInputElement>(null)

  // ── option lists (must be inside component to pick up translated labels) ──
  const disabilityOptions = [
    { value: "blind", label: p.disabilityBlind },
    { value: "low_vision", label: p.disabilityLowVision },
    { value: "deaf", label: p.disabilityDeaf },
    { value: "hard_of_hearing", label: p.disabilityHardOfHearing },
    { value: "motor", label: p.disabilityMotor },
    { value: "cognitive", label: p.disabilityCognitive },
    { value: "none", label: p.disabilityNone },
  ]

  const deviceOptions = [
    { value: "desktop_windows", label: "Windows" },
    { value: "desktop_mac", label: "macOS" },
    { value: "ios", label: "iOS" },
    { value: "android", label: "Android" },
  ]

  const orgDisplayRows: [string, string | undefined][] = profile ? [
    [p.displayOrganization, profile.organization?.name],
    [p.displayRegistrationNo, profile.organization?.registrationNumber],
    [p.displayAddress, profile.organization?.address],
    [p.displayWebsite, profile.organization?.website],
    [p.displayBillingAddress, profile.organization?.billingAddress],
    [p.displayBillingMethod, profile.organization?.billingMethod?.replace(/_/g, " ")],
  ] : []

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then(({ data }) => setProfile(data ?? null))
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false))
  }, [])

  function startEdit() {
    if (!profile) return
    setForm(buildForm(profile))
    setEditMode(true)
  }

  function cancelEdit() {
    setEditMode(false)
    setForm(null)
  }

  function setField(key: keyof ProfileForm, value: string) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  function setOrgField(key: keyof ProfileForm["organization"], value: string) {
    setForm((prev) => prev ? { ...prev, organization: { ...prev.organization, [key]: value } } : prev)
  }

  function setAdminField(key: keyof ProfileForm["adminProfile"], value: string) {
    setForm((prev) => prev ? { ...prev, adminProfile: { ...prev.adminProfile, [key]: value } } : prev)
  }

  function toggleArrayField(path: "testerProfile.disabilityTypes" | "testerProfile.wcagKnowledge" | "testerProfile.screenReaders" | "testerProfile.devices" | "testerProfile.languages", value: string, checked: boolean) {
    const field = path.split(".")[1] as keyof ProfileForm["testerProfile"]
    setForm((prev) => {
      if (!prev) return prev
      const current = (prev.testerProfile[field] as string[]) ?? []
      const updated = checked ? [...current, value] : current.filter((v) => v !== value)
      return { ...prev, testerProfile: { ...prev.testerProfile, [field]: updated } }
    })
  }

  async function handleSubmit() {
    if (!form) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        jobTitle: form.jobTitle || undefined,
        phone: form.phone || undefined,
        bio: form.bio || undefined,
      }
      if (profile?.role === "customer") {
        body.organization = {
          name: form.organization.name || undefined,
          registrationNumber: form.organization.registrationNumber || undefined,
          address: form.organization.address || undefined,
          website: form.organization.website || undefined,
          billingAddress: form.organization.billingAddress || undefined,
          billingMethod: form.organization.billingMethod || undefined,
        }
      }
      if (profile?.role === "tester") {
        body.testerProfile = {
          disabilityTypes: form.testerProfile.disabilityTypes,
          wcagKnowledge: form.testerProfile.wcagKnowledge,
          screenReaders: form.testerProfile.screenReaders,
          devices: form.testerProfile.devices,
          languages: form.testerProfile.languages,
          bio: form.testerProfile.bio || undefined,
          yearsExperience: form.testerProfile.yearsExperience !== "" ? Number(form.testerProfile.yearsExperience) : undefined,
        }
      }
      if (profile?.role === "admin") {
        body.adminProfile = {
          department: form.adminProfile.department || undefined,
          responsibilities: form.adminProfile.responsibilities || undefined,
        }
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? "Failed to submit")
      }
      const { data } = await res.json()
      setProfile((prev) => prev ? { ...prev, profileStatus: data.profileStatus, pendingChangeRequest: data.pendingChangeRequest } : prev)
      setEditMode(false)
      setForm(null)
      toast.success("Profile submitted for approval")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleContractFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setUploadingContract(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/profile/contract-files", { method: "POST", body: formData })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? "Upload failed")
      }
      const { data } = await res.json()
      setProfile((prev) => prev ? { ...prev, contractFiles: [...(prev.contractFiles ?? []), data] } : prev)
      toast.success("Document uploaded")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploadingContract(false)
    }
  }

  async function handleDeleteContractFile(publicId: string) {
    try {
      const res = await fetch("/api/profile/contract-files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId }),
      })
      if (!res.ok) throw new Error("Failed to delete")
      setProfile((prev) => prev ? { ...prev, contractFiles: (prev.contractFiles ?? []).filter((f) => f.publicId !== publicId) } : prev)
      toast.success("Document removed")
    } catch {
      toast.error("Failed to remove document")
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["customer", "tester", "admin"]}>
        <div className="flex min-h-screen">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col">
            <DashboardHeader />
            <main className="flex-1 p-6 lg:p-8 max-w-3xl space-y-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </main>
          </div>
        </div>
      </RoleGuard>
    )
  }

  if (!profile) {
    return (
      <RoleGuard allowedRoles={["customer", "tester", "admin"]}>
        <div className="flex min-h-screen">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col">
            <DashboardHeader />
            <main className="flex-1 p-6 lg:p-8">
              <p className="text-muted-foreground">{p.failedToLoad}</p>
            </main>
          </div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={["customer", "tester", "admin"]}>
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-3xl space-y-6">

              {/* Back link */}
              <Button variant="ghost" size="sm" asChild className="-ml-2">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {p.backToDashboard}
                </Link>
              </Button>

              <div>
                <h1 className="text-2xl font-semibold">{p.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">{p.subtitle}</p>
              </div>

              {/* Pending approval banner */}
              {profile.profileStatus === "pending_approval" && (
                <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">{p.pendingBannerTitle}</p>
                    <p className="text-xs text-yellow-600 mt-0.5">
                      {p.pendingBannerBody}
                    </p>
                  </div>
                </div>
              )}

              {/* Section 1: Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>{p.personalInfoTitle}</CardTitle>
                  <CardDescription>{p.personalInfoDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={profile.avatarUrl} />
                      <AvatarFallback className="text-lg">
                        {initials(profile.firstName, profile.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-lg">
                        {[profile.firstName, profile.lastName].filter(Boolean).join(" ") || "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                      <Badge variant="outline" className="text-xs mt-1 capitalize">{profile.role}</Badge>
                    </div>
                  </div>

                  {editMode && form ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="firstName">{p.labelFirstName}</Label>
                          <Input id="firstName" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="lastName">{p.labelLastName}</Label>
                          <Input id="lastName" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="jobTitle">{p.labelJobTitle}</Label>
                        <Input id="jobTitle" value={form.jobTitle} onChange={(e) => setField("jobTitle", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="phone">{p.labelPhone}</Label>
                        <Input id="phone" type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="bio">{p.labelBio}</Label>
                        <Textarea id="bio" value={form.bio} rows={3} onChange={(e) => setField("bio", e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground text-xs uppercase">{p.labelJobTitle}</dt>
                        <dd className="mt-0.5">{profile.jobTitle || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs uppercase">{p.labelPhone}</dt>
                        <dd className="mt-0.5">{profile.phone || "—"}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground text-xs uppercase">{p.labelBio}</dt>
                        <dd className="mt-0.5">{profile.bio || "—"}</dd>
                      </div>
                    </dl>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  {editMode ? (
                    <>
                      <Button variant="outline" onClick={cancelEdit}>{p.btnCancel}</Button>
                      <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {p.btnSubmitApproval}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={startEdit} className="gap-2"
                      disabled={profile.profileStatus === "pending_approval"}>
                      <Pencil className="h-4 w-4" /> {p.btnEditProfile}
                    </Button>
                  )}
                </CardFooter>
              </Card>

              {/* Section 2: Customer Organization */}
              {profile.role === "customer" && (
                <Card>
                  <CardHeader>
                    <CardTitle>{p.organizationTitle}</CardTitle>
                    <CardDescription>{p.organizationDesc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {editMode && form ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label>{p.labelOrgName}</Label>
                          <Input value={form.organization.name} onChange={(e) => setOrgField("name", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>{p.labelRegistrationNumber}</Label>
                          <Input value={form.organization.registrationNumber} onChange={(e) => setOrgField("registrationNumber", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>{p.labelAddress}</Label>
                          <Textarea value={form.organization.address} rows={2} onChange={(e) => setOrgField("address", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>{p.labelWebsite}</Label>
                          <Input type="url" value={form.organization.website} onChange={(e) => setOrgField("website", e.target.value)} />
                        </div>
                        <div className="space-y-1">
<Label>{p.labelBillingAddress}</Label>
                          <Textarea value={form.organization.billingAddress} rows={2} onChange={(e) => setOrgField("billingAddress", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="billingMethod">{p.labelBillingMethod}</Label>
                          <select id="billingMethod" value={form.organization.billingMethod}
                            onChange={(e) => setOrgField("billingMethod", e.target.value)}
                            className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                            <option value="">{p.billingSelectPlaceholder}</option>
                            <option value="bank_transfer">{p.billingBankTransfer}</option>
                            <option value="credit_card">{p.billingCreditCard}</option>
                            <option value="promptpay">{p.billingPromptPay}</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <dl className="space-y-3 text-sm">
                        {orgDisplayRows.map(([label, value]) => (
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

              {/* Section 3: Contract Files (customer only) */}
              {profile.role === "customer" && (
                <Card>
                  <CardHeader>
                    <CardTitle>{p.contractsTitle}</CardTitle>
                    <CardDescription>{p.contractsDesc}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(profile.contractFiles ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{p.noDocuments}</p>
                    ) : (
                      <ul className="space-y-2">
                        {profile.contractFiles?.map((file, idx) => (
                          <li key={idx} className="flex items-center gap-3 p-2 rounded-lg border text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <a href={file.url} target="_blank" rel="noopener noreferrer"
                              className="flex-1 truncate text-primary hover:underline">
                              {file.name}
                            </a>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {new Date(file.uploadedAt).toLocaleDateString()}
                            </span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                              onClick={() => file.publicId && handleDeleteContractFile(file.publicId)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div>
                      <input type="file" ref={contractFileRef} className="hidden"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        aria-label={p.uploadDocument}
                        onChange={handleContractFileUpload} />
                      <Button variant="outline" size="sm" className="gap-2"
                        onClick={() => contractFileRef.current?.click()}
                        disabled={uploadingContract}>
                        {uploadingContract ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {p.uploadDocument}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">{p.uploadHint}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 4: Tester Skills */}
              {profile.role === "tester" && (
                <Card>
                  <CardHeader>
                    <CardTitle>{p.testerSkillsTitle}</CardTitle>
                    <CardDescription>{p.testerSkillsDesc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {editMode && form ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>{p.labelDisabilityTypes}</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {disabilityOptions.map((opt) => (
                              <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox"
                                  checked={form.testerProfile.disabilityTypes.includes(opt.value)}
                                  onChange={(e) => toggleArrayField("testerProfile.disabilityTypes", opt.value, e.target.checked)}
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>{p.labelWcagKnowledge}</Label>
                          <div className="flex flex-wrap gap-2">
                            {["wcag_2_0", "wcag_2_1", "wcag_2_2", "wcag_3_0"].map((v) => (
                              <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer border rounded px-2 py-1">
                                <input type="checkbox"
                                  checked={form.testerProfile.wcagKnowledge.includes(v)}
                                  onChange={(e) => toggleArrayField("testerProfile.wcagKnowledge", v, e.target.checked)}
                                />
                                {v.replace("wcag_", "WCAG ").replace("_", ".")}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>{p.labelScreenReaders}</Label>
                          <div className="flex flex-wrap gap-2">
                            {["jaws", "nvda", "voiceover", "talkback", "narrator", "orca"].map((v) => (
                              <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer border rounded px-2 py-1">
                                <input type="checkbox"
                                  checked={form.testerProfile.screenReaders.includes(v)}
                                  onChange={(e) => toggleArrayField("testerProfile.screenReaders", v, e.target.checked)}
                                />
                                {v.charAt(0).toUpperCase() + v.slice(1)}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>{p.labelDevices}</Label>
                          <div className="flex flex-wrap gap-2">
                            {deviceOptions.map((opt) => (
                              <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer border rounded px-2 py-1">
                                <input type="checkbox"
                                  checked={form.testerProfile.devices.includes(opt.value)}
                                  onChange={(e) => toggleArrayField("testerProfile.devices", opt.value, e.target.checked)}
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label>{p.labelYearsExperience}</Label>
                          <Input type="number" min={0} max={50}
                            value={form.testerProfile.yearsExperience}
                            onChange={(e) => setForm((prev) => prev ? {
                              ...prev,
                              testerProfile: { ...prev.testerProfile, yearsExperience: e.target.value === "" ? "" : Number(e.target.value) }
                            } : prev)}
                          />
                        </div>
                      </div>
                    ) : (
                      <dl className="space-y-3 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground uppercase">{p.displayDisabilityType}</dt>
                          <dd className="mt-1 flex flex-wrap gap-1">
                            {(profile.testerProfile?.disabilityTypes ?? []).length > 0
                              ? profile.testerProfile!.disabilityTypes.map((d) => (
                                  <Badge key={d} variant="secondary" className="text-xs">{d.replace(/_/g, " ")}</Badge>
                                ))
                              : <span className="text-muted-foreground">—</span>}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground uppercase">{p.displayWcagKnowledge}</dt>
                          <dd className="mt-1 flex flex-wrap gap-1">
                            {(profile.testerProfile?.wcagKnowledge ?? []).map((v) => (
                              <Badge key={v} variant="outline" className="text-xs font-mono">
                                {v.replace("wcag_", "WCAG ").replace("_", ".")}
                              </Badge>
                            ))}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground uppercase">{p.displayScreenReaders}</dt>
                          <dd className="mt-1 flex flex-wrap gap-1">
                            {(profile.testerProfile?.screenReaders ?? []).map((v) => (
                              <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
                            ))}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground uppercase">{p.displayDevices}</dt>
                          <dd className="mt-1 flex flex-wrap gap-1">
                            {(profile.testerProfile?.devices ?? []).map((v) => (
                              <Badge key={v} variant="outline" className="text-xs">{v.replace(/_/g, " ")}</Badge>
                            ))}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground uppercase">{p.displayYearsExperience}</dt>
                          <dd className="mt-0.5">{profile.testerProfile?.yearsExperience ?? "—"}</dd>
                        </div>
                      </dl>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Section 5: Tester Work History */}
              {profile.role === "tester" && (
                <Card>
                  <CardHeader>
                    <CardTitle>{p.workHistoryTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-3xl font-bold">{profile.testerProfile?.totalProjects ?? 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">{p.projectsCompleted}</p>
                      </div>
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-3xl font-bold text-muted-foreground">—</p>
                        <p className="text-xs text-muted-foreground mt-1">{p.totalEarnings}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 6: Admin Profile */}
              {profile.role === "admin" && (
                <Card>
                  <CardHeader><CardTitle>{p.adminDetailsTitle}</CardTitle></CardHeader>
                  <CardContent>
                    {editMode && form ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label>{p.labelDepartment}</Label>
                          <Input value={form.adminProfile.department} onChange={(e) => setAdminField("department", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>{p.labelResponsibilities}</Label>
                          <Textarea value={form.adminProfile.responsibilities} rows={3} onChange={(e) => setAdminField("responsibilities", e.target.value)} />
                        </div>
                      </div>
                    ) : (
                      <dl className="space-y-2 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground uppercase">{p.displayDepartment}</dt>
                          <dd className="mt-0.5">{profile.adminProfile?.department || "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground uppercase">{p.displayResponsibilities}</dt>
                          <dd className="mt-0.5 whitespace-pre-wrap">{profile.adminProfile?.responsibilities || "—"}</dd>
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
    </RoleGuard>
  )
}
