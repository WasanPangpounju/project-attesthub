"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Calendar, Clock, ArrowRight } from "lucide-react"

type TesterWorkStatus = "assigned" | "accepted" | "working" | "done" | "removed"

type AssignedTester = {
  testerId: string
  workStatus: TesterWorkStatus
  progressPercent?: number
}

type ProjectStatus = "pending" | "open" | "in_review" | "scheduled" | "completed" | "cancelled"

type AuditRequestFromApi = {
  _id: string
  projectName: string
  serviceCategory: "website" | "mobile" | "physical"
  servicePackage: "automated" | "hybrid" | "expert"
  status: ProjectStatus
  assignedTesters: AssignedTester[]
  createdAt: string
  dueDate?: string
  targetUrl?: string
  locationAddress?: string
  accessibilityStandard?: string
}

type TabFilter = "all" | "pending" | "active" | "completed"

const STATUS_LABEL: Record<ProjectStatus, string> = {
  pending: "Pending",
  open: "Open",
  in_review: "In Review",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
}

const STATUS_BADGE: Record<ProjectStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  open: "bg-chart-1/20 text-chart-1",
  in_review: "bg-chart-4/20 text-chart-4",
  scheduled: "bg-chart-3/20 text-chart-3",
  completed: "bg-chart-2/20 text-chart-2",
  cancelled: "bg-destructive/15 text-destructive",
}

const SERVICE_CATEGORY_LABEL: Record<string, string> = {
  website: "Website",
  mobile: "Mobile App",
  physical: "Physical Space",
}

const SERVICE_PACKAGE_LABEL: Record<string, string> = {
  automated: "Automated",
  hybrid: "Hybrid",
  expert: "Full Expert",
}

function computeProgress(item: AuditRequestFromApi): number {
  const active = item.assignedTesters.filter((t) => t.workStatus !== "removed")
  if (active.length === 0) {
    const fallback: Record<ProjectStatus, number> = {
      pending: 0, open: 10, in_review: 40, scheduled: 70, completed: 100, cancelled: 0,
    }
    return fallback[item.status] ?? 0
  }
  if (active.every((t) => t.workStatus === "done")) return 100
  const working = active.filter((t) => t.workStatus === "working" || t.workStatus === "done")
  if (working.length === 0) return 0
  const sum = working.reduce((acc, t) => acc + (t.progressPercent ?? 0), 0)
  return Math.round(sum / active.length)
}

function matchesTab(status: ProjectStatus, tab: TabFilter): boolean {
  if (tab === "all") return true
  if (tab === "pending") return status === "pending"
  if (tab === "active") return status === "open" || status === "in_review" || status === "scheduled"
  if (tab === "completed") return status === "completed" || status === "cancelled"
  return true
}

export function ProjectsList() {
  const [items, setItems] = useState<AuditRequestFromApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabFilter>("all")

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch("/api/audit-requests", { cache: "no-store" })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json?.error || `Request failed (${res.status})`)
        }
        const json = await res.json()
        if (!cancelled) setItems(Array.isArray(json.data) ? json.data : [])
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load projects")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const filtered = items.filter((p) => matchesTab(p.status, tab))

  const stats = {
    total: items.length,
    active: items.filter((p) => p.status === "open" || p.status === "in_review" || p.status === "scheduled").length,
    completed: items.filter((p) => p.status === "completed").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Audit Projects</h1>
          <p className="text-muted-foreground mt-1">Manage and track your accessibility audits</p>
        </div>
        <Button className="gap-2" asChild>
          <Link href="/dashboard/customer/new-project">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="p-4">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-5 w-1/3 bg-muted rounded mb-3" />
              <div className="h-4 w-1/2 bg-muted rounded" />
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Stats */}
          {items.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.active}</p>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.completed}</p>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)}>
            <TabsList>
              <TabsTrigger value="all">All ({items.length})</TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({items.filter((p) => p.status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="active">
                In Progress ({items.filter((p) => matchesTab(p.status, "active")).length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({items.filter((p) => matchesTab(p.status, "completed")).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Empty state */}
          {filtered.length === 0 && (
            <Card className="p-10 text-center">
              <p className="text-muted-foreground mb-4">
                {tab === "all"
                  ? "You haven't submitted any audit requests yet."
                  : `No projects in this category.`}
              </p>
              {tab === "all" && (
                <Button asChild>
                  <Link href="/dashboard/customer/new-project">
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Create your first project
                  </Link>
                </Button>
              )}
            </Card>
          )}

          {/* Project Cards */}
          <div className="space-y-4">
            {filtered.map((project) => {
              const progress = computeProgress(project)
              const created = new Date(project.createdAt)
              const createdStr = Number.isNaN(created.getTime())
                ? "—"
                : created.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

              return (
                <Card key={project._id} className="p-6 hover:bg-card/80 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Title row */}
                      <div className="flex flex-wrap items-start gap-3">
                        <h3 className="text-lg font-semibold text-foreground flex-1">{project.projectName}</h3>
                        <Badge className={STATUS_BADGE[project.status]}>
                          {STATUS_LABEL[project.status]}
                        </Badge>
                      </div>

                      {/* Meta badges */}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          {SERVICE_CATEGORY_LABEL[project.serviceCategory]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {SERVICE_PACKAGE_LABEL[project.servicePackage]}
                        </Badge>
                        {project.accessibilityStandard && (
                          <Badge variant="outline" className="text-xs uppercase">
                            {project.accessibilityStandard}
                          </Badge>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" aria-hidden="true" />
                          <span>Submitted: {createdStr}</span>
                        </div>
                        {project.dueDate && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" aria-hidden="true" />
                            <span>
                              Due:{" "}
                              {new Date(project.dueDate).toLocaleDateString("en-GB", {
                                day: "numeric", month: "short", year: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      {progress > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium text-foreground">{progress}%</span>
                          </div>
                          <div
                            className="h-2 bg-muted rounded-full overflow-hidden"
                            role="progressbar"
                            aria-valuenow={progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex items-center lg:self-center">
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent" asChild>
                        <Link href={`/dashboard/customer/projects/${project._id}`}>
                          View Details
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
