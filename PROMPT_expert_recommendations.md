# PROMPT: Expert Recommendations — Per Test Case

## Context
AttestHub Next.js 14 App Router, MongoDB/Mongoose, Clerk auth, TypeScript strict mode.
Read CLAUDE.md before starting.

Conventions:
- `export const runtime = "nodejs"` on all API routes
- Auth via `auth()` from `@clerk/nextjs/server`
- DB via `connectToDatabase()` from `@/lib/mongodb`
- UI uses shadcn/ui components + Tailwind + sonner toasts

---

## Overview

Admin can write Expert Recommendations per Test Case.
Each recommendation is a structured finding with severity, description, fix guidance, references, and optional code snippet.
Customer sees recommendations (read-only) in their project detail page.

---

## Step 1: Update Model — `models/test-case.ts`

Add `IRecommendation` interface and `recommendations` field to `ITestCase`:

```typescript
export interface IRecommendation {
  _id?: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  howToFix: string;
  technique?: string;          // เทคนิคการแก้ไข
  referenceUrl?: string;
  codeSnippet?: string;
  createdBy: string;           // clerkUserId of admin
  createdAt: Date;
  updatedAt: Date;
}
```

Add to `ITestCase` interface:
```typescript
recommendations: IRecommendation[];
```

Add Mongoose schema inside `TestCaseSchema`:
```typescript
const RecommendationSchema = new Schema<IRecommendation>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: ["critical", "high", "medium", "low"], default: "medium" },
    howToFix: { type: String, required: true },
    technique: { type: String },
    referenceUrl: { type: String },
    codeSnippet: { type: String },
    createdBy: { type: String, required: true },
  },
  { _id: true, timestamps: true }
);
```

Add to `TestCaseSchema` fields:
```typescript
recommendations: { type: [RecommendationSchema], default: [] },
```

---

## Step 2: API Routes

### 2A. List + Create recommendations
File: `app/api/admin/audit-requests/[id]/scenarios/[scenarioId]/test-cases/[tcId]/recommendations/route.ts`

```
GET  — list all recommendations for this test case (admin only)
POST — create a new recommendation (admin only)
```

GET handler:
- Auth + require admin role
- Find TestCase by `tcId`, verify it belongs to `scenarioId`
- Return `{ data: testCase.recommendations }`

POST body:
```typescript
{
  title: string;
  description: string;
  severity?: "critical" | "high" | "medium" | "low";
  howToFix: string;
  technique?: string;
  referenceUrl?: string;
  codeSnippet?: string;
}
```
- Validate: `title`, `description`, `howToFix` required
- Push new recommendation subdoc with `createdBy: userId`
- Return `{ data: newRecommendation }`

### 2B. Update + Delete single recommendation
File: `app/api/admin/audit-requests/[id]/scenarios/[scenarioId]/test-cases/[tcId]/recommendations/[recId]/route.ts`

```
PUT    — update recommendation (admin only)
DELETE — delete recommendation (admin only)
```

PUT: accept same fields as POST (all optional), use `$set` on subdoc fields
DELETE: use `$pull` to remove subdoc by `_id`
Both: verify admin, verify test case ownership

### 2C. Customer read access
File: `app/api/customer/projects/[id]/scenarios/[scenarioId]/test-cases/[tcId]/recommendations/route.ts`

```
GET — list recommendations for a test case (customer who owns the project)
```
- Auth via `auth()`
- Find AuditRequest by `id`, verify `customerId === userId`
- Find TestCase, return `{ data: testCase.recommendations }`

---

## Step 3: Admin UI — Test Case expanded card

File: `app/dashboard/admin/projects/[id]/page.tsx`

In the expanded test case content (inside `expanded && ...`), after the "Tester Results" section, add a "Expert Recommendations" section.

### New state to add:
```typescript
const [addRecOpen, setAddRecOpen] = useState<string | null>(null)      // tcId with open sheet
const [editRec, setEditRec] = useState<IRecommendationLocal | null>(null)
const [deleteRecTarget, setDeleteRecTarget] = useState<{ tcId: string; recId: string } | null>(null)
const [deletingRec, setDeletingRec] = useState(false)
const [submittingRec, setSubmittingRec] = useState(false)
const [recForm, setRecForm] = useState<RecFormState>({ ...DEFAULT_REC_FORM })
const [recFormError, setRecFormError] = useState("")
```

### New types (local to admin page):
```typescript
interface IRecommendationLocal {
  _id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  howToFix: string;
  technique?: string;
  referenceUrl?: string;
  codeSnippet?: string;
  createdBy: string;
  createdAt: string;
}

interface RecFormState {
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  howToFix: string;
  technique: string;
  referenceUrl: string;
  codeSnippet: string;
}

const DEFAULT_REC_FORM: RecFormState = {
  title: "", description: "", severity: "medium",
  howToFix: "", technique: "", referenceUrl: "", codeSnippet: "",
}
```

### Update TestCase interface to include recommendations:
Add `recommendations: IRecommendationLocal[]` to the existing `TestCase` interface in admin page.

### Update test case fetch to include recommendations:
The existing `GET .../test-cases` response already returns the full TestCase document including `recommendations` — no API change needed, just ensure the local state type includes it.

### Recommendation display in expanded TC card:

After the Tester Results section, add:

```tsx
{/* Expert Recommendations */}
<div>
  <div className="flex items-center justify-between mb-2">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      Expert Recommendations ({tc.recommendations?.length ?? 0})
    </p>
    <Button
      size="sm"
      variant="outline"
      className="gap-1 text-xs h-7"
      onClick={() => {
        setEditRec(null)
        setRecForm({ ...DEFAULT_REC_FORM })
        setRecFormError("")
        setAddRecOpen(tc._id)
      }}
    >
      <Plus className="h-3 w-3" />
      Add
    </Button>
  </div>

  {(tc.recommendations ?? []).length === 0 ? (
    <p className="text-xs text-muted-foreground italic">No recommendations yet.</p>
  ) : (
    <div className="space-y-2">
      {tc.recommendations.map((rec) => (
        <div key={rec._id} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{rec.title}</span>
              <Badge className={cn("text-xs", getSeverityBadgeClass(rec.severity))}>
                {rec.severity}
              </Badge>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-6 w-6"
                onClick={() => {
                  setEditRec(rec)
                  setRecForm({
                    title: rec.title,
                    description: rec.description,
                    severity: rec.severity,
                    howToFix: rec.howToFix,
                    technique: rec.technique ?? "",
                    referenceUrl: rec.referenceUrl ?? "",
                    codeSnippet: rec.codeSnippet ?? "",
                  })
                  setRecFormError("")
                  setAddRecOpen(tc._id)
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon"
                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteRecTarget({ tcId: tc._id, recId: rec._id })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{rec.description}</p>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How to Fix</p>
            <p className="text-xs whitespace-pre-wrap">{rec.howToFix}</p>
          </div>
          {rec.technique && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Technique</p>
              <p className="text-xs whitespace-pre-wrap">{rec.technique}</p>
            </div>
          )}
          {rec.referenceUrl && (
            <a href={rec.referenceUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline block truncate"
            >
              {rec.referenceUrl}
            </a>
          )}
          {rec.codeSnippet && (
            <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap">
              <code>{rec.codeSnippet}</code>
            </pre>
          )}
        </div>
      ))}
    </div>
  )}
</div>
```

### Add severity badge helper function:
```typescript
function getSeverityBadgeClass(severity: string) {
  switch (severity) {
    case "critical": return "bg-red-100 text-red-800";
    case "high":     return "bg-orange-100 text-orange-800";
    case "medium":   return "bg-yellow-100 text-yellow-800";
    case "low":      return "bg-blue-100 text-blue-800";
    default:         return "bg-gray-100 text-gray-600";
  }
}
```

### Add/Edit Recommendation Sheet:
Place inside the `<TabsContent value="testcases">` section alongside the other dialogs/sheets.

```tsx
{/* Add/Edit Recommendation Sheet */}
<Sheet open={!!addRecOpen} onOpenChange={(open) => {
  if (!open) { setAddRecOpen(null); setEditRec(null); setRecFormError("") }
}}>
  <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
    <SheetHeader className="mb-4">
      <SheetTitle>{editRec ? "Edit Recommendation" : "Add Recommendation"}</SheetTitle>
    </SheetHeader>
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="rec-title">Title *</Label>
        <Input id="rec-title" value={recForm.title}
          onChange={(e) => setRecForm(f => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Missing alt text on images" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="rec-severity">Severity</Label>
        <Select value={recForm.severity}
          onValueChange={(v) => setRecForm(f => ({ ...f, severity: v as RecFormState["severity"] }))}>
          <SelectTrigger id="rec-severity"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="rec-desc">Description *</Label>
        <Textarea id="rec-desc" rows={3} className="resize-none"
          value={recForm.description}
          onChange={(e) => setRecForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Explain the accessibility issue found" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="rec-fix">How to Fix *</Label>
        <Textarea id="rec-fix" rows={4} className="resize-none"
          value={recForm.howToFix}
          onChange={(e) => setRecForm(f => ({ ...f, howToFix: e.target.value }))}
          placeholder="Step-by-step guidance for the developer" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="rec-technique">Technique (optional)</Label>
        <Textarea id="rec-technique" rows={2} className="resize-none"
          value={recForm.technique}
          onChange={(e) => setRecForm(f => ({ ...f, technique: e.target.value }))}
          placeholder="e.g. WCAG 2.1 Technique H37" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="rec-ref">Reference URL (optional)</Label>
        <Input id="rec-ref" type="url" value={recForm.referenceUrl}
          onChange={(e) => setRecForm(f => ({ ...f, referenceUrl: e.target.value }))}
          placeholder="https://www.w3.org/WAI/..." />
      </div>
      <div className="space-y-1">
        <Label htmlFor="rec-code">Code Snippet (optional)</Label>
        <Textarea id="rec-code" rows={5} className="resize-none font-mono text-xs"
          value={recForm.codeSnippet}
          onChange={(e) => setRecForm(f => ({ ...f, codeSnippet: e.target.value }))}
          placeholder={'<img src="photo.jpg" alt="Description of the image" />'} />
      </div>
      {recFormError && <p className="text-sm text-destructive">{recFormError}</p>}
    </div>
    <SheetFooter className="mt-6">
      <Button variant="outline" onClick={() => setAddRecOpen(null)}>Cancel</Button>
      <Button onClick={() => handleSubmitRec(addRecOpen!)} disabled={submittingRec} className="gap-2">
        {submittingRec && <Loader2 className="h-4 w-4 animate-spin" />}
        {editRec ? "Save Changes" : "Add Recommendation"}
      </Button>
    </SheetFooter>
  </SheetContent>
</Sheet>

{/* Delete Recommendation Confirmation */}
<AlertDialog open={!!deleteRecTarget} onOpenChange={(open) => { if (!open) setDeleteRecTarget(null) }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Recommendation</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete this recommendation. This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive hover:bg-destructive/90"
        disabled={deletingRec}
        onClick={() => { if (deleteRecTarget) handleDeleteRec(deleteRecTarget.tcId, deleteRecTarget.recId) }}
      >
        {deletingRec ? "Deleting…" : "Delete"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Handler functions to add:

```typescript
async function handleSubmitRec(tcId: string) {
  if (!selectedScenario) return
  if (!recForm.title.trim()) { setRecFormError("Title is required"); return }
  if (!recForm.description.trim()) { setRecFormError("Description is required"); return }
  if (!recForm.howToFix.trim()) { setRecFormError("How to fix is required"); return }
  setRecFormError("")
  setSubmittingRec(true)
  try {
    const url = editRec
      ? `/api/admin/audit-requests/${encodeURIComponent(id)}/scenarios/${encodeURIComponent(selectedScenario._id)}/test-cases/${encodeURIComponent(tcId)}/recommendations/${encodeURIComponent(editRec._id)}`
      : `/api/admin/audit-requests/${encodeURIComponent(id)}/scenarios/${encodeURIComponent(selectedScenario._id)}/test-cases/${encodeURIComponent(tcId)}/recommendations`
    const res = await fetch(url, {
      method: editRec ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: recForm.title.trim(),
        description: recForm.description.trim(),
        severity: recForm.severity,
        howToFix: recForm.howToFix.trim(),
        technique: recForm.technique.trim() || undefined,
        referenceUrl: recForm.referenceUrl.trim() || undefined,
        codeSnippet: recForm.codeSnippet.trim() || undefined,
      }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
    }
    const { data } = await res.json() as { data: IRecommendationLocal }
    setTestCases(prev => prev.map(tc => {
      if (tc._id !== tcId) return tc
      const recs = editRec
        ? tc.recommendations.map(r => r._id === data._id ? data : r)
        : [...(tc.recommendations ?? []), data]
      return { ...tc, recommendations: recs }
    }))
    setAddRecOpen(null)
    setEditRec(null)
    toast.success(editRec ? "Recommendation updated" : "Recommendation added")
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Failed to save recommendation")
  } finally {
    setSubmittingRec(false)
  }
}

async function handleDeleteRec(tcId: string, recId: string) {
  if (!selectedScenario) return
  setDeletingRec(true)
  try {
    const res = await fetch(
      `/api/admin/audit-requests/${encodeURIComponent(id)}/scenarios/${encodeURIComponent(selectedScenario._id)}/test-cases/${encodeURIComponent(tcId)}/recommendations/${encodeURIComponent(recId)}`,
      { method: "DELETE" }
    )
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
    }
    setTestCases(prev => prev.map(tc =>
      tc._id !== tcId ? tc : { ...tc, recommendations: tc.recommendations.filter(r => r._id !== recId) }
    ))
    toast.success("Recommendation deleted")
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Failed to delete recommendation")
  } finally {
    setDeletingRec(false)
    setDeleteRecTarget(null)
  }
}
```

---

## Step 4: Customer UI — Project Detail Page

File: `app/dashboard/customer/projects/[id]/page.tsx`

Add a new "Expert Recommendations" section in the customer project detail page.

### New types (local to customer page):
```typescript
interface IRecommendationRead {
  _id: string
  title: string
  description: string
  severity: "critical" | "high" | "medium" | "low"
  howToFix: string
  technique?: string
  referenceUrl?: string
  codeSnippet?: string
  createdAt: string
}

interface TestCaseWithRecs {
  _id: string
  title: string
  order: number
  priority: string
  recommendations: IRecommendationRead[]
}

interface ScenarioWithRecs {
  _id: string
  title: string
  testerName: string
  testCases: TestCaseWithRecs[]
}
```

### New state:
```typescript
const [scenariosWithRecs, setScenariosWithRecs] = useState<ScenarioWithRecs[]>([])
const [loadingRecs, setLoadingRecs] = useState(false)
const [expandedRecScenario, setExpandedRecScenario] = useState<string | null>(null)
```

### Data fetching:
After fetching scenarios (existing), also fetch test cases with their recommendations for each scenario:

```typescript
// After fetching scenarios, build scenariosWithRecs
async function fetchRecommendations(projectId: string, scenarios: Scenario[]) {
  setLoadingRecs(true)
  try {
    const results = await Promise.all(
      scenarios.map(async (sc) => {
        const res = await fetch(
          `/api/admin/audit-requests/${encodeURIComponent(projectId)}/scenarios/${encodeURIComponent(sc._id)}/test-cases`,
          { cache: "no-store" }
        )
        if (!res.ok) return { ...sc, testCases: [] }
        const json = await res.json() as { data: TestCaseWithRecs[] }
        const tcs = (Array.isArray(json.data) ? json.data : [])
          .filter(tc => (tc.recommendations ?? []).length > 0)
        return { _id: sc._id, title: sc.title, testerName: sc.testerName ?? "", testCases: tcs }
      })
    )
    setScenariosWithRecs(results.filter(s => s.testCases.length > 0))
  } catch {
    // silent fail — recommendations are optional
  } finally {
    setLoadingRecs(false)
  }
}
```

Call `fetchRecommendations(id, scenarios)` after scenarios are fetched successfully.

### Expert Recommendations section UI (add after the Test Cases Summary section):

```tsx
{/* Expert Recommendations */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Lightbulb className="h-5 w-5 text-yellow-500" aria-hidden="true" />
      Expert Recommendations
    </CardTitle>
    <CardDescription>
      Findings and remediation guidance from our accessibility experts
    </CardDescription>
  </CardHeader>
  <CardContent>
    {loadingRecs ? (
      <div className="space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
      </div>
    ) : scenariosWithRecs.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Lightbulb className="h-10 w-10 mb-2 opacity-30" aria-hidden="true" />
        <p className="text-sm">No expert recommendations yet</p>
        <p className="text-xs mt-1">Recommendations will appear here after expert review</p>
      </div>
    ) : (
      <div className="space-y-4">
        {/* Summary counts */}
        {(() => {
          const allRecs = scenariosWithRecs.flatMap(s => s.testCases.flatMap(tc => tc.recommendations))
          const counts = {
            critical: allRecs.filter(r => r.severity === "critical").length,
            high: allRecs.filter(r => r.severity === "high").length,
            medium: allRecs.filter(r => r.severity === "medium").length,
            low: allRecs.filter(r => r.severity === "low").length,
          }
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {(["critical", "high", "medium", "low"] as const).map(sev => (
                <div key={sev} className={cn(
                  "rounded-lg p-3 text-center border",
                  sev === "critical" && "bg-red-50 border-red-200",
                  sev === "high" && "bg-orange-50 border-orange-200",
                  sev === "medium" && "bg-yellow-50 border-yellow-200",
                  sev === "low" && "bg-blue-50 border-blue-200",
                )}>
                  <p className={cn(
                    "text-2xl font-bold",
                    sev === "critical" && "text-red-700",
                    sev === "high" && "text-orange-700",
                    sev === "medium" && "text-yellow-700",
                    sev === "low" && "text-blue-700",
                  )}>{counts[sev]}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{sev}</p>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Recommendations grouped by scenario */}
        {scenariosWithRecs.map(sc => (
          <div key={sc._id} className="border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-3 hover:bg-accent/50 text-left"
              onClick={() => setExpandedRecScenario(expandedRecScenario === sc._id ? null : sc._id)}
              aria-expanded={expandedRecScenario === sc._id}
            >
              <span className="font-medium text-sm">{sc.title}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {sc.testCases.reduce((n, tc) => n + tc.recommendations.length, 0)} findings
                </Badge>
                {expandedRecScenario === sc._id
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {expandedRecScenario === sc._id && (
              <div className="border-t divide-y">
                {sc.testCases.map(tc => (
                  <div key={tc._id} className="p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Test Case #{tc.order + 1}: {tc.title}
                    </p>
                    {tc.recommendations.map(rec => (
                      <div key={rec._id} className="border rounded-lg p-3 space-y-2 bg-background">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{rec.title}</span>
                          <Badge className={cn("text-xs", {
                            "bg-red-100 text-red-800": rec.severity === "critical",
                            "bg-orange-100 text-orange-800": rec.severity === "high",
                            "bg-yellow-100 text-yellow-800": rec.severity === "medium",
                            "bg-blue-100 text-blue-800": rec.severity === "low",
                          })}>
                            {rec.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            How to Fix
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{rec.howToFix}</p>
                        </div>
                        {rec.technique && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              Technique
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{rec.technique}</p>
                          </div>
                        )}
                        {rec.referenceUrl && (
                          <a href={rec.referenceUrl} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline block truncate"
                          >
                            {rec.referenceUrl}
                          </a>
                        )}
                        {rec.codeSnippet && (
                          <pre className="text-xs bg-muted rounded p-3 overflow-x-auto whitespace-pre-wrap">
                            <code>{rec.codeSnippet}</code>
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>
```

Add these imports to customer page if not already present:
```typescript
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react"
import { CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
```

---

## Step 5: Build

Run `npm run build` — must pass with zero TypeScript errors.

Report all files changed/created.
