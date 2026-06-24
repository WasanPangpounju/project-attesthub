"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { RoleGuard } from "@/components/role-guard"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { ScoreCircle } from "@/components/free-scan/scan-result-views"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, ExternalLink, Globe } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportStatus = "pending" | "scanning" | "completed" | "failed"

interface UrlReport {
  _id: string
  status: ReportStatus
  score: number
  wcagLevel: string
  issues: { severity: "critical" | "serious" | "moderate" | "minor" }[]
}

interface SitemapUrlEntry {
  _id: string
  url: string
  label?: string
  addedByName: string
  auditReportId?: string
  report: UrlReport | null
}

interface SitemapReportsSummary {
  totalUrls: number
  scannedUrls: number
  avgScore: number
  totalIssues: number
  criticalCount: number
  seriousCount: number
  moderateCount: number
  minorCount: number
  wcagPassCount: number
  wcagFailCount: number
}

interface SitemapReportsData {
  auditRequestId: string
  urls: SitemapUrlEntry[]
  summary: SitemapReportsSummary
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusLabel: Record<ReportStatus, string> = {
  pending: "รอสแกน",
  scanning: "กำลังสแกน",
  completed: "เสร็จสิ้น",
  failed: "ล้มเหลว",
}

function statusBadgeClass(status: ReportStatus) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700 border-green-200"
    case "scanning":
      return "bg-blue-100 text-blue-700 border-blue-200 animate-pulse"
    case "failed":
      return "bg-red-100 text-red-700 border-red-200"
    case "pending":
      return "bg-gray-100 text-gray-600 border-gray-200"
  }
}

function severityCount(issues: UrlReport["issues"]) {
  return issues.filter((i) => i.severity === "critical" || i.severity === "serious").length
}

// ─── Content ──────────────────────────────────────────────────────────────────

function SitemapReportContent() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [data, setData] = useState<SitemapReportsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return
    let alive = true

    fetch(`/api/audit-requests/${encodeURIComponent(projectId)}/sitemap/reports`, {
      cache: "no-store",
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          router.replace("/dashboard")
          return null
        }
        return res.ok ? res.json() : null
      })
      .then((json) => {
        if (!alive || !json) return
        setData(json.data)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [projectId, router])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        <main className="flex-1 p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    )
  }

  if (!data) return null

  const { urls, summary } = data
  const unscannedCount = summary.totalUrls - summary.scannedUrls

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader />
      <main className="flex-1 p-6 lg:p-8 max-w-5xl w-full mx-auto">
        <div className="mb-4">
          <Link href={`/dashboard/reports/${projectId}/summary`}>
            <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Project Report
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">ผลตรวจสอบ Sitemap</h1>
          {unscannedCount > 0 && (
            <Badge className="bg-gray-100 text-gray-600 border-gray-200">
              {unscannedCount} URL ยังไม่ได้สแกน
            </Badge>
          )}
        </div>

        {/* ─── Summary Card ──────────────────────────────────────── */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex flex-col items-center shrink-0">
                <ScoreCircle score={summary.avgScore} size={120} showLabel={false} />
                <p className="text-sm text-muted-foreground mt-2">คะแนนเฉลี่ย</p>
              </div>

              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xl font-bold text-red-700">{summary.criticalCount}</p>
                  <p className="text-xs text-red-600 mt-0.5">Critical</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <p className="text-xl font-bold text-orange-700">{summary.seriousCount}</p>
                  <p className="text-xs text-orange-600 mt-0.5">Serious</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="text-xl font-bold text-yellow-700">{summary.moderateCount}</p>
                  <p className="text-xs text-yellow-600 mt-0.5">Moderate</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xl font-bold text-blue-700">{summary.minorCount}</p>
                  <p className="text-xs text-blue-600 mt-0.5">Minor</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-6 pt-6 border-t text-sm">
              <span className="text-muted-foreground">
                สแกนแล้ว <span className="font-semibold text-foreground">{summary.scannedUrls}</span> /{" "}
                {summary.totalUrls} URL
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                ผ่าน WCAG: <span className="font-semibold">{summary.wcagPassCount}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                ไม่ผ่าน WCAG: <span className="font-semibold">{summary.wcagFailCount}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ─── URL Table ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">รายการ URL ({urls.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {urls.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">ยังไม่มี URL ใน sitemap</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead className="w-24">คะแนน</TableHead>
                    <TableHead className="w-24">WCAG</TableHead>
                    <TableHead className="w-20">Issues</TableHead>
                    <TableHead className="w-32">สถานะ</TableHead>
                    <TableHead className="w-24 text-right">การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urls.map((entry) => {
                    const report = entry.report
                    const status = report?.status

                    return (
                      <TableRow key={entry._id}>
                        <TableCell className="max-w-sm">
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm hover:underline truncate"
                          >
                            <span className="truncate">{entry.url}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                          </a>
                          {entry.label && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.label}</p>
                          )}
                        </TableCell>

                        <TableCell>
                          {report ? (
                            <span className="font-semibold">{report.score}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {report ? (
                            <Badge variant="secondary">{report.wcagLevel}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">ยังไม่สแกน</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {report ? severityCount(report.issues) : <span className="text-muted-foreground">—</span>}
                        </TableCell>

                        <TableCell>
                          {status ? (
                            <Badge className={`capitalize text-xs ${statusBadgeClass(status)}`}>
                              {statusLabel[status]}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">
                              ยังไม่สแกน
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          {report?.status === "completed" ? (
                            <Link href={`/dashboard/reports/${report._id}`}>
                              <Button size="sm" variant="outline">
                                ดูผล
                              </Button>
                            </Link>
                          ) : (
                            <Button size="sm" variant="outline" disabled>
                              ดูผล
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SitemapReportPage() {
  return (
    <RoleGuard allowedRoles={["admin", "tester", "customer"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <SitemapReportContent />
      </div>
    </RoleGuard>
  )
}
