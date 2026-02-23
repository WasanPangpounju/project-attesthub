# PROMPT: Report System — Part 1: WCAG Mapping + Report Data API

## Context
AttestHub Next.js 14 App Router, MongoDB/Mongoose, Clerk auth, TypeScript strict mode.
Read CLAUDE.md before starting.

---

## Overview of 3-part plan
- Part 1 (this): Add wcagCriteria field to TestCase, update Admin UI, build report data API
- Part 2: Report viewer pages (web, accessible, print-ready)
- Part 3: Puppeteer PDF generation + public share token

---

## Step 1: Add WCAG criteria list constant — `lib/wcag-criteria.ts`

Create this file with the full WCAG 2.1 success criteria list:

```typescript
export type WcagLevel = "A" | "AA" | "AAA"

export interface WcagCriterion {
  id: string          // e.g. "1.1.1"
  level: WcagLevel
  title: string       // e.g. "Non-text Content"
  principle: string   // "Perceivable" | "Operable" | "Understandable" | "Robust"
}

export const WCAG_CRITERIA: WcagCriterion[] = [
  // 1. Perceivable
  { id: "1.1.1", level: "A",   title: "Non-text Content",              principle: "Perceivable" },
  { id: "1.2.1", level: "A",   title: "Audio-only and Video-only",     principle: "Perceivable" },
  { id: "1.2.2", level: "A",   title: "Captions (Prerecorded)",        principle: "Perceivable" },
  { id: "1.2.3", level: "A",   title: "Audio Description or Media Alternative", principle: "Perceivable" },
  { id: "1.2.4", level: "AA",  title: "Captions (Live)",               principle: "Perceivable" },
  { id: "1.2.5", level: "AA",  title: "Audio Description (Prerecorded)", principle: "Perceivable" },
  { id: "1.2.6", level: "AAA", title: "Sign Language",                 principle: "Perceivable" },
  { id: "1.2.7", level: "AAA", title: "Extended Audio Description",    principle: "Perceivable" },
  { id: "1.2.8", level: "AAA", title: "Media Alternative",             principle: "Perceivable" },
  { id: "1.2.9", level: "AAA", title: "Audio-only (Live)",             principle: "Perceivable" },
  { id: "1.3.1", level: "A",   title: "Info and Relationships",        principle: "Perceivable" },
  { id: "1.3.2", level: "A",   title: "Meaningful Sequence",           principle: "Perceivable" },
  { id: "1.3.3", level: "A",   title: "Sensory Characteristics",       principle: "Perceivable" },
  { id: "1.3.4", level: "AA",  title: "Orientation",                   principle: "Perceivable" },
  { id: "1.3.5", level: "AA",  title: "Identify Input Purpose",        principle: "Perceivable" },
  { id: "1.3.6", level: "AAA", title: "Identify Purpose",              principle: "Perceivable" },
  { id: "1.4.1", level: "A",   title: "Use of Color",                  principle: "Perceivable" },
  { id: "1.4.2", level: "A",   title: "Audio Control",                 principle: "Perceivable" },
  { id: "1.4.3", level: "AA",  title: "Contrast (Minimum)",            principle: "Perceivable" },
  { id: "1.4.4", level: "AA",  title: "Resize Text",                   principle: "Perceivable" },
  { id: "1.4.5", level: "AA",  title: "Images of Text",                principle: "Perceivable" },
  { id: "1.4.6", level: "AAA", title: "Contrast (Enhanced)",           principle: "Perceivable" },
  { id: "1.4.7", level: "AAA", title: "Low or No Background Audio",    principle: "Perceivable" },
  { id: "1.4.8", level: "AAA", title: "Visual Presentation",           principle: "Perceivable" },
  { id: "1.4.9", level: "AAA", title: "Images of Text (No Exception)", principle: "Perceivable" },
  { id: "1.4.10", level: "AA", title: "Reflow",                        principle: "Perceivable" },
  { id: "1.4.11", level: "AA", title: "Non-text Contrast",             principle: "Perceivable" },
  { id: "1.4.12", level: "AA", title: "Text Spacing",                  principle: "Perceivable" },
  { id: "1.4.13", level: "AA", title: "Content on Hover or Focus",     principle: "Perceivable" },
  // 2. Operable
  { id: "2.1.1", level: "A",   title: "Keyboard",                      principle: "Operable" },
  { id: "2.1.2", level: "A",   title: "No Keyboard Trap",              principle: "Operable" },
  { id: "2.1.3", level: "AAA", title: "Keyboard (No Exception)",       principle: "Operable" },
  { id: "2.1.4", level: "A",   title: "Character Key Shortcuts",       principle: "Operable" },
  { id: "2.2.1", level: "A",   title: "Timing Adjustable",             principle: "Operable" },
  { id: "2.2.2", level: "A",   title: "Pause, Stop, Hide",             principle: "Operable" },
  { id: "2.2.3", level: "AAA", title: "No Timing",                     principle: "Operable" },
  { id: "2.2.4", level: "AAA", title: "Interruptions",                 principle: "Operable" },
  { id: "2.2.5", level: "AAA", title: "Re-authenticating",             principle: "Operable" },
  { id: "2.2.6", level: "AAA", title: "Timeouts",                      principle: "Operable" },
  { id: "2.3.1", level: "A",   title: "Three Flashes or Below Threshold", principle: "Operable" },
  { id: "2.3.2", level: "AAA", title: "Three Flashes",                 principle: "Operable" },
  { id: "2.3.3", level: "AAA", title: "Animation from Interactions",   principle: "Operable" },
  { id: "2.4.1", level: "A",   title: "Bypass Blocks",                 principle: "Operable" },
  { id: "2.4.2", level: "A",   title: "Page Titled",                   principle: "Operable" },
  { id: "2.4.3", level: "A",   title: "Focus Order",                   principle: "Operable" },
  { id: "2.4.4", level: "A",   title: "Link Purpose (In Context)",     principle: "Operable" },
  { id: "2.4.5", level: "AA",  title: "Multiple Ways",                 principle: "Operable" },
  { id: "2.4.6", level: "AA",  title: "Headings and Labels",           principle: "Operable" },
  { id: "2.4.7", level: "AA",  title: "Focus Visible",                 principle: "Operable" },
  { id: "2.4.8", level: "AAA", title: "Location",                      principle: "Operable" },
  { id: "2.4.9", level: "AAA", title: "Link Purpose (Link Only)",      principle: "Operable" },
  { id: "2.4.10", level: "AAA",title: "Section Headings",              principle: "Operable" },
  { id: "2.5.1", level: "A",   title: "Pointer Gestures",              principle: "Operable" },
  { id: "2.5.2", level: "A",   title: "Pointer Cancellation",          principle: "Operable" },
  { id: "2.5.3", level: "A",   title: "Label in Name",                 principle: "Operable" },
  { id: "2.5.4", level: "A",   title: "Motion Actuation",              principle: "Operable" },
  { id: "2.5.5", level: "AAA", title: "Target Size",                   principle: "Operable" },
  { id: "2.5.6", level: "AAA", title: "Concurrent Input Mechanisms",   principle: "Operable" },
  // 3. Understandable
  { id: "3.1.1", level: "A",   title: "Language of Page",              principle: "Understandable" },
  { id: "3.1.2", level: "AA",  title: "Language of Parts",             principle: "Understandable" },
  { id: "3.1.3", level: "AAA", title: "Unusual Words",                 principle: "Understandable" },
  { id: "3.1.4", level: "AAA", title: "Abbreviations",                 principle: "Understandable" },
  { id: "3.1.5", level: "AAA", title: "Reading Level",                 principle: "Understandable" },
  { id: "3.1.6", level: "AAA", title: "Pronunciation",                 principle: "Understandable" },
  { id: "3.2.1", level: "A",   title: "On Focus",                      principle: "Understandable" },
  { id: "3.2.2", level: "A",   title: "On Input",                      principle: "Understandable" },
  { id: "3.2.3", level: "AA",  title: "Consistent Navigation",         principle: "Understandable" },
  { id: "3.2.4", level: "AA",  title: "Consistent Identification",     principle: "Understandable" },
  { id: "3.2.5", level: "AAA", title: "Change on Request",             principle: "Understandable" },
  { id: "3.3.1", level: "A",   title: "Error Identification",          principle: "Understandable" },
  { id: "3.3.2", level: "A",   title: "Labels or Instructions",        principle: "Understandable" },
  { id: "3.3.3", level: "AA",  title: "Error Suggestion",              principle: "Understandable" },
  { id: "3.3.4", level: "AA",  title: "Error Prevention (Legal, Financial, Data)", principle: "Understandable" },
  { id: "3.3.5", level: "AAA", title: "Help",                          principle: "Understandable" },
  { id: "3.3.6", level: "AAA", title: "Error Prevention (All)",        principle: "Understandable" },
  // 4. Robust
  { id: "4.1.1", level: "A",   title: "Parsing",                       principle: "Robust" },
  { id: "4.1.2", level: "A",   title: "Name, Role, Value",             principle: "Robust" },
  { id: "4.1.3", level: "AA",  title: "Status Messages",               principle: "Robust" },
]

export const WCAG_CRITERIA_MAP: Record<string, WcagCriterion> = Object.fromEntries(
  WCAG_CRITERIA.map((c) => [c.id, c])
)
```

---

## Step 2: Update TestCase model — `models/test-case.ts`

Add `wcagCriteria` field to `ITestCase` interface:
```typescript
wcagCriteria?: string[]   // array of criterion IDs e.g. ["1.1.1", "1.3.1"]
```

Add to `TestCaseSchema`:
```typescript
wcagCriteria: { type: [String], default: [] },
```

---

## Step 3: Update Admin Test Case form — `app/dashboard/admin/projects/[id]/page.tsx`

### Add to TCFormState:
```typescript
wcagCriteria: string[]
```

### Update DEFAULT_TC_FORM:
```typescript
wcagCriteria: []
```

### Add import at top of file:
```typescript
import { WCAG_CRITERIA } from "@/lib/wcag-criteria"
```

### Add WCAG multi-select in Add/Edit TC Sheet (inside the Sheet form, after Priority):

```tsx
{/* WCAG Criteria */}
<div className="space-y-1">
  <Label>WCAG Success Criteria</Label>
  <p className="text-xs text-muted-foreground">Select all criteria this test case covers</p>
  <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-0.5">
    {WCAG_CRITERIA.map((criterion) => (
      <label
        key={criterion.id}
        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
      >
        <input
          type="checkbox"
          className="h-3.5 w-3.5"
          checked={tcForm.wcagCriteria.includes(criterion.id)}
          onChange={(e) => {
            setTCForm((f) => ({
              ...f,
              wcagCriteria: e.target.checked
                ? [...f.wcagCriteria, criterion.id]
                : f.wcagCriteria.filter((id) => id !== criterion.id),
            }))
          }}
        />
        <span className="font-mono text-xs text-muted-foreground w-10 shrink-0">{criterion.id}</span>
        <span className="flex-1 truncate">{criterion.title}</span>
        <Badge variant="outline" className="text-xs shrink-0">{criterion.level}</Badge>
      </label>
    ))}
  </div>
  {tcForm.wcagCriteria.length > 0 && (
    <p className="text-xs text-muted-foreground">
      {tcForm.wcagCriteria.length} criteria selected
    </p>
  )}
</div>
```

### Update handleSubmitTC to include wcagCriteria in body:
```typescript
wcagCriteria: tcForm.wcagCriteria,
```

### Update openEditTC to restore wcagCriteria:
```typescript
wcagCriteria: tc.wcagCriteria ?? [],
```

### Update TestCase interface (local) to include:
```typescript
wcagCriteria?: string[]
```

---

## Step 4: Report Data API — `app/api/reports/[projectId]/data/route.ts`

This is the central API that assembles all report data.

```
GET /api/reports/[projectId]/data
Auth: Clerk session required (customer who owns project OR admin)
Response: full structured report data
```

```typescript
export const runtime = "nodejs"
```

Response shape:
```typescript
{
  data: {
    project: {
      _id: string
      projectName: string
      serviceCategory: string
      servicePackage: string
      accessibilityStandard: string   // e.g. "WCAG 2.1"
      targetUrl?: string
      locationAddress?: string
      status: string
      createdAt: string
      statusHistory: { from: string; to: string; changedAt: string; note?: string }[]
    }
    summary: {
      totalTestCases: number
      pass: number
      fail: number
      skip: number
      pending: number
      passRate: number          // 0-100
      criticalCount: number     // recommendations
      highCount: number
      mediumCount: number
      lowCount: number
      totalRecommendations: number
    }
    scenarios: {
      _id: string
      title: string
      order: number
      testerName: string
      testCases: {
        _id: string
        title: string
        description?: string
        order: number
        priority: string
        wcagCriteria: string[]
        expectedResult: string
        steps: { order: number; instruction: string }[]
        result: {
          status: "pass" | "fail" | "skip" | "pending"
          note?: string
          attachments: { name: string; url?: string; type: string }[]
          testedAt?: string
          testerName?: string
        }
        recommendations: {
          _id: string
          title: string
          description: string
          severity: string
          howToFix: string
          technique?: string
          referenceUrl?: string
          codeSnippet?: string
        }[]
      }[]
    }[]
    wcagReport: {
      level: "A" | "AA" | "AAA"    // from project.accessibilityStandard, default "AA"
      principles: {
        name: string    // "Perceivable" | "Operable" | "Understandable" | "Robust"
        criteria: {
          id: string
          title: string
          level: string
          status: "pass" | "fail" | "not_tested"
          testCases: { id: string; title: string; result: string }[]
          recommendations: { title: string; severity: string; howToFix: string }[]
        }[]
      }[]
      // Summary per level
      conformance: {
        A:   { total: number; pass: number; fail: number; not_tested: number }
        AA:  { total: number; pass: number; fail: number; not_tested: number }
        AAA: { total: number; pass: number; fail: number; not_tested: number }
      }
    }
    generatedAt: string
  }
}
```

Implementation:
1. Auth check — require Clerk session
2. Find AuditRequest by projectId — verify `customerId === userId` OR user is admin
3. Fetch all Scenarios for this project
4. For each scenario, fetch TestCases (with results and recommendations)
5. For each scenario, resolve testerName from User model
6. Compute summary counts
7. Build wcagReport:
   - Parse `accessibilityStandard` to determine report level ("A", "AA", "AAA") — default "AA"
   - For each WCAG criterion in scope (level ≤ report level):
     - Find all test cases that have this criterion in `wcagCriteria[]`
     - Determine status: if any TC has fail → "fail", all pass → "pass", else "not_tested"
     - Attach recommendations from those test cases
   - Group by principle
8. Return assembled data

For step 7, import WCAG_CRITERIA from `@/lib/wcag-criteria`.
For level parsing: if accessibilityStandard contains "AAA" → "AAA", contains "AA" → "AA", else "A".

---

## Step 5: Test Case detail API (needed by customer) — update existing route

File: `app/api/admin/audit-requests/[id]/scenarios/[scenarioId]/test-cases/route.ts`

The existing GET already returns test cases — verify it returns `wcagCriteria` and `recommendations` fields.
If not, update the lean() query to include them (they should be returned automatically since they're in the schema).

---

## Step 6: Build

Run `npm run build` — must pass with zero TypeScript errors.

Report all files changed/created.
