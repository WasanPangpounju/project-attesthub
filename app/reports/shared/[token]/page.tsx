"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ReportData } from "@/types/report"

function formatDate(d: string | undefined | null): string {
  if (!d) return "—"
  try { return new Date(d).toLocaleString() } catch { return "—" }
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

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) return
    let alive = true
    fetch(`/api/reports/shared/${encodeURIComponent(token)}/data`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(d.error ?? `Error ${res.status}`)
        }
        return res.json() as Promise<{ data: ReportData }>
      })
      .then(({ data: reportData }) => { if (alive) setData(reportData) })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Failed to load") })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-xl font-semibold">Report not available</p>
          <p className="text-muted-foreground">{error || "This link may be invalid or expired."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @media print {
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

      {/* Shared report banner */}
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 text-center">
        <p className="text-sm text-blue-800 font-medium">
          This is a shared accessibility audit report — view only
        </p>
      </div>

      <main id="main-content" data-report-ready="true" role="main">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">

          {/* Header */}
          <header>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
                  Accessibility Audit Report
                </p>
                <h1 className="text-3xl font-bold text-foreground mt-1">{data.project.projectName}</h1>
                <p className="text-muted-foreground mt-1">Generated on {formatDate(data.generatedAt)}</p>
              </div>
              <Badge className="text-sm px-3 py-1">{statusLabel[data.project.status] ?? data.project.status}</Badge>
            </div>

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

          {/* Executive Summary */}
          <section aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="text-xl font-semibold mb-4">Executive Summary</h2>
            <div className="flex items-center gap-6 p-6 bg-muted/20 rounded-xl border mb-6">
              <div className="text-center">
                <p className="text-5xl font-bold" style={{
                  color: data.summary.passRate >= 80 ? "#16a34a" : data.summary.passRate >= 50 ? "#ca8a04" : "#dc2626"
                }}>
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
          </section>

          {/* Test Results */}
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
                              <h4 className="font-medium text-sm">{tcIdx + 1}. {tc.title}</h4>
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
                            </div>
                          </div>

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
                                    <Badge className={cn("text-xs", severityBadge(rec.severity))}>{rec.severity}</Badge>
                                    <span className="font-medium text-sm">{rec.title}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                                  <div className="mt-1">
                                    <span className="text-xs font-semibold uppercase text-muted-foreground">How to fix: </span>
                                    <span className="text-sm">{rec.howToFix}</span>
                                  </div>
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

          <footer className="border-t pt-6 text-center text-xs text-muted-foreground">
            <p>Generated by AttestHub · {formatDate(data.generatedAt)}</p>
            <p className="mt-1">This report is confidential and intended for the project stakeholders only.</p>
          </footer>
        </div>
      </main>
    </div>
  )
}
