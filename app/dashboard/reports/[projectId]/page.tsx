"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { notFound } from "next/navigation"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts"
import { RoleGuard } from "@/components/role-guard"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { ExportButton } from "@/components/reports/ExportButton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AuditIssue, AuditReport, IssueSeverity } from "@/lib/types/audit-report"
import { ArrowLeft, Search, Globe, AlertCircle, Clock, FileSearch } from "lucide-react"

// ─── helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600"
  if (score >= 60) return "text-yellow-600"
  return "text-red-600"
}

function scoreBorderColor(score: number) {
  if (score >= 80) return "border-green-400"
  if (score >= 60) return "border-yellow-400"
  return "border-red-400"
}

function severityBadgeClass(severity: IssueSeverity) {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-700 border-red-200"
    case "serious":
      return "bg-orange-100 text-orange-700 border-orange-200"
    case "moderate":
      return "bg-yellow-100 text-yellow-700 border-yellow-200"
    case "minor":
      return "bg-blue-100 text-blue-700 border-blue-200"
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatDuration(ms: number) {
  if (ms === 0) return "—"
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

const CHART_COLORS = ["#16a34a", "#dc2626", "#ca8a04"]

// ─── IssueRow ─────────────────────────────────────────────────────────────────

function IssueRow({ issue, showPage }: { issue: AuditIssue; showPage: boolean }) {
  return (
    <TableRow>
      <TableCell className="align-top w-32">
        <Badge className={`capitalize text-xs ${severityBadgeClass(issue.severity)}`}>
          {issue.severity}
        </Badge>
      </TableCell>

      <TableCell className="align-top w-40">
        <p className="font-mono text-sm font-semibold">{issue.wcagCriteria}</p>
        <p className="text-xs text-muted-foreground leading-snug">{issue.wcagTitle}</p>
      </TableCell>

      <TableCell className="align-top">
        {showPage && issue.pageUrl && (
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-xs">{issue.pageUrl}</span>
          </p>
        )}
        <p className="text-sm mb-1">{issue.description}</p>
        <code className="block text-xs bg-muted rounded px-2 py-1 font-mono truncate max-w-sm mb-1">
          {issue.element}
        </code>
        <p className="text-xs text-muted-foreground">
          💡 {issue.recommendation}
        </p>
      </TableCell>
    </TableRow>
  )
}

// ─── Content ─────────────────────────────────────────────────────────────────

function ReportDetailContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params.projectId as string
  const fromProjectId = searchParams.get("from")
  const backHref = fromProjectId ? `/dashboard/reports/${fromProjectId}/sitemap` : "/dashboard/reports"
  const { user } = useUser()

  const [role, setRole] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [report, setReport] = useState<AuditReport | null>(null)
  const [reportLoading, setReportLoading] = useState(true)
  const [reportNotFound, setReportNotFound] = useState(false)
  const [severityFilter, setSeverityFilter] = useState("all")
  const [wcagFilter, setWcagFilter] = useState("all")
  const [descSearch, setDescSearch] = useState("")

  const wcagOptions = useMemo(
    () =>
      Array.from(new Set((report?.issues ?? []).map((i) => i.wcagCriteria).filter(Boolean))).sort(),
    [report],
  )

  const filteredIssues = useMemo(() => {
    if (!report) return []
    const severityOrder: IssueSeverity[] = ["critical", "serious", "moderate", "minor"]
    return report.issues
      .filter((issue) => {
        if (severityFilter !== "all" && issue.severity !== severityFilter) return false
        if (wcagFilter !== "all" && issue.wcagCriteria !== wcagFilter) return false
        if (
          descSearch &&
          !issue.description.toLowerCase().includes(descSearch.toLowerCase())
        )
          return false
        return true
      })
      .sort(
        (a, b) =>
          severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
      )
  }, [report, severityFilter, wcagFilter, descSearch])

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setRole(json?.data?.role ?? null))
      .catch(() => {})
      .finally(() => setAuthChecked(true))
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false

    function load() {
      fetch(`/api/audit-reports/${id}`)
        .then((r) => {
          if (r.status === 404 || r.status === 403) { setReportNotFound(true); return null }
          return r.ok ? r.json() : null
        })
        .then((json) => { if (!cancelled && json) setReport(json.report) })
        .catch(() => {})
        .finally(() => { if (!cancelled) setReportLoading(false) })
    }

    load()

    // Auto-refresh every 10s when scanning
    const interval = setInterval(() => {
      setReport((prev) => {
        if (prev?.status === "scanning") load()
        return prev
      })
    }, 10_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [id])

  // Customer access check — redirect if report doesn't belong to them
  useEffect(() => {
    if (authChecked && role === "customer" && report && report.requestedBy !== user?.id) {
      router.replace("/dashboard/reports")
    }
  }, [authChecked, role, user?.id, report, router])

  // All hooks are above — safe to conditionally return now
  if (reportNotFound) notFound()

  if (reportLoading || !authChecked) {
    return (
      <div className="flex-1 p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!report) return null

  // Prevent flash while redirect is in progress
  if (role === "customer" && report.requestedBy !== user?.id) return null

  const isCompleted = report.status === "completed"
  const isScanning = report.status === "scanning"
  const isFailed = report.status === "failed"

  const chartData = [
    { name: "Passed", value: report.summary.passed },
    { name: "Failed", value: report.summary.failed },
    { name: "Warnings", value: report.summary.warnings },
  ]

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader />

      <main className="flex-1 p-6 lg:p-8 max-w-5xl w-full mx-auto">
        {/* Print stylesheet — hides interactive elements */}
        <style>{`@media print { .no-print { display: none !important; } }`}</style>

        {/* Back button */}
        <div className="no-print mb-4">
          <Link href={backHref}>
            <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              {fromProjectId ? "Back to Sitemap Report" : "Back to Reports"}
            </Button>
          </Link>
        </div>

        {/* ─── Failed error banner ──────────────────────── */}
        {isFailed && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-semibold text-sm">Scan Failed</p>
              <p className="text-sm mt-0.5">
                {report.errorMessage || "The scan could not be completed. Please try again or contact support."}
              </p>
            </div>
          </div>
        )}

        {/* ─── Scanning progress banner ─────────────────── */}
        {isScanning && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-3 mb-2">
              <FileSearch className="h-5 w-5 text-blue-600 animate-pulse shrink-0" />
              <p className="text-sm font-semibold text-blue-800">Scan in progress…</p>
            </div>
            <div className="h-2 w-full rounded-full bg-blue-100 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full w-3/5 animate-pulse" />
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Results will appear here automatically when the scan completes.
            </p>
          </div>
        )}

        {/* ─── Section 1: Header + Score ──────────────────── */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Left: project info + stats */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold mb-0.5">{report.projectName}</h1>
                <p className="text-sm text-muted-foreground mb-3 truncate">{report.url}</p>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge variant="outline">
                    {report.scanType === "full_site" ? "Full Site Scan" : "Single Page Scan"}
                  </Badge>
                  <Badge variant="secondary">WCAG {report.wcagLevel}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(report.generatedAt)}
                  </span>
                  {report.pagesScanned > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {report.pagesScanned} pages
                    </span>
                  )}
                  {report.scanDurationMs > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(report.scanDurationMs)}
                    </span>
                  )}
                </div>

                {isCompleted && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{report.summary.passed}</p>
                      <p className="text-xs text-muted-foreground">Passed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{report.summary.failed}</p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">
                        {report.summary.warnings}
                      </p>
                      <p className="text-xs text-muted-foreground">Warnings</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{report.summary.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                )}

                {!isCompleted && (
                  <p className="text-sm text-muted-foreground capitalize">{report.status}</p>
                )}
              </div>

              {/* Right: score circle + export */}
              {isCompleted && (
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <div
                    className={`flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 ${scoreBorderColor(report.score)}`}
                  >
                    <span
                      className={`text-3xl font-bold leading-none ${scoreColor(report.score)}`}
                    >
                      {report.score}
                    </span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>

                  <div className="no-print">
                    <ExportButton report={report} />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── Section 2: Summary Chart ──────────────────── */}
        {isCompleted && report.summary.total > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Results Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ─── Section 3: Issues Table ───────────────────── */}
        {isCompleted ? (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base">
                  Issues ({filteredIssues.length}
                  {filteredIssues.length !== report.issues.length
                    ? ` of ${report.issues.length}`
                    : ""})
                </CardTitle>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2 no-print">
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="serious">Serious</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={wcagFilter} onValueChange={setWcagFilter}>
                    <SelectTrigger className="w-full sm:w-36">
                      <SelectValue placeholder="WCAG" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All WCAG</SelectItem>
                      {wcagOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search description…"
                      className="pl-9 w-full sm:w-52"
                      value={descSearch}
                      onChange={(e) => setDescSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredIssues.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No issues match your filters.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Severity</TableHead>
                      <TableHead className="w-40">WCAG</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIssues.map((issue) => (
                      <IssueRow
                        key={issue.id}
                        issue={issue}
                        showPage={report.scanType === "full_site"}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : (
          !isFailed && !isScanning && (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium capitalize">{report.status}</p>
                <p className="text-sm mt-1">No results available yet.</p>
              </CardContent>
            </Card>
          )
        )}
      </main>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AIReportDetailPage() {
  return (
    <RoleGuard allowedRoles={["admin", "tester", "customer"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <Suspense fallback={<div className="flex-1 p-8 text-sm text-muted-foreground">Loading…</div>}>
          <ReportDetailContent />
        </Suspense>
      </div>
    </RoleGuard>
  )
}
