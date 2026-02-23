# PROMPT: Report System — Part 3: PDF Generation + Org Members + Share Token

## Context
AttestHub Next.js 14 App Router, MongoDB/Mongoose, Clerk auth, TypeScript strict mode.
Read CLAUDE.md before starting. Parts 1 & 2 must be completed first.

---

## Overview

This part covers:
1. **Organization members** — multiple users under one customer org can view reports
2. **Share token** — URL with a secure token to share report without login
3. **Puppeteer PDF** — server-side PDF generation from report page

---

## Step 1: Update AuditRequest model — add orgMembers + shareToken

File: `models/audit-request.ts`

Add to `IAuditRequest` interface:
```typescript
orgMembers: string[]        // additional Clerk userIds who can access this project
shareToken?: string         // secure random token for public link (optional)
shareTokenExpiry?: Date     // optional expiry
```

Add to `AuditRequestSchema`:
```typescript
orgMembers: { type: [String], default: [] },
shareToken: { type: String, index: true, sparse: true },
shareTokenExpiry: { type: Date },
```

---

## Step 2: Org Members API

### List + Add members
File: `app/api/customer/projects/[id]/members/route.ts`

```
GET  — list current orgMembers (with user info from Clerk DB)
POST — add a member by email (look up User by email, push clerkUserId to orgMembers)
```

Auth: Clerk session, must be the project owner (`customerId === userId`) or admin.

GET response:
```typescript
{ data: { clerkUserId: string; email: string; firstName?: string; lastName?: string }[] }
```

POST body: `{ email: string }`
- Find User by email in User collection
- If not found → 404 `{ error: "User not found. They must have a AttestHub account first." }`
- If already member → 400 `{ error: "Already a member" }`
- Push to orgMembers
- Return updated list

### Remove member
File: `app/api/customer/projects/[id]/members/[memberId]/route.ts`

```
DELETE — remove a member (owner or admin only)
```
- Pull memberId from orgMembers
- Cannot remove customerId (owner)

---

## Step 3: Update report data API auth — `app/api/reports/[projectId]/data/route.ts`

Update the access check to also allow orgMembers:

```typescript
// Current check (from Part 1):
// allow if customerId === userId OR user is admin

// New check — also allow orgMembers:
const hasAccess =
  user?.role === "admin" ||
  request.customerId === userId ||
  (request.orgMembers ?? []).includes(userId)

if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
```

Apply the same check to:
- `GET /api/audit-requests/[id]/route.ts` (already done in customer management)
- `GET /api/reports/[projectId]/data/route.ts` (update here)

---

## Step 4: Share Token API

### Generate token
File: `app/api/reports/[projectId]/share/route.ts`

```
POST — generate or regenerate share token (owner or admin only)
DELETE — revoke share token
```

POST handler:
```typescript
import crypto from "crypto"

const token = crypto.randomBytes(32).toString("hex")
await AuditRequest.findByIdAndUpdate(projectId, {
  shareToken: token,
  shareTokenExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
})
return NextResponse.json({ data: { token, shareUrl: `/reports/shared/${token}` } })
```

DELETE handler: set `shareToken: null, shareTokenExpiry: null`

### Public report page (no login needed)
File: `app/reports/shared/[token]/page.tsx`

- Server component (or client with no auth guard)
- Calls new API: `GET /api/reports/shared/[token]/data`
- Shows same summary report content (no edit controls)
- Shows "This is a shared report" banner

File: `app/api/reports/shared/[token]/data/route.ts`
```typescript
export const runtime = "nodejs"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  await connectToDatabase()

  const request = await AuditRequest.findOne({ shareToken: token }).lean()
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Check expiry
  if (request.shareTokenExpiry && new Date() > request.shareTokenExpiry) {
    return NextResponse.json({ error: "This link has expired" }, { status: 410 })
  }

  // Assemble same report data as /api/reports/[projectId]/data
  // (extract the data assembly logic into a shared helper function: lib/report-builder.ts)
  const data = await buildReportData(request._id.toString())
  return NextResponse.json({ data })
}
```

---

## Step 5: Share report builder helper — `lib/report-builder.ts`

Refactor: move the data assembly logic from `app/api/reports/[projectId]/data/route.ts`
into a standalone async function:

```typescript
export async function buildReportData(projectId: string): Promise<ReportData>
```

Both the authenticated and public API routes call this function.
This avoids code duplication.

Import types from a shared file: `types/report.ts` — move the ReportData type here.

---

## Step 6: Puppeteer PDF API

File: `app/api/reports/[projectId]/pdf/route.ts`

```typescript
import puppeteer from "puppeteer"

export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connectToDatabase()
  const { projectId } = await params

  // Verify access
  const request = await AuditRequest.findById(projectId).lean()
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const user = await User.findOne({ clerkUserId: userId }).lean()
  const hasAccess =
    user?.role === "admin" ||
    request.customerId === userId ||
    (request.orgMembers ?? []).includes(userId)
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Get the report type from query param
  const { searchParams } = new URL(req.url)
  const reportType = searchParams.get("type") ?? "summary" // "summary" | "wcag"
  const wcagLevel = searchParams.get("level") ?? "AA"

  // Build the URL to screenshot
  // Use the full origin from request headers
  const origin = req.headers.get("origin") ?? req.headers.get("x-forwarded-host") 
    ? `https://${req.headers.get("x-forwarded-host")}`
    : "http://localhost:3000"
  
  const reportUrl = reportType === "wcag"
    ? `${origin}/dashboard/reports/${projectId}/wcag?level=${wcagLevel}&print=1`
    : `${origin}/dashboard/reports/${projectId}/summary?print=1`

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  })

  try {
    const page = await browser.newPage()

    // Pass auth cookie to puppeteer so the report page renders with data
    // Get the session cookie name from clerk
    const cookieHeader = req.headers.get("cookie") ?? ""
    const cookies = cookieHeader.split(";").map(c => {
      const [name, ...rest] = c.trim().split("=")
      return { name: name.trim(), value: rest.join("="), domain: "localhost" }
    }).filter(c => c.name && c.value)

    if (cookies.length > 0) {
      await page.setCookie(...cookies)
    }

    await page.goto(reportUrl, { waitUntil: "networkidle0", timeout: 30000 })
    
    // Wait for loading state to resolve
    await page.waitForSelector("[data-report-ready]", { timeout: 15000 }).catch(() => {})

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "1.5cm", right: "1.5cm", bottom: "1.5cm", left: "1.5cm" },
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:9px;color:#666;width:100%;text-align:center;padding-top:5px;">
        AttestHub Accessibility Audit Report
      </div>`,
      footerTemplate: `<div style="font-size:9px;color:#666;width:100%;text-align:center;padding-bottom:5px;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>`,
    })

    const filename = `${request.projectName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${reportType}-report.pdf`

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdf.length.toString(),
      },
    })
  } finally {
    await browser.close()
  }
}
```

Install puppeteer:
```bash
npm install puppeteer
```

Note: on VPS, puppeteer uses system Chromium. Ensure Chromium is installed:
```bash
# Ubuntu/Debian
sudo apt-get install -y chromium-browser
```

If puppeteer can't find Chrome, set environment variable in `.env.local`:
```
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

And update puppeteer launch options:
```typescript
executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
```

---

## Step 7: Report pages — add `data-report-ready` attribute

In both summary and WCAG report pages, add `data-report-ready="true"` to the `<main>` element
once data has finished loading:

```tsx
<main data-report-ready={!loading ? "true" : undefined} ...>
```

This lets Puppeteer know when to take the screenshot.

---

## Step 8: Customer project detail — Org Members UI

File: `app/dashboard/customer/projects/[id]/page.tsx`

Add a new "Team Access" section (after the Comments section):

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Users className="h-5 w-5" />
      Team Access
    </CardTitle>
    <CardDescription>
      Add team members from your organization who can view this project and its reports
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Add member form */}
    <div className="flex gap-2">
      <Input
        type="email"
        placeholder="colleague@company.com"
        value={memberEmail}
        onChange={(e) => setMemberEmail(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleAddMember() }}
      />
      <Button onClick={handleAddMember} disabled={addingMember} className="gap-2 shrink-0">
        {addingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Add
      </Button>
    </div>

    {/* Member list */}
    <ul className="space-y-2" aria-label="Team members">
      {members.map((member) => (
        <li key={member.clerkUserId} className="flex items-center gap-3 py-2 border-b last:border-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {(member.firstName?.[0] ?? member.email[0]).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {member.firstName && member.lastName
                ? `${member.firstName} ${member.lastName}`
                : member.email}
            </p>
            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
          </div>
          {member.clerkUserId === project.customerId ? (
            <Badge variant="secondary" className="text-xs">Owner</Badge>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={() => handleRemoveMember(member.clerkUserId)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  </CardContent>
</Card>
```

Add state:
```typescript
const [members, setMembers] = useState<{ clerkUserId: string; email: string; firstName?: string; lastName?: string }[]>([])
const [memberEmail, setMemberEmail] = useState("")
const [addingMember, setAddingMember] = useState(false)
```

Add handlers:
```typescript
async function handleAddMember() {
  if (!memberEmail.trim()) return
  setAddingMember(true)
  try {
    const res = await fetch(`/api/customer/projects/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: memberEmail.trim() }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d?.error || "Failed to add member")
    }
    const { data } = await res.json()
    setMembers(data)
    setMemberEmail("")
    toast.success("Member added")
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Failed to add member")
  } finally {
    setAddingMember(false)
  }
}

async function handleRemoveMember(memberId: string) {
  try {
    const res = await fetch(`/api/customer/projects/${id}/members/${memberId}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Failed to remove member")
    setMembers(prev => prev.filter(m => m.clerkUserId !== memberId))
    toast.success("Member removed")
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Failed to remove member")
  }
}
```

Fetch members on mount (alongside project data):
```typescript
const membersRes = await fetch(`/api/customer/projects/${id}/members`)
if (membersRes.ok) {
  const { data } = await membersRes.json()
  setMembers(data ?? [])
}
```

Add imports: `Users, UserPlus, X` from lucide-react.

---

## Step 9: Share Report UI in customer project detail

Add a "Share Report" section in `app/dashboard/customer/projects/[id]/page.tsx` after the report buttons:

```tsx
{/* Share Report */}
<div className="flex items-center gap-2 flex-wrap">
  {project.shareToken ? (
    <>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-1">Shareable link (no login required)</p>
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted rounded px-2 py-1 flex-1 truncate">
            {`${window.location.origin}/reports/shared/${project.shareToken}`}
          </code>
          <Button size="sm" variant="ghost" className="h-7 shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/reports/shared/${project.shareToken}`)
              toast.success("Link copied!")
            }}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 shrink-0"
        onClick={handleRevokeShareLink}>
        Revoke
      </Button>
    </>
  ) : (
    <Button size="sm" variant="outline" onClick={handleGenerateShareLink} disabled={generatingShare} className="gap-2">
      {generatingShare ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      Generate Share Link
    </Button>
  )}
</div>
```

Add state + handlers:
```typescript
const [generatingShare, setGeneratingShare] = useState(false)

async function handleGenerateShareLink() {
  setGeneratingShare(true)
  try {
    const res = await fetch(`/api/reports/${id}/share`, { method: "POST" })
    if (!res.ok) throw new Error("Failed")
    const { data } = await res.json()
    setProject(prev => prev ? { ...prev, shareToken: data.token } : prev)
    toast.success("Share link generated!")
  } catch { toast.error("Failed to generate share link") }
  finally { setGeneratingShare(false) }
}

async function handleRevokeShareLink() {
  try {
    await fetch(`/api/reports/${id}/share`, { method: "DELETE" })
    setProject(prev => prev ? { ...prev, shareToken: undefined } : prev)
    toast.success("Share link revoked")
  } catch { toast.error("Failed to revoke") }
}
```

Add imports: `Share2, Copy` from lucide-react.
Add `shareToken?: string` to the local Project type.

---

## Step 10: PDF download buttons

In both report pages, add a "Download PDF" button alongside the "Print / Save PDF" button:

```tsx
<Button size="sm" variant="outline" className="gap-2" asChild>
  <a href={`/api/reports/${projectId}/pdf?type=summary`} download>
    <Download className="h-4 w-4" /> Download PDF
  </a>
</Button>
```

For WCAG page:
```tsx
<a href={`/api/reports/${projectId}/pdf?type=wcag&level=${levelParam}`} download>
```

Import `Download` from lucide-react.

---

## Step 11: Build + install

```bash
npm install puppeteer
npm run build
```

Must pass with zero TypeScript errors.

Report all files changed/created.
