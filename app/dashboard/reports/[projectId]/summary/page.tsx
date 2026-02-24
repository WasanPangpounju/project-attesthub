"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { RoleGuard } from "@/components/role-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Printer, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReportData } from "../report-types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | undefined | null): string {
  if (!d) return "—"
  try { return new Date(d).toLocaleString() } catch { return "—" }
}

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

const statusLabel: Record<string, string> = {
  pending: "Pending",
  open: "Open",
  in_review: "In Review",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SummaryPageContent() {
  const { projectId } = useParams<{ projectId: string }>()
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
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48" />
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

      {/* Print/action bar */}
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
          <Button size="sm" variant="outline" className="gap-2" asChild>
            <a href={`/api/reports/${projectId}/pdf?type=summary`} download>
              <Download className="h-4 w-4" /> Download PDF
            </a>
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
            <Badge className="text-sm px-3 py-1">{statusLabel[data.project.status] ?? data.project.status}</Badge>
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
                  <a
                    href={data.project.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
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
                  <div key={label} className={cn(
                    "text-center p-3 rounded-lg border",
                    color === "red"    && "bg-red-50 border-red-200",
                    color === "orange" && "bg-orange-50 border-orange-200",
                    color === "yellow" && "bg-yellow-50 border-yellow-200",
                    color === "blue"   && "bg-blue-50 border-blue-200",
                  )}>
                    <p className={cn(
                      "text-2xl font-bold",
                      color === "red"    && "text-red-700",
                      color === "orange" && "text-orange-700",
                      color === "yellow" && "text-yellow-700",
                      color === "blue"   && "text-blue-700",
                    )}>{count}</p>
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
          {data.project.statusHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No status history recorded.</p>
          ) : (
            <ol className="relative border-l border-border space-y-4 pl-6">
              {data.project.statusHistory.map((entry, idx) => (
                <li key={idx} className="relative">
                  <span
                    className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background"
                    aria-hidden="true"
                  />
                  <time className="text-xs text-muted-foreground">{formatDate(entry.changedAt)}</time>
                  <p className="font-medium text-sm mt-0.5">
                    {entry.from ? `${statusLabel[entry.from] ?? entry.from} → ` : ""}{statusLabel[entry.to] ?? entry.to}
                  </p>
                  {entry.note && <p className="text-xs text-muted-foreground mt-0.5">{entry.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Section 4: Test Results by Scenario */}
        <section aria-labelledby="results-heading">
          <h2 id="results-heading" className="text-xl font-semibold mb-4">Test Results</h2>
          {data.scenarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">No test scenarios recorded.</p>
          ) : (
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
                          <span
                            aria-label={tc.result.status}
                            role="img"
                            className={cn(
                              "mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                              tc.result.status === "pass"    && "bg-green-100 text-green-700",
                              tc.result.status === "fail"    && "bg-red-100 text-red-700",
                              tc.result.status === "skip"    && "bg-yellow-100 text-yellow-700",
                              tc.result.status === "pending" && "bg-gray-100 text-gray-600",
                            )}
                          >
                            {tc.result.status === "pass" ? "✓" : tc.result.status === "fail" ? "✗" : tc.result.status === "skip" ? "—" : "?"}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">
                              {tcIdx + 1}. {tc.title}
                            </h4>
                            {tc.wcagCriteria && tc.wcagCriteria.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {tc.wcagCriteria.map((id) => (
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
                                rec.severity === "high"     && "border-orange-500",
                                rec.severity === "medium"   && "border-yellow-500",
                                rec.severity === "low"      && "border-blue-500",
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
          )}
        </section>

        {/* Footer */}
        <footer className="border-t pt-6 text-center text-xs text-muted-foreground">
          <p>Generated by AttestHub · {formatDate(data.generatedAt)}</p>
          <p className="mt-1">This report is confidential and intended for the project stakeholders only.</p>
        </footer>
      </div>
    </main>
  )
}

export default function SummaryPage() {
  return (
    <RoleGuard allowedRoles={["customer", "admin"]}>
      <SummaryPageContent />
    </RoleGuard>
  )
}
