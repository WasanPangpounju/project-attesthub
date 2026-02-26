# PROMPT: User Profile System — Part 2: Profile Pages

## Context
AttestHub Next.js 14 App Router, MongoDB/Mongoose, Clerk auth, TypeScript strict mode.
Read CLAUDE.md before starting. Part 1 must be completed first.

---

## Overview

Three profile page types:
1. **Shared My Profile** — `/dashboard/profile` (all roles, shows role-appropriate sections)
2. **Customer My Profile** — same page, customer sections shown
3. **Tester My Profile** — same page, tester sections shown

Plus entry points in navigation.

---

## Step 1: Shared My Profile Page — `app/dashboard/profile/page.tsx`

Client component, fetches `GET /api/profile` on mount.

### Page structure:

```tsx
<RoleGuard allowedRoles={["customer", "tester", "admin"]}>
  <div className="flex min-h-screen">
    <DashboardSidebar />
    <div className="flex-1 flex flex-col">
      <DashboardHeader />
      <main className="flex-1 p-6 lg:p-8 max-w-3xl space-y-6">
        
        {/* Pending approval banner */}
        {profile.profileStatus === "pending_approval" && (
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Changes pending approval</p>
              <p className="text-xs text-yellow-600 mt-0.5">
                Your profile update is waiting for admin review. Current information is shown below.
              </p>
            </div>
          </div>
        )}

        {/* Section 1: Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Basic account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar placeholder + name */}
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

            {/* Edit form — toggled by "Edit Profile" button */}
            {editMode ? (
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={form.firstName} onChange={...} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={form.lastName} onChange={...} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input id="jobTitle" value={form.jobTitle} onChange={...} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={...} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" value={form.bio} rows={3} onChange={...} />
                </div>
              </form>
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs uppercase">Job Title</dt>
                  <dd className="mt-0.5">{profile.jobTitle || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase">Phone</dt>
                  <dd className="mt-0.5">{profile.phone || "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground text-xs uppercase">Bio</dt>
                  <dd className="mt-0.5">{profile.bio || "—"}</dd>
                </div>
              </dl>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Submit for Approval
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setEditMode(true)} className="gap-2">
                <Pencil className="h-4 w-4" /> Edit Profile
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Section 2: Customer Organization (role === "customer" only) */}
        {profile.role === "customer" && (
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Your organization details for billing and contracts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editMode ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Organization Name *</Label>
                    <Input value={form.organization?.name ?? ""} onChange={...} />
                  </div>
                  <div className="space-y-1">
                    <Label>Registration Number (เลขทะเบียน)</Label>
                    <Input value={form.organization?.registrationNumber ?? ""} onChange={...} />
                  </div>
                  <div className="space-y-1">
                    <Label>Address</Label>
                    <Textarea value={form.organization?.address ?? ""} rows={2} onChange={...} />
                  </div>
                  <div className="space-y-1">
                    <Label>Website</Label>
                    <Input type="url" value={form.organization?.website ?? ""} onChange={...} />
                  </div>
                  <div className="space-y-1">
                    <Label>Billing Address</Label>
                    <Textarea value={form.organization?.billingAddress ?? ""} rows={2} onChange={...} />
                  </div>
                  <div className="space-y-1">
                    <Label>Billing Method</Label>
                    <select value={form.organization?.billingMethod ?? ""} onChange={...}
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                      <option value="">— Select —</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="promptpay">PromptPay</option>
                    </select>
                  </div>
                </div>
              ) : (
                <dl className="space-y-3 text-sm">
                  {[
                    ["Organization", profile.organization?.name],
                    ["Registration No.", profile.organization?.registrationNumber],
                    ["Address", profile.organization?.address],
                    ["Website", profile.organization?.website],
                    ["Billing Address", profile.organization?.billingAddress],
                    ["Billing Method", profile.organization?.billingMethod?.replace("_", " ")],
                  ].map(([label, value]) => value && (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground uppercase">{label}</dt>
                      <dd className="mt-0.5">{value}</dd>
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
              <CardTitle>Contracts & Documents</CardTitle>
              <CardDescription>Upload signed contracts or quotation documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* File list */}
              {(profile.contractFiles ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
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
                        onClick={() => handleDeleteContractFile(file.publicId!)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Upload button */}
              <div>
                <input type="file" ref={contractFileRef} className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg"
                  onChange={handleContractFileUpload} />
                <Button variant="outline" size="sm" className="gap-2"
                  onClick={() => contractFileRef.current?.click()}
                  disabled={uploadingContract}>
                  {uploadingContract ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload Document
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, PNG, JPG — max 10MB</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 4: Tester Skills (role === "tester" only) */}
        {profile.role === "tester" && (
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Skills</CardTitle>
              <CardDescription>Your expertise and testing capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editMode ? (
                <div className="space-y-4">
                  {/* Disability Types */}
                  <div className="space-y-2">
                    <Label>Disability Type(s)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "blind", label: "Blind" },
                        { value: "low_vision", label: "Low Vision" },
                        { value: "deaf", label: "Deaf" },
                        { value: "hard_of_hearing", label: "Hard of Hearing" },
                        { value: "motor", label: "Motor Impairment" },
                        { value: "cognitive", label: "Cognitive" },
                        { value: "none", label: "No disability (sighted tester)" },
                      ].map(opt => (
                        <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox"
                            checked={form.testerProfile?.disabilityTypes?.includes(opt.value)}
                            onChange={(e) => toggleArrayField("testerProfile.disabilityTypes", opt.value, e.target.checked)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* WCAG Knowledge */}
                  <div className="space-y-2">
                    <Label>WCAG Knowledge</Label>
                    <div className="flex flex-wrap gap-2">
                      {["wcag_2_0", "wcag_2_1", "wcag_2_2", "wcag_3_0"].map(v => (
                        <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer border rounded px-2 py-1">
                          <input type="checkbox"
                            checked={form.testerProfile?.wcagKnowledge?.includes(v)}
                            onChange={(e) => toggleArrayField("testerProfile.wcagKnowledge", v, e.target.checked)}
                          />
                          {v.replace("wcag_", "WCAG ").replace("_", ".")}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Screen Readers */}
                  <div className="space-y-2">
                    <Label>Screen Readers Used</Label>
                    <div className="flex flex-wrap gap-2">
                      {["jaws", "nvda", "voiceover", "talkback", "narrator", "orca"].map(v => (
                        <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer border rounded px-2 py-1">
                          <input type="checkbox"
                            checked={form.testerProfile?.screenReaders?.includes(v)}
                            onChange={(e) => toggleArrayField("testerProfile.screenReaders", v, e.target.checked)}
                          />
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Devices */}
                  <div className="space-y-2">
                    <Label>Devices</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "desktop_windows", label: "Windows" },
                        { value: "desktop_mac", label: "macOS" },
                        { value: "ios", label: "iOS" },
                        { value: "android", label: "Android" },
                      ].map(opt => (
                        <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer border rounded px-2 py-1">
                          <input type="checkbox"
                            checked={form.testerProfile?.devices?.includes(opt.value)}
                            onChange={(e) => toggleArrayField("testerProfile.devices", opt.value, e.target.checked)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Years experience */}
                  <div className="space-y-1">
                    <Label>Years of Experience</Label>
                    <Input type="number" min={0} max={50}
                      value={form.testerProfile?.yearsExperience ?? ""}
                      onChange={...} />
                  </div>
                </div>
              ) : (
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Disability Type</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {(profile.testerProfile?.disabilityTypes ?? []).length > 0
                        ? profile.testerProfile!.disabilityTypes.map(d => (
                            <Badge key={d} variant="secondary" className="text-xs">
                              {d.replace("_", " ")}
                            </Badge>
                          ))
                        : <span className="text-muted-foreground">—</span>
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">WCAG Knowledge</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {(profile.testerProfile?.wcagKnowledge ?? []).map(v => (
                        <Badge key={v} variant="outline" className="text-xs font-mono">
                          {v.replace("wcag_", "WCAG ").replace("_", ".")}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Screen Readers</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {(profile.testerProfile?.screenReaders ?? []).map(v => (
                        <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Devices</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {(profile.testerProfile?.devices ?? []).map(v => (
                        <Badge key={v} variant="outline" className="text-xs">
                          {v.replace("_", " ")}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Years Experience</dt>
                    <dd className="mt-0.5">{profile.testerProfile?.yearsExperience ?? "—"}</dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 5: Tester Work History (read-only stats) */}
        {profile.role === "tester" && (
          <Card>
            <CardHeader>
              <CardTitle>Work History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold">{profile.testerProfile?.totalProjects ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Projects Completed</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-muted-foreground">—</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Earnings (coming soon)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 6: Admin Profile (role === "admin" only) */}
        {profile.role === "admin" && (
          <Card>
            <CardHeader><CardTitle>Admin Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {editMode ? (
                <>
                  <div className="space-y-1">
                    <Label>Department</Label>
                    <Input value={form.adminProfile?.department ?? ""} onChange={...} />
                  </div>
                  <div className="space-y-1">
                    <Label>Responsibilities</Label>
                    <Textarea value={form.adminProfile?.responsibilities ?? ""} rows={3} onChange={...} />
                  </div>
                </>
              ) : (
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Department</dt>
                    <dd className="mt-0.5">{profile.adminProfile?.department || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Responsibilities</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap">{profile.adminProfile?.responsibilities || "—"}</dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  </div>
</RoleGuard>
```

### State:
```typescript
const [profile, setProfile] = useState<ProfileData | null>(null)
const [loading, setLoading] = useState(true)
const [editMode, setEditMode] = useState(false)
const [form, setForm] = useState<Partial<ProfileData>>({})
const [submitting, setSubmitting] = useState(false)
const [uploadingContract, setUploadingContract] = useState(false)
const contractFileRef = useRef<HTMLInputElement>(null)
```

### Helper: `toggleArrayField(path: string, value: string, checked: boolean)`
Uses dot-path to toggle a value in a nested array inside `form`.

### `handleSubmit`:
- PUT /api/profile with form data
- On success: setProfile(updated), setEditMode(false), toast.success("Profile submitted for approval")

### `handleContractFileUpload`:
- Upload to /api/upload (reuse existing endpoint)
- Then POST /api/profile/contract-files with { name, url, publicId }
- Refresh contract files

### `handleDeleteContractFile(publicId)`:
- DELETE /api/profile/contract-files with { publicId }
- Remove from local state

---

## Step 2: Add Profile entry point in DashboardHeader

File: `components/dashboard-header.tsx` (or wherever the user menu / avatar is)

Find the user menu / avatar section. Add a "My Profile" link:

```tsx
<DropdownMenuItem asChild>
  <Link href="/dashboard/profile">
    <User className="h-4 w-4 mr-2" />
    My Profile
  </Link>
</DropdownMenuItem>
```

Import `User` from lucide-react if needed.

---

## Step 3: Add Profile link in DashboardSidebar for tester and customer

File: `components/dashboard-sidebar.tsx` (or wherever sidebar nav is)

For tester role, add nav item:
```tsx
{ href: "/dashboard/profile", label: "My Profile", icon: UserCircle }
```

For customer role, add nav item:
```tsx
{ href: "/dashboard/profile", label: "My Profile", icon: UserCircle }
```

Import `UserCircle` from lucide-react if needed.

---

## Step 4: Build

```bash
npm run build
```

Must pass with zero TypeScript errors. Report all files changed/created.
