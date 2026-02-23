# PROMPT: Test Cases & Scenarios — Part 3 (Tester UI)

## Context
AttestHub Next.js 14 App Router project. All API routes from Part 1 are ready.
Read CLAUDE.md before starting.

Existing patterns:
- Tester dashboard: `app/dashboard/tester/page.tsx`
- Task Detail Drawer is a `<Sheet>` with 4 existing tabs: Overview, Progress, Comments, Files
- shadcn/ui: Button, Badge, Progress, Sheet, Tabs, Slider, Textarea, Skeleton, Avatar, Separator, toast (sonner)
- `useUser` from `@clerk/nextjs`
- `cn` from `@/lib/utils`

---

## Task: Add "Test Cases" tab to Tester Task Detail Drawer

File to edit: `app/dashboard/tester/page.tsx`

---

### A. Add new Tab in drawer TabsList

After the "attachments" tab trigger, add:
```
<TabsTrigger value="testcases" className="gap-1">
  <ClipboardList className="h-3.5 w-3.5" />
  Test Cases
</TabsTrigger>
```

Import `ClipboardList` from `lucide-react`.

---

### B. New Types (add to existing types section)

```typescript
interface TestStep {
  order: number
  instruction: string
}

interface TesterResult {
  testerId: string
  status: "pending" | "pass" | "fail" | "skip"
  note?: string
  attachments: { _id?: string; name: string; size: number; type: string; url?: string; uploadedAt: string }[]
  testedAt?: string
}

interface TestCase {
  _id: string
  scenarioId: string
  title: string
  description?: string
  steps: TestStep[]
  expectedResult: string
  priority: "low" | "medium" | "high" | "critical"
  order: number
  results: TesterResult[]
  myResult: TesterResult  // injected by API: caller's result (or pending default)
}

interface Scenario {
  _id: string
  title: string
  description?: string
  assignedTesterId: string
  order: number
  testCases: TestCase[]   // populated by API
}
```

---

### C. State for Test Cases tab

Add to main component state:
```typescript
const [scenarios, setScenarios] = useState<Scenario[]>([])
const [loadingScenarios, setLoadingScenarios] = useState(false)
const [expandedScenario, setExpandedScenario] = useState<string | null>(null)
const [expandedTestCase, setExpandedTestCase] = useState<string | null>(null)
const [submittingResult, setSubmittingResult] = useState<string | null>(null) // tcId being submitted
const [resultNotes, setResultNotes] = useState<Record<string, string>>({})     // tcId → note text
```

---

### D. Fetch scenarios when drawer opens

In `openDrawer()` function, after existing state resets, add:
```typescript
setScenarios([])
setExpandedScenario(null)
setExpandedTestCase(null)
setResultNotes({})
```

Add a `useEffect` that fetches when `drawerOpen === true && selectedTask !== null`:
```typescript
useEffect(() => {
  if (!drawerOpen || !selectedTask) return
  let alive = true
  setLoadingScenarios(true)
  fetch(`/api/tester/tasks/${selectedTask._id}/scenarios`, { cache: "no-store" })
    .then(res => res.json())
    .then(({ data }) => { if (alive) setScenarios(Array.isArray(data) ? data : []) })
    .catch(() => {})
    .finally(() => { if (alive) setLoadingScenarios(false) })
  return () => { alive = false }
}, [drawerOpen, selectedTask?._id])
```

---

### E. Submit Result function

```typescript
async function submitResult(
  taskId: string,
  scenarioId: string,
  tcId: string,
  status: "pass" | "fail" | "skip"
) {
  setSubmittingResult(tcId)
  try {
    const note = resultNotes[tcId] ?? ""
    const res = await fetch(
      `/api/tester/tasks/${taskId}/scenarios/${scenarioId}/test-cases/${tcId}/result`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      }
    )
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
    }
    // Update local state: find and update the test case result
    setScenarios(prev =>
      prev.map(sc =>
        sc._id !== scenarioId ? sc : {
          ...sc,
          testCases: sc.testCases.map(tc =>
            tc._id !== tcId ? tc : {
              ...tc,
              myResult: { ...tc.myResult, status, note, testedAt: new Date().toISOString() }
            }
          )
        }
      )
    )
    toast.success(
      status === "pass" ? "Marked as Pass ✓" :
      status === "fail" ? "Marked as Fail ✗" : "Marked as Skip"
    )
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Failed to submit result")
  } finally {
    setSubmittingResult(null)
  }
}
```

---

### F. Test Cases Tab Content (TabsContent value="testcases")

```
<TabsContent value="testcases" className="p-6 space-y-4 mt-0">
```

#### Loading state
Show 3 skeleton cards when `loadingScenarios`.

#### Empty state
When `scenarios.length === 0` and not loading:
- Icon: ClipboardList (large, muted)
- Text: "No test cases assigned yet"

#### Scenario list

For each scenario, render a **collapsible scenario section**:

```
┌─────────────────────────────────────────┐
│ ▶ Scenario 1: "Login Flow"    [3 cases] │  ← click to expand/collapse
├─────────────────────────────────────────┤
│ Progress bar: X/total completed         │
│                                         │
│ ┌─ Test Case #1 ─────────────────────┐  │
│ │ [PASS] ✓  Title of test case       │  │
│ │ ▶ Show steps                       │  │
│ └────────────────────────────────────┘  │
│                                         │
│ ┌─ Test Case #2 ─────────────────────┐  │
│ │ [PENDING] ○  Title               │  │
│ │ ▶ Show steps                       │  │  ← expandable
│ │                                    │  │
│ │ Steps (when expanded):             │  │
│ │   1. Click the login button        │  │
│ │   2. Tab to username field         │  │
│ │   3. Check focus indicator visible │  │
│ │                                    │  │
│ │ Expected: Focus ring visible...    │  │
│ │                                    │  │
│ │ Note: [textarea]                   │  │
│ │                                    │  │
│ │ [Pass] [Fail] [Skip]               │  │
│ └────────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

#### Test Case card rules

**Status badge colors**:
```typescript
const resultColors = {
  pending: "bg-gray-100 text-gray-600",
  pass: "bg-green-100 text-green-700",
  fail: "bg-red-100 text-red-700",
  skip: "bg-yellow-100 text-yellow-700",
}
```

**Priority badge colors**:
```typescript
const priorityColors = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
}
```

**Order enforcement UI**:
- If a test case has `order > 1` and the previous test case's `myResult.status === "pending"`:
  - Disable the Pass/Fail/Skip buttons
  - Show tooltip or text: "Complete previous test case first"
  - Gray out the card slightly (`opacity-60`)

**Expanded test case shows**:
- Description (if any)
- Steps: numbered list, each step on its own line
- Expected Result section
- Note textarea (controlled by `resultNotes[tc._id]`)
- Pass / Fail / Skip buttons
  - Pass: green, CheckCircle icon
  - Fail: red, XCircle icon  
  - Skip: gray, MinusCircle icon
  - Show Loader2 spinner when `submittingResult === tc._id`
  - Disable all 3 when submitting
- If already has result (not pending): show "Update Result" label above buttons

**Scenario progress bar**:
```typescript
const completed = scenario.testCases.filter(
  tc => tc.myResult.status !== "pending"
).length
const total = scenario.testCases.length
const pct = total ? Math.round((completed / total) * 100) : 0
```
Show: `Progress ({completed}/{total})` label + `<Progress value={pct} />`

---

### G. Icons to import (add to existing lucide-react import)

```
ClipboardList, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp, GripVertical
```

---

### H. After implementation

Run `npm run build` — must pass with zero TypeScript errors.
Report all changes made.
