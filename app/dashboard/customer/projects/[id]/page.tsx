"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { RoleGuard } from "@/components/role-guard"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Users,
  BarChart,
  MessageSquare,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Send,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

type ProjectStatus = "pending" | "open" | "in_review" | "scheduled" | "completed" | "cancelled"

type AssignedTester = {
  testerId: string
  role: "lead" | "member" | "reviewer"
  workStatus: "assigned" | "accepted" | "working" | "done" | "removed"
  progressPercent?: number
  assignedAt: string
}

type Comment = {
  _id?: string
  authorId: string
  authorName: string
  text: string
  createdAt: string
}

type FileRef = {
  name: string
  size: number
  type: string
}

type AuditRequest = {
  _id: string
  customerId: string
  projectName: string
  serviceCategory: "website" | "mobile" | "physical"
  servicePackage: "automated" | "hybrid" | "expert"
  accessibilityStandard: string
  targetUrl?: string
  locationAddress?: string
  devices: string[]
  specialInstructions?: string
  files?: FileRef[]
  status: ProjectStatus
  assignedTesters: AssignedTester[]
  comments: Comment[]
  priceAmount: number
  priceCurrency: "THB" | "USD"
  priority?: string
  dueDate?: string
  createdAt: string
}

type ResultSummary = {
  pass: number
  fail: number
  skip: number
  pending: number
}

type ScenarioWithSummary = {
  _id: string
  title: string
  description?: string
  assignedTesterId: string
  testerName: string
  testCaseCount: number
  resultSummary: ResultSummary
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_STEPS: ProjectStatus[] = ["pending", "open", "in_review", "scheduled", "completed"]

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

const STEP_LABEL: Record<ProjectStatus, string> = {
  pending: "Pending",
  open: "Open",
  in_review: "In Review",
  scheduled: "Scheduled",
  completed: "Done",
  cancelled: "Cancelled",
}

const SERVICE_CATEGORY_LABEL: Record<string, string> = {
  website: "Website",
  mobile: "Mobile App",
  physical: "Physical Space",
}

const SERVICE_PACKAGE_LABEL: Record<string, string> = {
  automated: "Automated",
  hybrid: "Hybrid",
  expert: "Full Expert Review",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeProgress(testers: AssignedTester[], status: ProjectStatus): number {
  const active = testers.filter((t) => t.workStatus !== "removed")
  if (active.length === 0) {
    const fallback: Record<ProjectStatus, number> = {
      pending: 0, open: 10, in_review: 40, scheduled: 70, completed: 100, cancelled: 0,
    }
    return fallback[status] ?? 0
  }
  if (active.every((t) => t.workStatus === "done")) return 100
  const working = active.filter((t) => t.workStatus === "working" || t.workStatus === "done")
  if (working.length === 0) return 0
  const sum = working.reduce((acc, t) => acc + (t.progressPercent ?? 0), 0)
  return Math.round(sum / active.length)
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusTimeline({ status }: { status: ProjectStatus }) {
  const isCancelled = status === "cancelled"
  const currentIdx = STATUS_STEPS.indexOf(status)

  return (
    <div className="flex items-center w-full overflow-x-auto pb-2">
      {STATUS_STEPS.map((step, idx) => {
        const isPast = !isCancelled && currentIdx > idx
        const isCurrent = !isCancelled && currentIdx === idx
        return (
          <div key={step} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={cn(
                  "h-4 w-4 rounded-full border-2 transition-colors",
                  isPast || isCurrent
                    ? "bg-primary border-primary"
                    : "bg-background border-muted-foreground/30"
                )}
              />
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  isCurrent ? "font-semibold text-primary" : "text-muted-foreground"
                )}
              >
                {STEP_LABEL[step]}
              </span>
            </div>
            {idx < STATUS_STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1 transition-colors",
                  isPast ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        )
      })}
      {isCancelled && (
        <div className="ml-4 flex items-center gap-2 text-destructive flex-shrink-0">
          <XCircle className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium">Cancelled</span>
        </div>
      )}
    </div>
  )
}

function ScenarioRow({ scenario }: { scenario: ScenarioWithSummary }) {
  const [open, setOpen] = useState(false)
  const { resultSummary: rs, testCaseCount } = scenario
  const total = rs.pass + rs.fail + rs.skip + rs.pending

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{scenario.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tester: {scenario.testerName} · {testCaseCount} test case{testCaseCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          {total > 0 && (
            <div className="flex items-center gap-2 text-xs">
              {rs.pass > 0 && (
                <span className="flex items-center gap-1 text-chart-2">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  {rs.pass}
                </span>
              )}
              {rs.fail > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3 w-3" aria-hidden="true" />
                  {rs.fail}
                </span>
              )}
              {rs.skip > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MinusCircle className="h-3 w-3" aria-hidden="true" />
                  {rs.skip}
                </span>
              )}
              {rs.pending > 0 && (
                <span className="flex items-center gap-1 text-chart-4">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {rs.pending}
                </span>
              )}
            </div>
          )}
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border bg-muted/20">
          {scenario.description && (
            <p className="text-sm text-muted-foreground mb-3">{scenario.description}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                { label: "Passed", value: rs.pass, icon: CheckCircle2, color: "text-chart-2" },
                { label: "Failed", value: rs.fail, icon: XCircle, color: "text-destructive" },
                { label: "Skipped", value: rs.skip, icon: MinusCircle, color: "text-muted-foreground" },
                { label: "Pending", value: rs.pending, icon: Clock, color: "text-chart-4" },
              ] as const
            ).map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-background rounded-md p-3 text-center border border-border">
                <Icon className={cn("h-5 w-5 mx-auto mb-1", color)} aria-hidden="true" />
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CommentBubble({ comment }: { comment: Comment }) {
  const initials = comment.authorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">{comment.authorName}</span>
          <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-foreground bg-muted/50 rounded-lg px-3 py-2 break-words">
          {comment.text}
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomerProjectDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [project, setProject] = useState<AuditRequest | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioWithSummary[]>([])
  const [loadingProject, setLoadingProject] = useState(true)
  const [loadingScenarios, setLoadingScenarios] = useState(true)
  const [projectError, setProjectError] = useState<string | null>(null)

  const [commentText, setCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])

  const [detailsOpen, setDetailsOpen] = useState(false)

  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch project
  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      try {
        setLoadingProject(true)
        const res = await fetch(`/api/audit-requests/${id}`, { cache: "no-store" })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json?.error || `Failed to load project (${res.status})`)
        }
        const json = await res.json()
        if (!cancelled && json.data) {
          setProject(json.data)
          setComments(json.data.comments ?? [])
        }
      } catch (e: unknown) {
        if (!cancelled) setProjectError(e instanceof Error ? e.message : "Failed to load project")
      } finally {
        if (!cancelled) setLoadingProject(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id])

  // Fetch scenarios
  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      try {
        setLoadingScenarios(true)
        const res = await fetch(`/api/admin/audit-requests/${id}/scenarios`, { cache: "no-store" })
        if (res.ok) {
          const json = await res.json()
          if (!cancelled) setScenarios(Array.isArray(json.data) ? json.data : [])
        }
        // Silently fail — no scenarios is OK for new projects
      } finally {
        if (!cancelled) setLoadingScenarios(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id])

  async function handlePostComment() {
    if (!commentText.trim()) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/customer/projects/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText.trim() }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error || "Failed to post comment")
      }
      const json = await res.json()
      if (json.data) {
        setComments((prev) => [...prev, json.data])
        setCommentText("")
        toast.success("Comment posted")
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to post comment")
    } finally {
      setSubmittingComment(false)
    }
  }

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loadingProject) {
    return (
      <RoleGuard allowedRoles={["customer"]}>
        <div className="flex min-h-screen bg-background">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col">
            <DashboardHeader />
            <main className="flex-1 p-6 lg:p-8 space-y-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </main>
          </div>
        </div>
      </RoleGuard>
    )
  }

  // ─── Error state ────────────────────────────────────────────────────────────

  if (projectError || !project) {
    return (
      <RoleGuard allowedRoles={["customer"]}>
        <div className="flex min-h-screen bg-background">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col">
            <DashboardHeader />
            <main className="flex-1 p-6 lg:p-8">
              <Button variant="ghost" size="sm" className="gap-2 mb-6" asChild>
                <Link href="/dashboard/customer">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to projects
                </Link>
              </Button>
              <Card className="p-8 text-center">
                <p className="text-destructive font-medium">{projectError ?? "Project not found"}</p>
              </Card>
            </main>
          </div>
        </div>
      </RoleGuard>
    )
  }

  // ─── Computed values ────────────────────────────────────────────────────────

  const progress = computeProgress(project.assignedTesters, project.status)
  const activeTesters = project.assignedTesters.filter((t) => t.workStatus !== "removed")

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <RoleGuard allowedRoles={["customer"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-5xl">
            {/* Back link */}
            <Button variant="ghost" size="sm" className="gap-2 -ml-2" asChild>
              <Link href="/dashboard/customer">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to projects
              </Link>
            </Button>

            {/* ── Section 1: Project Header ─────────────────────────────────── */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-wrap items-start gap-3">
                  <h1 className="text-2xl font-bold text-foreground flex-1">{project.projectName}</h1>
                  <Badge className={STATUS_BADGE[project.status]}>
                    {STATUS_LABEL[project.status]}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{SERVICE_CATEGORY_LABEL[project.serviceCategory]}</Badge>
                  <Badge variant="outline">{SERVICE_PACKAGE_LABEL[project.servicePackage]}</Badge>
                  <Badge variant="outline" className="uppercase">
                    {project.accessibilityStandard}
                  </Badge>
                  {project.priority && project.priority !== "normal" && (
                    <Badge variant="outline" className="capitalize">{project.priority} priority</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>Submitted: {formatDate(project.createdAt)}</span>
                  {project.dueDate && <span>Due: {formatDate(project.dueDate)}</span>}
                </div>
              </CardContent>
            </Card>

            {/* ── Section 2: Status Timeline ────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Project Status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusTimeline status={project.status} />
              </CardContent>
            </Card>

            {/* ── Section 3: Overview Cards ─────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Assigned Testers */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Assigned Testers</p>
                      <p className="text-2xl font-bold text-foreground">{activeTesters.length}</p>
                      {activeTesters.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {activeTesters.map((t) => (
                            <Badge key={t.testerId} variant="outline" className="text-xs capitalize">
                              {t.role}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Overall Progress */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BarChart className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Overall Progress</p>
                      <p className="text-2xl font-bold text-foreground">{progress}%</p>
                      <div
                        className="mt-2 h-2 bg-muted rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Target */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground mb-1">
                        {project.serviceCategory === "physical" ? "Location" : "Target URL"}
                      </p>
                      {project.serviceCategory === "physical" ? (
                        <p className="text-sm text-foreground break-words">
                          {project.locationAddress || "—"}
                        </p>
                      ) : project.targetUrl ? (
                        <a
                          href={project.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 break-all"
                        >
                          <span className="truncate">{project.targetUrl}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Section 4: Test Cases Summary ─────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Test Cases Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingScenarios ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : scenarios.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No test scenarios have been assigned to this project yet.
                  </p>
                ) : (
                  scenarios.map((s) => <ScenarioRow key={s._id} scenario={s} />)
                )}
              </CardContent>
            </Card>

            {/* ── Section 5: Comments ───────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet. Be the first to leave one.</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((c, i) => (
                      <CommentBubble key={c._id ?? i} comment={c} />
                    ))}
                  </div>
                )}

                <Separator />

                {/* Post comment form */}
                <div className="space-y-2">
                  <Textarea
                    ref={commentInputRef}
                    placeholder="Write a comment or question..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        handlePostComment()
                      }
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Ctrl+Enter to submit</p>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={handlePostComment}
                      disabled={submittingComment || !commentText.trim()}
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                      {submittingComment ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Section 6: Project Details (collapsible) ──────────────────── */}
            <Card>
              <button
                type="button"
                className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/30 transition-colors rounded-lg"
                onClick={() => setDetailsOpen((o) => !o)}
                aria-expanded={detailsOpen}
              >
                <CardTitle className="text-base">Submitted Project Details</CardTitle>
                {detailsOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
              </button>

              {detailsOpen && (
                <CardContent className="pt-0 space-y-4">
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Service Category
                      </p>
                      <p className="text-sm text-foreground">
                        {SERVICE_CATEGORY_LABEL[project.serviceCategory]}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Service Package
                      </p>
                      <p className="text-sm text-foreground">
                        {SERVICE_PACKAGE_LABEL[project.servicePackage]}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Accessibility Standard
                      </p>
                      <p className="text-sm text-foreground uppercase">{project.accessibilityStandard}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Devices
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {project.devices.length > 0
                          ? project.devices.map((d) => (
                              <Badge key={d} variant="outline" className="text-xs capitalize">
                                {d.replace("-", " ")}
                              </Badge>
                            ))
                          : <p className="text-sm text-muted-foreground">—</p>}
                      </div>
                    </div>
                    {project.specialInstructions && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          Special Instructions
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {project.specialInstructions}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Files */}
                  {project.files && project.files.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        Submitted Files
                      </p>
                      <div className="space-y-2">
                        {project.files.map((f, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border"
                          >
                            <span className="text-sm text-foreground truncate">{f.name}</span>
                            <span className="text-xs text-muted-foreground ml-3 flex-shrink-0">
                              {formatFileSize(f.size)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
