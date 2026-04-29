"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { RoleGuard } from "@/components/role-guard"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { AuditReport, ReportStatus, WcagLevel } from "@/lib/types/audit-report"
import { Search, Globe, Plus } from "lucide-react"
import { useTranslation } from "@/lib/i18n/useTranslation"

// ─── helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600"
  if (score >= 60) return "text-yellow-600"
  return "text-red-600"
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-green-50 border-green-200"
  if (score >= 60) return "bg-yellow-50 border-yellow-200"
  return "bg-red-50 border-red-200"
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// ─── ReportCard ──────────────────────────────────────────────────────────────

type R = ReturnType<typeof useTranslation>["t"]["reportsPage"]

function ReportCard({ report, s }: { report: AuditReport; s: R }) {
  const isActive = report.status === "completed"

  function statusBadge(status: ReportStatus) {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 border-green-200">{s.badgeCompleted}</Badge>
      case "scanning":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 animate-pulse">{s.badgeScanning}</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-700 border-red-200">{s.badgeFailed}</Badge>
      case "pending":
        return <Badge className="bg-gray-100 text-gray-600 border-gray-200">{s.badgePending}</Badge>
    }
  }

  function scanTypeBadge(scanType: "single" | "full_site") {
    return scanType === "full_site" ? (
      <Badge variant="outline">{s.badgeFullSite}</Badge>
    ) : (
      <Badge variant="outline">{s.badgeSinglePage}</Badge>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-semibold text-foreground truncate">{report.projectName}</span>
              {scanTypeBadge(report.scanType)}
              {statusBadge(report.status)}
              <Badge variant="secondary">WCAG {report.wcagLevel}</Badge>
            </div>

            <p className="text-sm text-muted-foreground truncate mb-2">{report.url}</p>

            {isActive && (
              <p className="text-xs text-muted-foreground">
                {report.summary.passed} {s.summaryPassed} · {report.summary.failed} {s.summaryFailed} ·{" "}
                {report.summary.warnings} {s.summaryWarnings}
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-1">{formatDate(report.generatedAt)}</p>
          </div>

          {/* Right: score + action */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            {isActive && (
              <div
                className={`flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 ${scoreBg(report.score)}`}
              >
                <span className={`text-xl font-bold leading-none ${scoreColor(report.score)}`}>
                  {report.score}
                </span>
                <span className="text-[10px] text-muted-foreground">/100</span>
              </div>
            )}

            <Link href={`/dashboard/reports/${report.id}`}>
              <Button size="sm" variant={isActive ? "default" : "outline"} disabled={!isActive}>
                {isActive ? s.viewReport : report.status === "scanning" ? s.badgeScanning : s.view}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ReportsContent() {
  const { user } = useUser()
  const { t } = useTranslation()
  const s = t.reportsPage

  const [role, setRole] = useState<string | null>(null)
  const [reports, setReports] = useState<AuditReport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [wcagFilter, setWcagFilter] = useState<string>("all")

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setRole(json?.data?.role ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false

    function load() {
      fetch("/api/audit-reports")
        .then((r) => (r.ok ? r.json() : { reports: [] }))
        .then((json) => {
          if (cancelled) return
          setReports(json.reports ?? [])
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false) })
    }

    load()

    // Auto-refresh every 10s when any report is scanning
    const interval = setInterval(() => {
      setReports((prev) => {
        const hasScanning = prev.some((r) => r.status === "scanning")
        if (hasScanning) load()
        return prev
      })
    }, 10_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const filtered = useMemo(() => {
    let list = reports

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.url.toLowerCase().includes(q) ||
          r.projectName.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === (statusFilter as ReportStatus))
    }

    if (wcagFilter !== "all") {
      list = list.filter((r) => r.wcagLevel === (wcagFilter as WcagLevel))
    }

    return list
  }, [reports, search, statusFilter, wcagFilter])

  const canInitiateScan = role === "admin" || role === "tester"

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader />
      <main className="flex-1 p-6 lg:p-8 max-w-5xl w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{s.title}</h1>
            <p className="text-muted-foreground mt-1">{s.subtitle}</p>
          </div>
          {canInitiateScan && (
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {s.newScan}
            </Button>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={s.searchPlaceholder}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder={s.statusPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{s.statusAll}</SelectItem>
              <SelectItem value="completed">{s.statusCompleted}</SelectItem>
              <SelectItem value="scanning">{s.statusScanning}</SelectItem>
              <SelectItem value="failed">{s.statusFailed}</SelectItem>
              <SelectItem value="pending">{s.statusPending}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={wcagFilter} onValueChange={setWcagFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder={s.wcagPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{s.wcagAll}</SelectItem>
              <SelectItem value="A">{s.wcagA}</SelectItem>
              <SelectItem value="AA">{s.wcagAA}</SelectItem>
              <SelectItem value="AAA">{s.wcagAAA}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{s.noReports}</p>
            <p className="text-sm mt-1">{s.noReportsHint}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((report) => (
              <ReportCard key={report.id} report={report} s={s} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function AIAuditReportsPage() {
  return (
    <RoleGuard allowedRoles={["admin", "tester", "customer"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <ReportsContent />
      </div>
    </RoleGuard>
  )
}
