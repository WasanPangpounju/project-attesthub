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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { AuditReport, ReportStatus, WcagLevel } from "@/lib/types/audit-report"
import { Search, Globe, Plus, RefreshCw, Trash2, Layers, List, ChevronDown, ChevronRight, Map as MapIcon } from "lucide-react"
import { useTranslation } from "@/lib/i18n/useTranslation"
import { toast } from "sonner"

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

function ReportCard({
  report,
  s,
  isAdmin,
  isRescanning,
  onRescan,
  onDeleteRequest,
}: {
  report: AuditReport
  s: R
  isAdmin: boolean
  isRescanning: boolean
  onRescan: (id: string) => void
  onDeleteRequest: (id: string) => void
}) {
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

            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={report.status === "scanning" || isRescanning}
                  onClick={() => onRescan(report.id)}
                  aria-label={`Rescan ${report.projectName}`}
                >
                  <RefreshCw className={`h-4 w-4 ${isRescanning ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => onDeleteRequest(report.id)}
                  aria-label={`Delete ${report.projectName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [rescanning, setRescanning] = useState<Set<string>>(new Set())
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("flat")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setRole(json?.data?.role ?? null))
      .catch(() => {})
  }, [])

  function fetchReports() {
    return fetch("/api/audit-reports")
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((json) => {
        setReports(json.reports ?? [])
      })
      .catch(() => {})
  }

  useEffect(() => {
    let cancelled = false

    function load() {
      fetchReports().finally(() => { if (!cancelled) setLoading(false) })
    }

    load()

    // Auto-refresh every 10s when any report is scanning
    const interval = setInterval(() => {
      setReports((prev) => {
        const hasScanning = prev.some((r) => r.status === "scanning")
        if (hasScanning) fetchReports()
        return prev
      })
    }, 10_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  async function handleDelete(reportId: string) {
    setDeletingId(reportId)
    try {
      const res = await fetch(`/api/audit-reports/${reportId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Request failed (${res.status})`)
      }
      toast.success("ลบรายงานแล้ว")
      await fetchReports()
    } catch (e: any) {
      toast.error(e?.message || "ลบรายงานไม่สำเร็จ")
    } finally {
      setPendingDeleteId(null)
      setDeletingId(null)
    }
  }

  async function handleRescan(reportId: string) {
    setRescanning((prev) => new Set(prev).add(reportId))
    try {
      const res = await fetch(`/api/audit-reports/${reportId}/rescan`, { method: "POST" })
      if (res.status === 409) {
        toast.error("กำลังสแกนอยู่แล้ว")
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Request failed (${res.status})`)
      }
      toast.success("เริ่มสแกนใหม่แล้ว")
    } catch (e: any) {
      toast.error(e?.message || "เริ่มสแกนใหม่ไม่สำเร็จ")
    } finally {
      setRescanning((prev) => {
        const next = new Set(prev)
        next.delete(reportId)
        return next
      })
    }
  }

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

  const grouped = useMemo(() => {
    const map = new Map<string, { projectName: string; auditRequestId: string; reports: AuditReport[] }>()
    for (const r of filtered) {
      const key = r.auditRequestId || "unknown"
      if (!map.has(key)) {
        map.set(key, { projectName: r.projectName, auditRequestId: key, reports: [] })
      }
      map.get(key)!.reports.push(r)
    }
    // sort: project ที่มี report ล่าสุดขึ้นก่อน
    return [...map.values()].sort((a, b) => {
      const aLatest = Math.max(...a.reports.map((r) => new Date(r.generatedAt).getTime()))
      const bLatest = Math.max(...b.reports.map((r) => new Date(r.generatedAt).getTime()))
      return bLatest - aLatest
    })
  }, [filtered])

  function toggleGroup(auditRequestId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(auditRequestId)) {
        next.delete(auditRequestId)
      } else {
        next.add(auditRequestId)
      }
      return next
    })
  }

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
          {role === "admin" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-md border p-1 gap-1">
                <Button
                  size="sm"
                  variant={viewMode === "flat" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("flat")}
                  aria-label="Flat view"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "grouped" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("grouped")}
                  aria-label="Grouped by project view"
                >
                  <Layers className="h-4 w-4" />
                </Button>
              </div>
              <Link href="/dashboard/admin/scan">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {s.newScan}
                </Button>
              </Link>
            </div>
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
        ) : viewMode === "grouped" && role === "admin" ? (
          <div className="space-y-6">
            {grouped.map((group) => {
              const isCollapsed = collapsedGroups.has(group.auditRequestId)
              return (
                <div key={group.auditRequestId} className="space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-left"
                      onClick={() => toggleGroup(group.auditRequestId)}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold text-lg">{group.projectName}</span>
                      <Badge variant="secondary">{group.reports.length} URL</Badge>
                    </button>

                    {group.auditRequestId !== "unknown" && (
                      <Link href={`/dashboard/reports/${group.auditRequestId}/sitemap`}>
                        <Button size="sm" variant="outline" className="gap-2">
                          <MapIcon className="h-4 w-4" />
                          ดูภาพรวม sitemap
                        </Button>
                      </Link>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="space-y-4">
                      {group.reports.map((report) => (
                        <ReportCard
                          key={report.id}
                          report={report}
                          s={s}
                          isAdmin={role === "admin"}
                          isRescanning={rescanning.has(report.id)}
                          onRescan={handleRescan}
                          onDeleteRequest={setPendingDeleteId}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                s={s}
                isAdmin={role === "admin"}
                isRescanning={rescanning.has(report.id)}
                onRescan={handleRescan}
                onDeleteRequest={setPendingDeleteId}
              />
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบรายงาน</AlertDialogTitle>
            <AlertDialogDescription>
              รายงานนี้จะถูกลบถาวร รวมถึงผลการตรวจทั้งหมด ต้องสแกนใหม่ถ้าต้องการผลอีกครั้ง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDeleteId(null)}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingId === pendingDeleteId}
              onClick={() => pendingDeleteId && handleDelete(pendingDeleteId)}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
