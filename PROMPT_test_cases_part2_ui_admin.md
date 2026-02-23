# PROMPT: Test Cases & Scenarios — Part 2 (Admin UI)

## Context
AttestHub Next.js 14 App Router project. All API routes from Part 1 are ready.
Read CLAUDE.md before starting. All Part 1 routes are confirmed working.

Existing patterns:
- shadcn/ui components available (Button, Card, Badge, Dialog, Input, Textarea, Select, Label, Separator, Skeleton, AlertDialog, Avatar, Progress, Tabs, Sheet, Tooltip)
- `toast` from `sonner`
- `cn` from `@/lib/utils`
- `useParams`, `useRouter` from `next/navigation`
- Tailwind CSS only

---

## Task: Add "Test Cases" tab to Admin Project Detail page

File to edit: `app/dashboard/admin/projects/[id]/page.tsx`

---

### A. Add new Tab trigger

In the existing `<TabsList>`, add after the "testers" tab:
```
<TabsTrigger value="testcases">Test Cases</TabsTrigger>
```

---

### B. New TabsContent: `value="testcases"`

Layout: Two-column on desktop, single column on mobile.
- **Left column** (1/3 width): Scenario list + "Add Scenario" button
- **Right column** (2/3 width): Selected scenario detail (test cases)

---

### C. Left Column — Scenario List

**Header**: "Scenarios" title + "Add Scenario" button (opens Dialog)

**Scenario cards** (fetched from `GET /api/admin/audit-requests/[id]/scenarios`):
- Show: scenario title, assigned tester name (resolve from testerMap), test case count badge
- Click to select → highlight selected, load test cases in right column
- Delete button (Trash2 icon) with AlertDialog confirm → `DELETE /api/admin/audit-requests/[id]/scenarios/[scenarioId]`
- Skeleton loading state (3 skeleton cards)
- Empty state with icon when no scenarios

**Add Scenario Dialog**:
- Fields: Title (required), Description (optional textarea), Assigned Tester (Select from testerMap — same list used in Testers tab), Order (number input, optional)
- Submit → `POST /api/admin/audit-requests/[id]/scenarios`
- On success: close dialog, refresh scenarios list, auto-select new scenario
- Inline validation: show error if title empty or no tester selected

---

### D. Right Column — Test Case List

Show when a scenario is selected. Show placeholder "Select a scenario" when none selected.

**Header**: Selected scenario title + "Add Test Case" button + Edit Scenario button (pencil icon)

**Edit Scenario inline form** (shown when edit mode active):
- Same fields as Add dialog but pre-filled
- Save/Cancel buttons
- `PUT /api/admin/audit-requests/[id]/scenarios/[scenarioId]`

**Test Case cards** (fetched from `GET /api/admin/audit-requests/[id]/scenarios/[scenarioId]/test-cases`):

Each card shows:
- Order number badge (e.g. "#1")
- Title
- Priority badge (color-coded: critical=red, high=orange, medium=yellow, low=gray)
- Result summary: how many testers Pass/Fail/Skip/Pending (count from `results` array)
- Expand/collapse to show: description, steps list (numbered), expected result
- Edit button → opens Edit Test Case Dialog
- Delete button → AlertDialog confirm → `DELETE .../test-cases/[tcId]`

Drag handle icon (GripVertical) on left side — visual only, no actual DnD needed yet.

**Add Test Case Dialog** (Sheet, side="right", wide):
Fields:
- Title (required, text input)
- Description (optional, textarea)
- Priority (Select: low/medium/high/critical, default medium)
- Expected Result (required, textarea)
- Steps editor:
  - List of step rows: each has order number + instruction text input + delete button
  - "Add Step" button → appends new empty step row
  - Steps are reorderable visually (up/down arrow buttons per row)
- Order (number, optional)

Submit → `POST .../test-cases`
On success: close sheet, refresh test cases list

**Edit Test Case Dialog**: Same as Add but pre-filled, uses `PUT`

---

### E. Result Summary Component

For each test case card, compute from `results[]`:
```
Pass: results.filter(r => r.status === "pass").length
Fail: results.filter(r => r.status === "fail").length  
Skip: results.filter(r => r.status === "skip").length
Pending: assignedTesters.length - (pass+fail+skip)
```

Show as colored dot + count: 🟢 Pass · 🔴 Fail · ⚫ Skip · ⚪ Pending

---

### F. State management

```typescript
const [scenarios, setScenarios] = useState<Scenario[]>([])
const [loadingScenarios, setLoadingScenarios] = useState(false)
const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
const [testCases, setTestCases] = useState<TestCase[]>([])
const [loadingTestCases, setLoadingTestCases] = useState(false)
```

Fetch scenarios when `id` changes and tab is "testcases".
Fetch test cases when `selectedScenario` changes.

Use optimistic updates where possible (remove from list immediately on delete, add to list on create).

---

### G. Types (define at top of file, extending existing types)

```typescript
interface Scenario {
  _id: string
  auditRequestId: string
  title: string
  description?: string
  assignedTesterId: string
  order: number
  createdBy: string
  createdAt: string
  updatedAt: string
  testCaseCount?: number
}

interface TestStep {
  order: number
  instruction: string
}

interface TesterResult {
  testerId: string
  status: "pending" | "pass" | "fail" | "skip"
  note?: string
  attachments: { name: string; size: number; type: string; url?: string }[]
  testedAt?: string
}

interface TestCase {
  _id: string
  scenarioId: string
  auditRequestId: string
  title: string
  description?: string
  steps: TestStep[]
  expectedResult: string
  priority: "low" | "medium" | "high" | "critical"
  order: number
  results: TesterResult[]
  createdBy: string
  createdAt: string
  updatedAt: string
}
```

---

### H. After implementation

Run `npm run build` — must pass with zero TypeScript errors.
Report all changed files.
