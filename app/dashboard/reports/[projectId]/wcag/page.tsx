"use client"

import { Suspense, useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { RoleGuard } from "@/components/role-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Printer, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReportData } from "../report-types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | undefined | null): string {
  if (!d) return "—"
  try { return new Date(d).toLocaleString() } catch { return "—" }
}

const levelOrder: Record<"A" | "AA" | "AAA", number> = { A: 1, AA: 2, AAA: 3 }

// ─── Inner component (uses useSearchParams) ──────────────────────────────────

function WcagPageContent() {
  const { projectId } = useParams<{ projectId: string }>()
  const searchParams = useSearchParams()
  const levelParam = (searchParams.get("level") ?? "AA") as "A" | "AA" | "AAA"

  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!projectId) return
    let alive = true
    setLoading(true)
    setError("")
    fetch(`/api/reports/${encodeURIComponent(projectId)}/data`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(d.error ?? `Request failed (${res.status})`)
        }
        return res.json() as Promise<{ data: ReportData }>
      })
      .then(({ data: reportData }) => {
        if (!alive) return
        setData(reportData)
      })
      .catch((e) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : "Failed to load report")
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [projectId])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-destructive">{error || "Report data not found."}</p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href={`/dashboard/customer/projects/${projectId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Project
          </Link>
        </Button>
      </div>
    )
  }

  const conf = data.wcagReport.conformance

  const levelData = levelParam === "A"
    ? conf.A
    : levelParam === "AAA"
      ? {
          total:      conf.A.total      + conf.AA.total      + conf.AAA.total,
          pass:       conf.A.pass       + conf.AA.pass       + conf.AAA.pass,
          fail:       conf.A.fail       + conf.AA.fail       + conf.AAA.fail,
          not_tested: conf.A.not_tested + conf.AA.not_tested + conf.AAA.not_tested,
        }
      : {
          total:      conf.A.total      + conf.AA.total,
          pass:       conf.A.pass       + conf.AA.pass,
          fail:       conf.A.fail       + conf.AA.fail,
          not_tested: conf.A.not_tested + conf.AA.not_tested,
        }

  const verdict = levelData.fail === 0 && levelData.not_tested === 0
    ? "Conforms"
    : levelData.fail > 0
      ? "Does Not Conform"
      : "Partially Tested"

  const allCriteria = data.wcagReport.principles.flatMap((p) => p.criteria)
  const failedCriteria = allCriteria.filter((c) => c.status === "fail")
  const untestedCriteria = allCriteria.filter((c) => c.status === "not_tested")

  return (
    <main id="main-content" data-report-ready={!loading ? "true" : undefined} role="main">
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

      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
      >
        Skip to main content
      </a>

      {/* Action bar */}
      <div className="print:hidden sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/customer/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
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
          <Button size="sm" variant="outline" className="gap-2" asChild>
            <a href={`/api/reports/${projectId}/pdf?type=wcag&level=${levelParam}`} download>
              <Download className="h-4 w-4" /> Download PDF
            </a>
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

          <div className="p-6 rounded-xl border mb-6">
            <div className="flex items-center gap-4 mb-4">
              <span className={cn(
                "text-lg font-bold px-4 py-2 rounded-lg",
                verdict === "Conforms"         && "bg-green-100 text-green-800",
                verdict === "Does Not Conform" && "bg-red-100 text-red-800",
                verdict === "Partially Tested" && "bg-yellow-100 text-yellow-800",
              )}>
                {verdict}
              </span>
              <span className="text-muted-foreground text-sm">WCAG 2.1 Level {levelParam}</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold">{levelData.total}</p>
                <p className="text-xs text-muted-foreground">Total Criteria</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">{levelData.pass}</p>
                <p className="text-xs text-muted-foreground">Pass</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-700">{levelData.fail}</p>
                <p className="text-xs text-muted-foreground">Fail</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-500">{levelData.not_tested}</p>
                <p className="text-xs text-muted-foreground">Not Tested</p>
              </div>
            </div>
          </div>
        </section>

        {/* Criteria by Principle */}
        <section aria-labelledby="criteria-heading">
          <h2 id="criteria-heading" className="text-xl font-semibold mb-4">Criteria Detail</h2>
          <div className="space-y-6">
            {data.wcagReport.principles.map((principle) => {
              const filteredCriteria = principle.criteria.filter(
                (c) => levelOrder[c.level as "A" | "AA" | "AAA"] <= levelOrder[levelParam]
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
                          criterion.status === "fail"       && "bg-red-50",
                          criterion.status === "pass"       && "bg-green-50",
                          criterion.status === "not_tested" && "bg-muted/30",
                        )}>
                          <span className={cn(
                            "font-mono text-sm font-bold w-12 shrink-0",
                            criterion.status === "pass"       && "text-green-700",
                            criterion.status === "fail"       && "text-red-700",
                            criterion.status === "not_tested" && "text-muted-foreground",
                          )}>
                            {criterion.id}
                          </span>
                          <div className="flex-1">
                            <span className="font-medium text-sm">{criterion.title}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{criterion.level}</Badge>
                          </div>
                          <Badge className={cn(
                            "text-xs shrink-0",
                            criterion.status === "pass"       && "bg-green-100 text-green-800",
                            criterion.status === "fail"       && "bg-red-100 text-red-800",
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
                                <span className={cn(
                                  "text-xs",
                                  tc.result === "pass"    && "text-green-600",
                                  tc.result === "fail"    && "text-red-600",
                                  tc.result === "skip"    && "text-yellow-600",
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
                                <span className={cn(
                                  "ml-2 text-xs px-1.5 py-0.5 rounded",
                                  rec.severity === "critical" && "bg-red-100 text-red-700",
                                  rec.severity === "high"     && "bg-orange-100 text-orange-700",
                                  rec.severity === "medium"   && "bg-yellow-100 text-yellow-700",
                                  rec.severity === "low"      && "bg-blue-100 text-blue-700",
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

        {/* Improvement Roadmap */}
        <section aria-labelledby="improve-heading">
          <h2 id="improve-heading" className="text-xl font-semibold mb-4">Improvement Roadmap</h2>

          {/* Must fix (fail) */}
          {failedCriteria.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-red-700 mb-3">🔴 Must Fix ({failedCriteria.length} criteria)</h3>
              <ul className="space-y-2 list-none">
                {failedCriteria.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    <span className="font-mono font-bold text-red-600 w-12 shrink-0">{c.id}</span>
                    <span>{c.title} — {c.recommendations.length} issue{c.recommendations.length !== 1 ? "s" : ""} to address</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Not tested */}
          {untestedCriteria.length > 0 && (
            <div>
              <h3 className="font-medium text-muted-foreground mb-3">
                ⚪ Not Yet Tested ({untestedCriteria.length} criteria)
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                These criteria were not covered in this audit. Consider including them in future assessments to achieve full conformance.
              </p>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t pt-6 text-center text-xs text-muted-foreground">
          <p>WCAG 2.1 Level {levelParam} Conformance Report · AttestHub</p>
          <p className="mt-1">Generated {formatDate(data.generatedAt)}</p>
        </footer>
      </div>
    </main>
  )
}

export default function WcagPage() {
  return (
    <RoleGuard allowedRoles={["customer", "admin"]}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading report…</p>
        </div>
      }>
        <WcagPageContent />
      </Suspense>
    </RoleGuard>
  )
}
