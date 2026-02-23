# PROMPT: Report System — Part 2: Report Viewer Pages

## Context
AttestHub Next.js 14 App Router, MongoDB/Mongoose, Clerk auth, TypeScript strict mode.
Read CLAUDE.md before starting. Part 1 must be completed first.

---

## Overview

Two report pages — both use the same data from `GET /api/reports/[projectId]/data`:

1. **Summary Report** — `/dashboard/reports/[projectId]/summary`
   Full audit summary: project info, stats, test case results, recommendations

2. **WCAG Report** — `/dashboard/reports/[projectId]/wcag?level=AA`
   WCAG conformance report organized by principle → criterion

Both pages:
- Fully accessible (proper heading hierarchy, ARIA roles, semantic HTML)
- Print-optimized (CSS `@media print` hides nav/buttons, full content visible)
- Have a "Print / Save as PDF" button (calls `window.print()`)
- Have a "Back" button (goes to project detail)
- Wrapped in `<RoleGuard allowedRoles={["customer", "admin"]}>`

---

## Shared report layout — `app/dashboard/reports/[projectId]/layout.tsx`

Simple layout — no sidebar, just clean header with logo + print button:

```tsx
export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
```

---

## Shared types — create `app/dashboard/reports/[projectId]/report-types.ts`

Copy the full ReportData type from the API response shape defined in Part 1.

---

## Page 1: Summary Report — `app/dashboard/reports/[projectId]/summary/page.tsx`

### Data fetching
```typescript
const { projectId } = useParams()
// fetch GET /api/reports/${projectId}/data on mount
```

### Page structure (semantic HTML + ARIA):

```tsx
<main id="main-content" role="main">
  {/* Skip link for screen readers */}
  <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded">
    Skip to main content
  </a>

  {/* Print/action bar — hidden on print */}
  <div className="print:hidden sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/dashboard/customer/projects/${projectId}`}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Project
        </Link>
      </Button>
      <Separator orientation="vertical" className="h-5" />
      <span className="text-sm font-medium">Accessibility Audit Report</span>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/dashboard/reports/${projectId}/wcag`}>
          WCAG Report
        </Link>
      </Button>
      <Button size="sm" onClick={() => window.print()} className="gap-2">
        <Printer className="h-4 w-4" /> Print / Save PDF
      </Button>
    </div>
  </div>

  <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">

    {/* Section 1: Report Header */}
    <header>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
            Accessibility Audit Report
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">{data.project.projectName}</h1>
          <p className="text-muted-foreground mt-1">
            Generated on {formatDate(data.generatedAt)}
          </p>
        </div>
        <Badge className="text-sm px-3 py-1">{statusLabel[data.project.status]}</Badge>
      </div>

      {/* Project metadata table */}
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 p-4 bg-muted/30 rounded-lg">
        <div>
          <dt className="text-xs text-muted-foreground uppercase tracking-wide">Service Type</dt>
          <dd className="font-medium mt-0.5">{data.project.serviceCategory}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground uppercase tracking-wide">Package</dt>
          <dd className="font-medium mt-0.5">{data.project.servicePackage}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground uppercase tracking-wide">Standard</dt>
          <dd className="font-medium mt-0.5">{data.project.accessibilityStandard}</dd>
        </div>
        {data.project.targetUrl && (
          <div className="col-span-2 md:col-span-3">
            <dt className="text-xs text-muted-foreground uppercase tracking-wide">Target URL</dt>
            <dd className="mt-0.5">
              <a href={data.project.targetUrl} target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline break-all">
                {data.project.targetUrl}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </header>

    {/* Section 2: Executive Summary */}
    <section aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="text-xl font-semibold mb-4">Executive Summary</h2>
      
      {/* Pass rate prominently */}
      <div className="flex items-center gap-6 p-6 bg-muted/20 rounded-xl border mb-6">
        <div className="text-center">
          <p className="text-5xl font-bold" style={{ color: passRateColor(data.summary.passRate) }}>
            {data.summary.passRate}%
          </p>
          <p className="text-sm text-muted-foreground mt-1">Pass Rate</p>
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-700">{data.summary.pass}</p>
            <p className="text-xs text-green-600 mt-0.5">Pass</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-700">{data.summary.fail}</p>
            <p className="text-xs text-red-600 mt-0.5">Fail</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-700">{data.summary.skip}</p>
            <p className="text-xs text-yellow-600 mt-0.5">Skip</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-700">{data.summary.pending}</p>
            <p className="text-xs text-gray-600 mt-0.5">Pending</p>
          </div>
        </div>
      </div>

      {/* Severity breakdown */}
      {data.summary.totalRecommendations > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">
            Issues Found ({data.summary.totalRecommendations} total)
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Critical", count: data.summary.criticalCount, color: "red" },
              { label: "High",     count: data.summary.highCount,     color: "orange" },
              { label: "Medium",   count: data.summary.mediumCount,   color: "yellow" },
              { label: "Low",      count: data.summary.lowCount,      color: "blue" },
            ].map(({ label, count, color }) => (
              <div key={label} className={`text-center p-3 rounded-lg border bg-${color}-50 border-${color}-200`}>
                <p className={`text-2xl font-bold text-${color}-700`}>{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>

    {/* Section 3: Status Timeline */}
    <section aria-labelledby="timeline-heading">
      <h2 id="timeline-heading" className="text-xl font-semibold mb-4">Audit Timeline</h2>
      <ol className="relative border-l border-border space-y-4 pl-6">
        {data.project.statusHistory.map((entry, idx) => (
          <li key={idx} className="relative">
            <span className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" aria-hidden="true" />
            <time className="text-xs text-muted-foreground">{formatDate(entry.changedAt)}</time>
            <p className="font-medium text-sm mt-0.5">
              {statusLabel[entry.from]} → {statusLabel[entry.to]}
            </p>
            {entry.note && <p className="text-xs text-muted-foreground mt-0.5">{entry.note}</p>}
          </li>
        ))}
      </ol>
    </section>

    {/* Section 4: Test Results by Scenario */}
    <section aria-labelledby="results-heading">
      <h2 id="results-heading" className="text-xl font-semibold mb-4">Test Results</h2>
      <div className="space-y-6">
        {data.scenarios.map((scenario, sIdx) => (
          <article key={scenario._id} aria-labelledby={`scenario-${sIdx}`}>
            <h3 id={`scenario-${sIdx}`} className="font-semibold text-base mb-3 flex items-center gap-2">
              <span className="text-muted-foreground font-normal text-sm">Scenario {scenario.order + 1}:</span>
              {scenario.title}
            </h3>
            <div className="space-y-3 pl-4 border-l-2 border-border">
              {scenario.testCases.map((tc, tcIdx) => (
                <div key={tc._id} className="space-y-2">
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <span aria-label={tc.result.status} role="img" className={cn(
                      "mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      tc.result.status === "pass" && "bg-green-100 text-green-700",
                      tc.result.status === "fail" && "bg-red-100 text-red-700",
                      tc.result.status === "skip" && "bg-yellow-100 text-yellow-700",
                      tc.result.status === "pending" && "bg-gray-100 text-gray-600",
                    )}>
                      {tc.result.status === "pass" ? "✓" : tc.result.status === "fail" ? "✗" : tc.result.status === "skip" ? "—" : "?"}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {tcIdx + 1}. {tc.title}
                      </h4>
                      {tc.wcagCriteria && tc.wcagCriteria.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tc.wcagCriteria.map(id => (
                            <Badge key={id} variant="outline" className="text-xs font-mono">{id}</Badge>
                          ))}
                        </div>
                      )}
                      {tc.result.note && (
                        <p className="text-sm text-muted-foreground mt-1 italic">Note: {tc.result.note}</p>
                      )}
                      {tc.result.attachments && tc.result.attachments.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {tc.result.attachments.map((att, aIdx) => (
                            att.url ? (
                              <a key={aIdx} href={att.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline">
                                📎 {att.name}
                              </a>
                            ) : (
                              <span key={aIdx} className="text-xs text-muted-foreground">📎 {att.name}</span>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recommendations for this TC */}
                  {tc.recommendations.length > 0 && (
                    <div className="ml-8 space-y-2">
                      {tc.recommendations.map((rec) => (
                        <div key={rec._id} className={cn(
                          "border-l-4 pl-3 py-2",
                          rec.severity === "critical" && "border-red-500",
                          rec.severity === "high" && "border-orange-500",
                          rec.severity === "medium" && "border-yellow-500",
                          rec.severity === "low" && "border-blue-500",
                        )}>
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-xs", severityBadge(rec.severity))}>
                              {rec.severity}
                            </Badge>
                            <span className="font-medium text-sm">{rec.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                          <div className="mt-1">
                            <span className="text-xs font-semibold uppercase text-muted-foreground">How to fix: </span>
                            <span className="text-sm">{rec.howToFix}</span>
                          </div>
                          {rec.technique && (
                            <p className="text-xs text-muted-foreground mt-0.5">Technique: {rec.technique}</p>
                          )}
                          {rec.referenceUrl && (
                            <a href={rec.referenceUrl} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline block mt-0.5 truncate">
                              {rec.referenceUrl}
                            </a>
                          )}
                          {rec.codeSnippet && (
                            <pre className="text-xs bg-muted rounded p-2 mt-1 overflow-x-auto">
                              <code>{rec.codeSnippet}</code>
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t pt-6 text-center text-xs text-muted-foreground">
      <p>Generated by AttestHub · {formatDate(data.generatedAt)}</p>
      <p className="mt-1">This report is confidential and intended for the project stakeholders only.</p>
    </footer>
  </div>
</main>
```

Helper functions:
```typescript
function passRateColor(rate: number): string {
  if (rate >= 80) return "#16a34a"
  if (rate >= 50) return "#ca8a04"
  return "#dc2626"
}

function severityBadge(severity: string): string {
  const map: Record<string, string> = {
    critical: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-blue-100 text-blue-800",
  }
  return map[severity] ?? "bg-gray-100 text-gray-600"
}
```

---

## Page 2: WCAG Report — `app/dashboard/reports/[projectId]/wcag/page.tsx`

### URL params
```typescript
const { projectId } = useParams()
const searchParams = useSearchParams()
const levelParam = (searchParams.get("level") ?? "AA") as "A" | "AA" | "AAA"
```

### Page structure:

```tsx
<main id="main-content" role="main">
  {/* Skip link */}
  <a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>

  {/* Action bar */}
  <div className="print:hidden sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/dashboard/customer/projects/${projectId}`}><ArrowLeft /> Back</Link>
      </Button>
      <span className="text-sm font-medium">WCAG Conformance Report</span>
    </div>
    <div className="flex items-center gap-3">
      {/* Level selector */}
      <div className="flex items-center gap-1 border rounded-lg p-1">
        {(["A", "AA", "AAA"] as const).map((lvl) => (
          <Link key={lvl} href={`?level=${lvl}`}>
            <button className={cn(
              "px-3 py-1 rounded text-sm font-medium transition-colors",
              levelParam === lvl ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}>
              {lvl}
            </button>
          </Link>
        ))}
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/dashboard/reports/${projectId}/summary`}>Summary Report</Link>
      </Button>
      <Button size="sm" onClick={() => window.print()} className="gap-2">
        <Printer className="h-4 w-4" /> Print / Save PDF
      </Button>
    </div>
  </div>

  <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">

    {/* Header */}
    <header>
      <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">WCAG 2.1 Conformance Report</p>
      <h1 className="text-3xl font-bold mt-1">{data.project.projectName}</h1>
      <p className="text-muted-foreground mt-1">Level {levelParam} · {data.project.accessibilityStandard}</p>
    </header>

    {/* Conformance Summary */}
    <section aria-labelledby="conformance-heading">
      <h2 id="conformance-heading" className="text-xl font-semibold mb-4">Conformance Summary</h2>
      
      {/* Overall verdict */}
      <div className="p-6 rounded-xl border mb-6">
        {(() => {
          const conf = data.wcagReport.conformance
          const levelData = levelParam === "A" ? conf.A
            : levelParam === "AAA" ? { total: conf.A.total + conf.AA.total + conf.AAA.total, pass: conf.A.pass + conf.AA.pass + conf.AAA.pass, fail: conf.A.fail + conf.AA.fail + conf.AAA.fail, not_tested: conf.A.not_tested + conf.AA.not_tested + conf.AAA.not_tested }
            : { total: conf.A.total + conf.AA.total, pass: conf.A.pass + conf.AA.pass, fail: conf.A.fail + conf.AA.fail, not_tested: conf.A.not_tested + conf.AA.not_tested }
          const verdict = levelData.fail === 0 && levelData.not_tested === 0 ? "Conforms" : levelData.fail > 0 ? "Does Not Conform" : "Partially Tested"
          return (
            <>
              <div className="flex items-center gap-4 mb-4">
                <span className={cn(
                  "text-lg font-bold px-4 py-2 rounded-lg",
                  verdict === "Conforms" && "bg-green-100 text-green-800",
                  verdict === "Does Not Conform" && "bg-red-100 text-red-800",
                  verdict === "Partially Tested" && "bg-yellow-100 text-yellow-800",
                )}>
                  {verdict}
                </span>
                <span className="text-muted-foreground text-sm">WCAG 2.1 Level {levelParam}</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center"><p className="text-2xl font-bold">{levelData.total}</p><p className="text-xs text-muted-foreground">Total Criteria</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-green-700">{levelData.pass}</p><p className="text-xs text-muted-foreground">Pass</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-red-700">{levelData.fail}</p><p className="text-xs text-muted-foreground">Fail</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-gray-500">{levelData.not_tested}</p><p className="text-xs text-muted-foreground">Not Tested</p></div>
              </div>
            </>
          )
        })()}
      </div>
    </section>

    {/* Criteria by Principle */}
    <section aria-labelledby="criteria-heading">
      <h2 id="criteria-heading" className="text-xl font-semibold mb-4">Criteria Detail</h2>
      <div className="space-y-6">
        {data.wcagReport.principles.map((principle) => {
          // Filter to only show criteria at or below selected level
          const levelOrder = { A: 1, AA: 2, AAA: 3 }
          const filteredCriteria = principle.criteria.filter(
            c => levelOrder[c.level as keyof typeof levelOrder] <= levelOrder[levelParam]
          )
          if (filteredCriteria.length === 0) return null

          return (
            <article key={principle.name} aria-labelledby={`principle-${principle.name}`}>
              <h3 id={`principle-${principle.name}`} className="font-semibold text-base mb-3 border-b pb-2">
                {principle.name}
              </h3>
              <div className="space-y-2">
                {filteredCriteria.map((criterion) => (
                  <div key={criterion.id} className={cn(
                    "border rounded-lg overflow-hidden",
                    criterion.status === "fail" && "border-red-200",
                    criterion.status === "pass" && "border-green-200",
                  )}>
                    <div className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      criterion.status === "fail" && "bg-red-50",
                      criterion.status === "pass" && "bg-green-50",
                      criterion.status === "not_tested" && "bg-muted/30",
                    )}>
                      <span className={cn(
                        "font-mono text-sm font-bold w-12 shrink-0",
                        criterion.status === "pass" && "text-green-700",
                        criterion.status === "fail" && "text-red-700",
                        criterion.status === "not_tested" && "text-muted-foreground",
                      )}>
                        {criterion.id}
                      </span>
                      <div className="flex-1">
                        <span className="font-medium text-sm">{criterion.title}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{criterion.level}</Badge>
                      </div>
                      <Badge className={cn("text-xs shrink-0",
                        criterion.status === "pass" && "bg-green-100 text-green-800",
                        criterion.status === "fail" && "bg-red-100 text-red-800",
                        criterion.status === "not_tested" && "bg-gray-100 text-gray-600",
                      )}>
                        {criterion.status === "not_tested" ? "Not Tested" : criterion.status === "pass" ? "Pass" : "Fail"}
                      </Badge>
                    </div>

                    {/* Test cases under this criterion */}
                    {criterion.testCases.length > 0 && (
                      <div className="px-4 py-2 bg-background border-t text-sm space-y-1">
                        {criterion.testCases.map((tc) => (
                          <div key={tc.id} className="flex items-center gap-2">
                            <span className={cn("text-xs",
                              tc.result === "pass" && "text-green-600",
                              tc.result === "fail" && "text-red-600",
                              tc.result === "skip" && "text-yellow-600",
                              tc.result === "pending" && "text-muted-foreground",
                            )}>
                              {tc.result === "pass" ? "✓" : tc.result === "fail" ? "✗" : "—"}
                            </span>
                            <span className="text-sm">{tc.title}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recommendations for failed criteria */}
                    {criterion.status === "fail" && criterion.recommendations.length > 0 && (
                      <div className="px-4 py-3 bg-red-50/50 border-t space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                          Remediation Required
                        </p>
                        {criterion.recommendations.map((rec, rIdx) => (
                          <div key={rIdx} className="text-sm">
                            <span className="font-medium">{rec.title}</span>
                            <span className={cn("ml-2 text-xs px-1.5 py-0.5 rounded",
                              rec.severity === "critical" && "bg-red-100 text-red-700",
                              rec.severity === "high" && "bg-orange-100 text-orange-700",
                            )}>
                              {rec.severity}
                            </span>
                            <p className="text-muted-foreground mt-0.5">{rec.howToFix}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>

    {/* What to improve / what to add sections */}
    <section aria-labelledby="improve-heading">
      <h2 id="improve-heading" className="text-xl font-semibold mb-4">Improvement Roadmap</h2>
      
      {/* Must fix (fail) */}
      {(() => {
        const failedCriteria = data.wcagReport.principles
          .flatMap(p => p.criteria)
          .filter(c => c.status === "fail")
        return failedCriteria.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium text-red-700 mb-3">🔴 Must Fix ({failedCriteria.length} criteria)</h3>
            <ul className="space-y-2 list-none">
              {failedCriteria.map(c => (
                <li key={c.id} className="flex items-start gap-2 text-sm">
                  <span className="font-mono font-bold text-red-600 w-12 shrink-0">{c.id}</span>
                  <span>{c.title} — {c.recommendations.length} issue{c.recommendations.length !== 1 ? "s" : ""} to address</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })()}

      {/* Not tested (opportunity) */}
      {(() => {
        const untestedCriteria = data.wcagReport.principles
          .flatMap(p => p.criteria)
          .filter(c => c.status === "not_tested")
          .slice(0, 10)
        return untestedCriteria.length > 0 && (
          <div>
            <h3 className="font-medium text-muted-foreground mb-3">
              ⚪ Not Yet Tested ({data.wcagReport.principles.flatMap(p => p.criteria).filter(c => c.status === "not_tested").length} criteria)
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              These criteria were not covered in this audit. Consider including them in future assessments to achieve full conformance.
            </p>
          </div>
        )
      })()}
    </section>

    {/* Footer */}
    <footer className="border-t pt-6 text-center text-xs text-muted-foreground">
      <p>WCAG 2.1 Level {levelParam} Conformance Report · AttestHub</p>
      <p className="mt-1">Generated {formatDate(data.generatedAt)}</p>
    </footer>
  </div>
</main>
```

---

## Print CSS — add to both pages

In both page files, add this `<style>` tag inside the JSX (after `<main>`):

```tsx
<style>{`
  @media print {
    .print\\:hidden { display: none !important; }
    body { font-size: 12pt; }
    h1 { font-size: 20pt; }
    h2 { font-size: 16pt; page-break-after: avoid; }
    h3 { font-size: 14pt; page-break-after: avoid; }
    article, section { page-break-inside: avoid; }
    pre { white-space: pre-wrap; word-break: break-all; }
    a { color: inherit; }
    @page { margin: 2cm; }
  }
`}</style>
```

---

## Customer project detail — add report buttons

File: `app/dashboard/customer/projects/[id]/page.tsx`

In the page header (near the Back button), add:
```tsx
<div className="flex gap-2">
  <Button variant="outline" size="sm" asChild>
    <Link href={`/dashboard/reports/${id}/summary`}>
      <FileText className="h-4 w-4 mr-1" /> View Full Report
    </Link>
  </Button>
  <Button variant="outline" size="sm" asChild>
    <Link href={`/dashboard/reports/${id}/wcag`}>
      WCAG Report
    </Link>
  </Button>
</div>
```

Import `FileText` from lucide-react if not already there.

---

## Admin project detail — add report buttons

File: `app/dashboard/admin/projects/[id]/page.tsx`

In the page header area, add same report buttons as above (accessible to admin too).

---

## Build

Run `npm run build` — must pass with zero TypeScript errors.

Report all files changed/created.
