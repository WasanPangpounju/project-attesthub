"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  CheckCircle,
  XCircle,
  Play,
  Flag,
  Upload,
  MessageSquare,
  Paperclip,
  ChevronRight,
  Clock,
  BarChart,
  AlertCircle,
  Loader2,
  ClipboardList,
  CheckCircle2,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = "en" | "th"
const LANG_STORAGE_KEY = "attesthub_lang"

type TesterWorkStatus = "assigned" | "accepted" | "working" | "done" | "removed"
type TesterRole = "lead" | "member" | "reviewer"
type ServiceCategory = "website" | "mobile" | "physical"
type WorkAction = "accept" | "reject" | "start" | "done"

interface TesterEntry {
  testerId: string
  role: TesterRole
  workStatus: TesterWorkStatus
  assignedAt: string
  acceptedAt?: string
  completedAt?: string
  note?: string
  progressPercent?: number
}

interface Comment {
  _id?: string
  authorId: string
  authorName: string
  text: string
  createdAt: string
}

interface Attachment {
  _id?: string
  uploadedBy: string
  name: string
  size: number
  type: string
  url?: string
  uploadedAt: string
}

interface TestStep {
  order: number
  instruction: string
}

interface TesterResult {
  testerId: string
  status: "pending" | "pass" | "fail" | "skip"
  note?: string
  attachments: { _id?: string; name: string; size: number; type: string; url?: string; uploadedAt: string }[]
  testedAt?: string
}

interface TestCase {
  _id: string
  scenarioId: string
  title: string
  description?: string
  steps: TestStep[]
  expectedResult: string
  priority: "low" | "medium" | "high" | "critical"
  order: number
  results: TesterResult[]
  myResult: TesterResult
}

interface Scenario {
  _id: string
  title: string
  description?: string
  assignedTesterId: string
  order: number
  testCases: TestCase[]
}

interface Task {
  _id: string
  customerId: string
  projectName: string
  serviceCategory: ServiceCategory
  targetUrl: string
  locationAddress: string
  accessibilityStandard: string
  servicePackage: "automated" | "hybrid" | "expert"
  devices: string[]
  specialInstructions: string
  priceAmount: number
  priceCurrency: "THB" | "USD"
  priceNote?: string
  status: string
  assignedTesters: TesterEntry[]
  comments: Comment[]
  attachments: Attachment[]
  priority?: "low" | "normal" | "high" | "urgent"
  dueDate?: string
  adminNotes?: string
  createdAt: string
  updatedAt: string
  myTesterEntry: TesterEntry
}

// ─── Constants ────────────────────────────────────────────────────────────────

const dict = {
  en: {
    skip: "Skip to main content",
    title: "My Tasks",
    subtitle: "Manage your assigned accessibility testing tasks",
    langLabel: "Language",
    langEn: "English",
    langTh: "ไทย",
    statsAssigned: "Assigned",
    statsAccepted: "Accepted",
    statsInProgress: "In Progress",
    statsDone: "Done",
    tabAll: "All",
    tabAssigned: "Assigned",
    tabInProgress: "In Progress",
    tabDone: "Done",
    noTasks: "No tasks found",
  },
  th: {
    skip: "ข้ามไปยังเนื้อหาหลัก",
    title: "งานของฉัน",
    subtitle: "จัดการงานทดสอบการเข้าถึงที่ได้รับมอบหมาย",
    langLabel: "ภาษา",
    langEn: "English",
    langTh: "ไทย",
    statsAssigned: "ได้รับมอบหมาย",
    statsAccepted: "ยอมรับแล้ว",
    statsInProgress: "กำลังทำ",
    statsDone: "เสร็จแล้ว",
    tabAll: "ทั้งหมด",
    tabAssigned: "รอรับ",
    tabInProgress: "กำลังทำ",
    tabDone: "เสร็จแล้ว",
    noTasks: "ไม่พบงาน",
  },
} satisfies Record<Lang, Record<string, string>>

const workStatusColors: Record<TesterWorkStatus, string> = {
  assigned: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  accepted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  working: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  removed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

const workStatusLabels: Record<TesterWorkStatus, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  working: "In Progress",
  done: "Done",
  removed: "Removed",
}

const categoryColors: Record<ServiceCategory, string> = {
  website: "bg-blue-100 text-blue-700",
  mobile: "bg-purple-100 text-purple-700",
  physical: "bg-orange-100 text-orange-700",
}

const resultColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  pass: "bg-green-100 text-green-700",
  fail: "bg-red-100 text-red-700",
  skip: "bg-yellow-100 text-yellow-700",
}

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isLang(v: unknown): v is Lang {
  return v === "en" || v === "th"
}

function fmtDate(d?: string): string {
  if (!d) return "—"
  try { return new Date(d).toLocaleDateString() } catch { return "—" }
}

function fmtDateTime(d?: string): string {
  if (!d) return "—"
  try { return new Date(d).toLocaleString() } catch { return "—" }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className={cn("rounded-xl border p-4", colorClass)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  )
}

function ActionButtons({
  task,
  onAction,
}: {
  task: Task
  onAction: (id: string, action: WorkAction) => void
}) {
  const ws = task.myTesterEntry?.workStatus

  if (ws === "assigned") {
    return (
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={() => onAction(task._id, "accept")}
          className="gap-1.5"
          aria-label="Accept task"
        >
          <CheckCircle className="h-3.5 w-3.5" /> Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAction(task._id, "reject")}
          className="gap-1.5 text-destructive border-destructive/50 hover:bg-destructive/10"
          aria-label="Reject task"
        >
          <XCircle className="h-3.5 w-3.5" /> Reject
        </Button>
      </div>
    )
  }

  if (ws === "accepted") {
    return (
      <Button size="sm" onClick={() => onAction(task._id, "start")} className="gap-1.5" aria-label="Start working">
        <Play className="h-3.5 w-3.5" /> Start Working
      </Button>
    )
  }

  if (ws === "working") {
    return (
      <Button
        size="sm"
        onClick={() => onAction(task._id, "done")}
        className="gap-1.5 bg-green-600 hover:bg-green-700"
        aria-label="Mark as done"
      >
        <Flag className="h-3.5 w-3.5" /> Mark as Done
      </Button>
    )
  }

  if (ws === "done") {
    return (
      <Button size="sm" variant="outline" disabled className="gap-1.5" aria-label="View report (coming soon)">
        <BarChart className="h-3.5 w-3.5" /> View Report
      </Button>
    )
  }

  return null
}

function TaskCard({
  task,
  onOpen,
  onAction,
}: {
  task: Task
  onOpen: (task: Task) => void
  onAction: (id: string, action: WorkAction) => void
}) {
  const ws = task.myTesterEntry?.workStatus ?? "assigned"
  const progress = task.myTesterEntry?.progressPercent ?? 0

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => onOpen(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(task) }}
      aria-label={`Open task details: ${task.projectName}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Name + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-base">{task.projectName}</h3>
            <Badge className={cn("text-xs", categoryColors[task.serviceCategory])}>
              {task.serviceCategory}
            </Badge>
            <Badge className={cn("text-xs", workStatusColors[ws])}>
              {workStatusLabels[ws]}
            </Badge>
          </div>

          {/* Customer ID */}
          <p className="text-xs text-muted-foreground mb-2">{task.customerId}</p>

          {/* Standard + Package */}
          <p className="text-sm text-muted-foreground">
            {task.accessibilityStandard} · {task.servicePackage}
          </p>

          {/* Due date */}
          {task.dueDate && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Due: {fmtDate(task.dueDate)}
            </div>
          )}

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" aria-label={`Task progress: ${progress}%`} />
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" aria-hidden="true" />
      </div>

      {/* Action buttons — stop propagation so clicking buttons doesn't open the drawer */}
      <div
        className="mt-3 pt-3 border-t border-border"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <ActionButtons task={task} onAction={onAction} />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TesterDashboardPage() {
  const { user } = useUser()

  // Lang
  const [lang, setLang] = useState<Lang>("en")
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY)
      if (isLang(saved)) setLang(saved)
    } catch { /* ignore */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem(LANG_STORAGE_KEY, lang) } catch { /* ignore */ }
  }, [lang])
  const t = useMemo(() => dict[lang], [lang])

  const testerName = useMemo(() => {
    if (!user) return "Tester"
    return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Tester"
  }, [user])

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError("")

    fetch("/api/tester/tasks", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
        }
        return res.json() as Promise<{ data: Task[] }>
      })
      .then(({ data }) => {
        if (alive) setTasks(Array.isArray(data) ? data : [])
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Failed to load tasks") })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [])

  // Stats
  const stats = useMemo(() => {
    const visible = tasks.filter((task) => task.myTesterEntry?.workStatus !== "removed")
    return {
      assigned: visible.filter((task) => task.myTesterEntry?.workStatus === "assigned").length,
      accepted: visible.filter((task) => task.myTesterEntry?.workStatus === "accepted").length,
      working: visible.filter((task) => task.myTesterEntry?.workStatus === "working").length,
      done: visible.filter((task) => task.myTesterEntry?.workStatus === "done").length,
    }
  }, [tasks])

  // Filtered tasks per tab
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const ws = task.myTesterEntry?.workStatus
      if (ws === "removed") return false
      if (activeTab === "all") return true
      if (activeTab === "assigned") return ws === "assigned"
      if (activeTab === "in_progress") return ws === "accepted" || ws === "working"
      if (activeTab === "done") return ws === "done"
      return true
    })
  }, [tasks, activeTab])

  // ─── Drawer state ──────────────────────────────────────────────────────────

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerComments, setDrawerComments] = useState<Comment[]>([])
  const [drawerAttachments, setDrawerAttachments] = useState<Attachment[]>([])

  // Progress
  const [progressValue, setProgressValue] = useState(0)
  const [savingProgress, setSavingProgress] = useState(false)
  const [savedProgress, setSavedProgress] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Comments
  const [commentText, setCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)

  // Attachments
  const [submittingAttachment, setSubmittingAttachment] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Test Cases
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null)
  const [expandedTestCase, setExpandedTestCase] = useState<string | null>(null)
  const [submittingResult, setSubmittingResult] = useState<string | null>(null)
  const [resultNotes, setResultNotes] = useState<Record<string, string>>({})

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  // Fetch scenarios when drawer opens
  useEffect(() => {
    if (!drawerOpen || !selectedTask) return
    let alive = true
    setLoadingScenarios(true)
    fetch(`/api/tester/tasks/${selectedTask._id}/scenarios`, { cache: "no-store" })
      .then((res) => res.json())
      .then(({ data }) => { if (alive) setScenarios(Array.isArray(data) ? data : []) })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingScenarios(false) })
    return () => { alive = false }
  }, [drawerOpen, selectedTask?._id])

  function openDrawer(task: Task) {
    setSelectedTask(task)
    setDrawerComments(task.comments ?? [])
    setDrawerAttachments(task.attachments ?? [])
    setProgressValue(task.myTesterEntry?.progressPercent ?? 0)
    setSavedProgress(false)
    setCommentText("")
    setScenarios([])
    setExpandedScenario(null)
    setExpandedTestCase(null)
    setResultNotes({})
    setDrawerOpen(true)
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async function performAction(taskId: string, action: WorkAction) {
    try {
      const res = await fetch(`/api/tester/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      const { data } = await res.json() as { data: Task & { assignedTesters: TesterEntry[] } }

      const userId = user?.id
      const myEntry =
        data.assignedTesters?.find((tEntry) => tEntry.testerId === userId) ??
        selectedTask?.myTesterEntry

      const updatedTask: Task = {
        ...data,
        comments: selectedTask?._id === taskId ? drawerComments : (data.comments ?? []),
        attachments: selectedTask?._id === taskId ? drawerAttachments : (data.attachments ?? []),
        myTesterEntry: myEntry as TesterEntry,
      }

      setTasks((prev) => prev.map((t) => (t._id === taskId ? updatedTask : t)))
      if (selectedTask?._id === taskId) setSelectedTask(updatedTask)

      const toastMap: Record<WorkAction, string> = {
        accept: "Task accepted",
        reject: "Task rejected",
        start: "Started working",
        done: "Marked as complete",
      }
      toast.success(toastMap[action])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    }
  }

  const saveProgress = useCallback(async (taskId: string, percent: number) => {
    setSavingProgress(true)
    try {
      const res = await fetch(`/api/tester/tasks/${taskId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressPercent: percent }),
      })
      if (!res.ok) throw new Error("Failed to save progress")

      setTasks((prev) =>
        prev.map((t) =>
          t._id !== taskId
            ? t
            : { ...t, myTesterEntry: { ...t.myTesterEntry, progressPercent: percent } }
        )
      )
      setSelectedTask((prev) =>
        prev?._id === taskId
          ? { ...prev, myTesterEntry: { ...prev.myTesterEntry, progressPercent: percent } }
          : prev
      )
      setSavedProgress(true)
      setTimeout(() => setSavedProgress(false), 2000)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save progress")
    } finally {
      setSavingProgress(false)
    }
  }, [])

  function onProgressChange(val: number) {
    setProgressValue(val)
    setSavedProgress(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (selectedTask) saveProgress(selectedTask._id, val)
    }, 500)
  }

  async function postComment() {
    if (!commentText.trim() || !selectedTask) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/tester/tasks/${selectedTask._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: commentText.trim(),
          authorId: user?.id ?? "unknown",
          authorName: testerName,
        }),
      })
      if (!res.ok) throw new Error("Failed to post comment")
      const { data } = await res.json() as { data: Comment }
      setDrawerComments((prev) => [...prev, data])
      setCommentText("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post comment")
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedTask) return
    setSubmittingAttachment(true)
    try {
      const res = await fetch(`/api/tester/tasks/${selectedTask._id}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, type: file.type }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      const json = await res.json() as { data: Attachment | Attachment[] }
      const returned = json.data
      if (Array.isArray(returned)) {
        setDrawerAttachments(returned)
      } else {
        setDrawerAttachments((prev) => [...prev, returned])
      }
      toast.success("Attachment added")
    } catch (e) {
      console.error("Attachment upload error:", e)
      toast.error(e instanceof Error ? e.message : "Failed to add attachment")
    } finally {
      setSubmittingAttachment(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function submitResult(
    taskId: string,
    scenarioId: string,
    tcId: string,
    status: "pass" | "fail" | "skip"
  ) {
    setSubmittingResult(tcId)
    try {
      const note = resultNotes[tcId] ?? ""
      const res = await fetch(
        `/api/tester/tasks/${taskId}/scenarios/${scenarioId}/test-cases/${tcId}/result`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, note }),
        }
      )
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      setScenarios((prev) =>
        prev.map((sc) =>
          sc._id !== scenarioId ? sc : {
            ...sc,
            testCases: sc.testCases.map((tc) =>
              tc._id !== tcId ? tc : {
                ...tc,
                myResult: { ...tc.myResult, status, note, testedAt: new Date().toISOString() },
              }
            ),
          }
        )
      )
      toast.success(
        status === "pass" ? "Marked as Pass ✓" :
        status === "fail" ? "Marked as Fail ✗" : "Marked as Skip"
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit result")
    } finally {
      setSubmittingResult(null)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const taskListContent = (
    <>
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))
      ) : error ? (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart className="mx-auto h-12 w-12 mb-3 opacity-30" aria-hidden="true" />
          <p>{t.noTasks}</p>
        </div>
      ) : (
        filteredTasks.map((task) => (
          <TaskCard key={task._id} task={task} onOpen={openDrawer} onAction={performAction} />
        ))
      )}
    </>
  )

  return (
    <DashboardLayout testerName={testerName}>
      <a href="#main-content" className="skip-to-main">
        {t.skip}
      </a>

      <main id="main-content" className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
                {t.title}
              </h1>
              <p className="text-lg text-muted-foreground">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t.langLabel}:</span>
              <Button
                type="button"
                variant={lang === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => setLang("en")}
              >
                {t.langEn}
              </Button>
              <Button
                type="button"
                variant={lang === "th" ? "default" : "outline"}
                size="sm"
                onClick={() => setLang("th")}
              >
                {t.langTh}
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          {!loading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label={t.statsAssigned} value={stats.assigned} colorClass="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30" />
              <StatCard label={t.statsAccepted} value={stats.accepted} colorClass="border-blue-200 bg-blue-50 dark:bg-blue-950/30" />
              <StatCard label={t.statsInProgress} value={stats.working} colorClass="border-purple-200 bg-purple-50 dark:bg-purple-950/30" />
              <StatCard label={t.statsDone} value={stats.done} colorClass="border-green-200 bg-green-50 dark:bg-green-950/30" />
            </div>
          )}

          {/* Tabs + Task List */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">{t.tabAll}</TabsTrigger>
              <TabsTrigger value="assigned">{t.tabAssigned}</TabsTrigger>
              <TabsTrigger value="in_progress">{t.tabInProgress}</TabsTrigger>
              <TabsTrigger value="done">{t.tabDone}</TabsTrigger>
            </TabsList>

            {["all", "assigned", "in_progress", "done"].map((tabVal) => (
              <TabsContent key={tabVal} value={tabVal} className="space-y-3 mt-4">
                {taskListContent}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>

      {/* Task Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col">
          {selectedTask && (
            <>
              <SheetHeader className="p-6 pb-4 border-b shrink-0">
                <SheetTitle className="text-xl">{selectedTask.projectName}</SheetTitle>
                <div className="flex gap-2 flex-wrap mt-1">
                  <Badge className={categoryColors[selectedTask.serviceCategory]}>
                    {selectedTask.serviceCategory}
                  </Badge>
                  <Badge className={workStatusColors[selectedTask.myTesterEntry?.workStatus ?? "assigned"]}>
                    {workStatusLabels[selectedTask.myTesterEntry?.workStatus ?? "assigned"]}
                  </Badge>
                  {selectedTask.priority && (
                    <Badge variant="outline" className="capitalize">{selectedTask.priority}</Badge>
                  )}
                </div>
              </SheetHeader>

              <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                <TabsList className="mx-6 mt-4 shrink-0 w-auto justify-start">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="progress">Progress</TabsTrigger>
                  <TabsTrigger value="comments" className="gap-1">
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    Comments
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="gap-1">
                    <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="testcases" className="gap-1">
                    <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                    Test Cases
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto">
                  {/* Overview */}
                  <TabsContent value="overview" className="p-6 space-y-4 mt-0">
                    <InfoRow label="Customer" value={selectedTask.customerId} />
                    <InfoRow
                      label="Target URL / Address"
                      value={selectedTask.targetUrl || selectedTask.locationAddress || "—"}
                    />
                    <InfoRow label="Accessibility Standard" value={selectedTask.accessibilityStandard} />
                    <InfoRow label="Service Package" value={selectedTask.servicePackage} />
                    <InfoRow
                      label="Devices"
                      value={(selectedTask.devices || []).join(", ") || "—"}
                    />
                    {selectedTask.dueDate && (
                      <InfoRow label="Due Date" value={fmtDate(selectedTask.dueDate)} />
                    )}
                    <InfoRow label="Role" value={selectedTask.myTesterEntry?.role ?? "—"} />

                    {selectedTask.specialInstructions && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Special Instructions</p>
                          <p className="text-sm mt-0.5 whitespace-pre-wrap">{selectedTask.specialInstructions}</p>
                        </div>
                      </>
                    )}
                    {selectedTask.adminNotes && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Admin Notes</p>
                          <p className="text-sm mt-0.5 whitespace-pre-wrap text-muted-foreground">
                            {selectedTask.adminNotes}
                          </p>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* Progress */}
                  <TabsContent value="progress" className="p-6 space-y-6 mt-0">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Progress</p>
                        <span className="text-sm font-semibold tabular-nums">{progressValue}%</span>
                      </div>
                      {selectedTask.myTesterEntry?.workStatus === "done" ? (
                        <div className="space-y-2">
                          <Progress
                            value={progressValue}
                            className="h-3"
                            aria-label={`Completed at ${progressValue}%`}
                          />
                          <p className="text-xs text-muted-foreground text-center">
                            Completed at {progressValue}%
                          </p>
                        </div>
                      ) : (
                        <Slider
                          value={[progressValue]}
                          onValueChange={([v]) => onProgressChange(v)}
                          min={0}
                          max={100}
                          step={5}
                          disabled={selectedTask.myTesterEntry?.workStatus !== "working"}
                          aria-label="Task progress percentage"
                        />
                      )}
                      <div className="mt-1.5 h-5 flex items-center">
                        {savingProgress && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Saving…
                          </span>
                        )}
                        {savedProgress && !savingProgress && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" aria-hidden="true" /> Saved
                          </span>
                        )}
                        {(selectedTask.myTesterEntry?.workStatus === "assigned" ||
                          selectedTask.myTesterEntry?.workStatus === "accepted") && (
                          <span className="text-xs text-muted-foreground">
                            Start working to update progress
                          </span>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Actions</p>
                      <ActionButtons task={selectedTask} onAction={performAction} />
                    </div>

                    <div className="space-y-3 text-sm">
                      {selectedTask.myTesterEntry?.acceptedAt && (
                        <InfoRow label="Accepted At" value={fmtDateTime(selectedTask.myTesterEntry.acceptedAt)} />
                      )}
                      {selectedTask.myTesterEntry?.completedAt && (
                        <InfoRow label="Completed At" value={fmtDateTime(selectedTask.myTesterEntry.completedAt)} />
                      )}
                      <InfoRow label="Assigned At" value={fmtDateTime(selectedTask.myTesterEntry?.assignedAt)} />
                    </div>
                  </TabsContent>

                  {/* Comments */}
                  <TabsContent value="comments" className="p-6 space-y-4 mt-0">
                    {drawerComments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No comments yet</p>
                    ) : (
                      <div className="space-y-4">
                        {[...drawerComments].reverse().map((c, i) => (
                          <div key={c._id ?? i} className="flex gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs">
                                {c.authorName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{c.authorName}</span>
                                <span className="text-xs text-muted-foreground">{fmtDateTime(c.createdAt)}</span>
                              </div>
                              <p className="text-sm mt-1 whitespace-pre-wrap">{c.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-2">
                      <Textarea
                        placeholder="Write a comment…"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={3}
                        aria-label="New comment"
                      />
                      <Button
                        size="sm"
                        onClick={postComment}
                        disabled={!commentText.trim() || submittingComment}
                      >
                        {submittingComment && (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" aria-hidden="true" />
                        )}
                        Send
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Test Cases */}
                  <TabsContent value="testcases" className="p-6 space-y-4 mt-0">
                    {loadingScenarios ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-20 w-full rounded-lg" />
                        ))}
                      </div>
                    ) : scenarios.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <ClipboardList className="h-12 w-12 mb-3 opacity-30" aria-hidden="true" />
                        <p className="text-sm">No test cases assigned yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {scenarios.map((scenario) => {
                          const completed = scenario.testCases.filter(
                            (tc) => tc.myResult.status !== "pending"
                          ).length
                          const total = scenario.testCases.length
                          const pct = total ? Math.round((completed / total) * 100) : 0
                          const isScenarioExpanded = expandedScenario === scenario._id

                          return (
                            <div key={scenario._id} className="border rounded-lg overflow-hidden">
                              {/* Scenario header */}
                              <button
                                className="w-full flex items-center justify-between p-3 hover:bg-accent/50 text-left"
                                onClick={() =>
                                  setExpandedScenario(isScenarioExpanded ? null : scenario._id)
                                }
                                aria-expanded={isScenarioExpanded}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isScenarioExpanded
                                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                                  <span className="font-medium text-sm truncate">{scenario.title}</span>
                                </div>
                                <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                                  {total} case{total !== 1 ? "s" : ""}
                                </Badge>
                              </button>

                              {isScenarioExpanded && (
                                <div className="border-t px-3 pb-3 pt-2 space-y-3">
                                  {/* Scenario progress */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>Progress ({completed}/{total})</span>
                                      <span>{pct}%</span>
                                    </div>
                                    <Progress
                                      value={pct}
                                      className="h-1.5"
                                      aria-label={`Scenario progress: ${pct}%`}
                                    />
                                  </div>

                                  {/* Test case list */}
                                  <div className="space-y-2">
                                    {scenario.testCases.map((tc, tcIdx) => {
                                      const prevTc = tcIdx > 0 ? scenario.testCases[tcIdx - 1] : null
                                      const isBlocked =
                                        prevTc !== null && prevTc.myResult.status === "pending"
                                      const isTCExpanded = expandedTestCase === tc._id
                                      const isSubmitting = submittingResult === tc._id
                                      const hasResult = tc.myResult.status !== "pending"

                                      return (
                                        <div
                                          key={tc._id}
                                          className={cn(
                                            "border rounded-lg overflow-hidden",
                                            isBlocked && "opacity-60"
                                          )}
                                        >
                                          {/* TC header row */}
                                          <button
                                            className="w-full flex items-center gap-2 p-3 hover:bg-accent/50 text-left"
                                            onClick={() =>
                                              setExpandedTestCase(isTCExpanded ? null : tc._id)
                                            }
                                            aria-expanded={isTCExpanded}
                                          >
                                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                                            <Badge variant="outline" className="text-xs shrink-0">
                                              #{tc.order + 1}
                                            </Badge>
                                            <Badge
                                              className={cn(
                                                "text-xs shrink-0",
                                                resultColors[tc.myResult.status]
                                              )}
                                            >
                                              {tc.myResult.status}
                                            </Badge>
                                            <span className="flex-1 text-sm font-medium min-w-0 truncate">
                                              {tc.title}
                                            </span>
                                            <Badge
                                              className={cn("text-xs shrink-0", priorityColors[tc.priority])}
                                            >
                                              {tc.priority}
                                            </Badge>
                                            {isTCExpanded
                                              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                                          </button>

                                          {/* TC expanded content */}
                                          {isTCExpanded && (
                                            <div className="border-t px-4 py-3 space-y-3 bg-muted/20 text-sm">
                                              {tc.description && (
                                                <div>
                                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                                    Description
                                                  </p>
                                                  <p className="whitespace-pre-wrap">{tc.description}</p>
                                                </div>
                                              )}

                                              {tc.steps.length > 0 && (
                                                <div>
                                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                                    Steps
                                                  </p>
                                                  <ol className="space-y-1 list-decimal list-inside">
                                                    {tc.steps.map((step, idx) => (
                                                      <li key={idx} className="text-sm">
                                                        {step.instruction}
                                                      </li>
                                                    ))}
                                                  </ol>
                                                </div>
                                              )}

                                              <div>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                                  Expected Result
                                                </p>
                                                <p className="whitespace-pre-wrap">{tc.expectedResult}</p>
                                              </div>

                                              {isBlocked ? (
                                                <p className="text-xs text-muted-foreground italic">
                                                  Complete previous test case first
                                                </p>
                                              ) : (
                                                <div className="space-y-2">
                                                  <div className="space-y-1">
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                      Note
                                                    </p>
                                                    <Textarea
                                                      placeholder="Optional note…"
                                                      value={resultNotes[tc._id] ?? tc.myResult.note ?? ""}
                                                      onChange={(e) =>
                                                        setResultNotes((prev) => ({
                                                          ...prev,
                                                          [tc._id]: e.target.value,
                                                        }))
                                                      }
                                                      rows={2}
                                                      className="resize-none text-sm"
                                                      disabled={isSubmitting}
                                                    />
                                                  </div>

                                                  {hasResult && (
                                                    <p className="text-xs text-muted-foreground">
                                                      Update Result
                                                    </p>
                                                  )}

                                                  <div className="flex gap-2 flex-wrap">
                                                    <Button
                                                      size="sm"
                                                      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                                                      onClick={() =>
                                                        selectedTask &&
                                                        submitResult(
                                                          selectedTask._id,
                                                          scenario._id,
                                                          tc._id,
                                                          "pass"
                                                        )
                                                      }
                                                      disabled={isSubmitting}
                                                      aria-label="Mark as pass"
                                                    >
                                                      {isSubmitting ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                      ) : (
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                      )}
                                                      Pass
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="destructive"
                                                      className="gap-1.5"
                                                      onClick={() =>
                                                        selectedTask &&
                                                        submitResult(
                                                          selectedTask._id,
                                                          scenario._id,
                                                          tc._id,
                                                          "fail"
                                                        )
                                                      }
                                                      disabled={isSubmitting}
                                                      aria-label="Mark as fail"
                                                    >
                                                      {isSubmitting ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                      ) : (
                                                        <XCircle className="h-3.5 w-3.5" />
                                                      )}
                                                      Fail
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="gap-1.5"
                                                      onClick={() =>
                                                        selectedTask &&
                                                        submitResult(
                                                          selectedTask._id,
                                                          scenario._id,
                                                          tc._id,
                                                          "skip"
                                                        )
                                                      }
                                                      disabled={isSubmitting}
                                                      aria-label="Mark as skip"
                                                    >
                                                      {isSubmitting ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                      ) : (
                                                        <MinusCircle className="h-3.5 w-3.5" />
                                                      )}
                                                      Skip
                                                    </Button>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* Attachments */}
                  <TabsContent value="attachments" className="p-6 space-y-4 mt-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {drawerAttachments.length} file(s)
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={submittingAttachment}
                        className="gap-1.5"
                        aria-label="Upload attachment"
                      >
                        {submittingAttachment ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        Upload
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,video/*,.pdf,.zip"
                        onChange={handleFileSelect}
                        aria-hidden="true"
                      />
                    </div>

                    {drawerAttachments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No attachments yet</p>
                    ) : (
                      <div className="space-y-2">
                        {drawerAttachments.map((a, i) => (
                          <div key={a._id ?? i} className="flex items-center gap-3 p-3 border rounded-lg">
                            <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{a.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(a.size)} · {a.type}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  )
}
