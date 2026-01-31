"use client"

import { useUser } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, Clock, ExternalLink } from "lucide-react"

// รูปแบบข้อมูลที่มาจาก API (/api/audit-requests)
type AuditRequestFromApi = {
  _id: string
  customerId: string            
  projectName: string
  serviceCategory: "website" | "mobile" | "physical"
  servicePackage: "automated" | "hybrid" | "expert"
  status: "pending" | "in_review" | "scheduled" | "completed"
  createdAt: string
  targetUrl?: string
  accessibilityStandard?: string
}

// รูปแบบที่ใช้ภายใน component (เหมือน prototype เดิม)
type ProjectCard = {
  id: string | number
  name: string
  status: "Pending" | "In Progress" | "Completed"
  progress: number
  startDate: string
  estimatedCompletion: string
  auditor: string
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed":
      return "bg-accent text-accent-foreground"
    case "In Progress":
      return "bg-primary text-primary-foreground"
    case "Pending":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-secondary text-secondary-foreground"
  }
}

// helper เล็ก ๆ เอา status จาก DB มา map เป็น status ที่หน้า UI ใช้
const mapApiStatusToUi = (
  status: AuditRequestFromApi["status"]
): ProjectCard["status"] => {
  switch (status) {
    case "completed":
      return "Completed"
    case "in_review":
    case "scheduled":
      return "In Progress"
    case "pending":
    default:
      return "Pending"
  }
}

// helper คำนวณ progress แบบง่าย ๆ จากสถานะ
const getProgressFromStatus = (status: ProjectCard["status"]) => {
  switch (status) {
    case "Completed":
      return 100
    case "In Progress":
      return 50
    case "Pending":
    default:
      return 0
  }
}

// helper สร้างวันที่ประมาณการเสร็จ (start + 14 วัน)
const getEstimatedCompletion = (isoCreatedAt: string) => {
  const d = new Date(isoCreatedAt)
  if (Number.isNaN(d.getTime())) return "TBD"
  const estimate = new Date(d)
  estimate.setDate(estimate.getDate() + 14)
  return estimate.toISOString().slice(0, 10) // YYYY-MM-DD
}

export function ProjectsList() {
    const { isLoaded, isSignedIn, user } = useUser()

  const [projects, setProjects] = useState<ProjectCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
        if (!isLoaded) return

            // ยังไม่ล็อกอิน
    if (!isSignedIn || !user) {
      setProjects([])
      setLoading(false)
      setError("กรุณาเข้าสู่ระบบเพื่อดูโปรเจกต์ของคุณ")
      return
    }

    const fetchProjects = async () => {
      try {
        setLoading(true)
        setError(null)

                const customerId = user.id // 👈 ใช้อันนี้เทียบกับ customerId ใน DB
    // 1) ดึง "ทุก project" มาก่อน ไม่ใส่ query
    const res = await fetch(`/api/audit-requests`, {
      cache: "no-store",
    })

        // const res = await fetch(
        //   `/api/audit-requests?customerId=${encodeURIComponent(customerId)}`,
        //   { cache: "no-store" }
        // );

        if (!res.ok) {
          throw new Error("Failed to fetch audit requests");
        }

        const json = await res.json()
        const data: AuditRequestFromApi[] = json.data || []

            // 2) filter เฉพาะของ customer คนนี้ฝั่ง frontend
    const myProjects = data.filter(
      (item) => item.customerId === customerId
    )

    // 3) map เป็น ProjectCard ตามเดิม
    const mapped: ProjectCard[] = myProjects.map((item) => {
      const uiStatus = mapApiStatusToUi(item.status)
      const created = new Date(item.createdAt)

        // const mapped: ProjectCard[] = data.map((item) => {
        //   const uiStatus = mapApiStatusToUi(item.status)
        //   const created = new Date(item.createdAt)

          return {
            id: item._id,
            name: item.projectName,
            status: uiStatus,
            progress: getProgressFromStatus(uiStatus),
            startDate: Number.isNaN(created.getTime())
              ? "-"
              : created.toISOString().slice(0, 10),
            estimatedCompletion: getEstimatedCompletion(item.createdAt),
            // ตอนนี้ยังไม่มี field auditor ใน DB เลยใส่ค่า default ไว้ก่อน
            auditor: "AttestHub Team",
          }
        })

        setProjects(mapped)
      } catch (err) {
        console.error(err)
        setError("โหลดรายการโปรเจกต์ไม่สำเร็จ")
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [isLoaded, isSignedIn, user])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">
            My Audit Projects
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and track your security audits
          </p>
        </div>
        <Button className="gap-2" asChild>
          <Link href="/dashboard/customer/new-project">
            <Plus className="h-4 w-4" />
            Add New Project
          </Link>
        </Button>
      </div>

      {/* Loading / Error State */}
      {loading && (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            กำลังโหลดรายการโปรเจกต์...
          </p>
        </Card>
      )}

      {!loading && error && (
        <Card className="p-6">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      {/* ถ้ายังไม่มีโปรเจกต์ */}
      {!loading && !error && projects.length === 0 && (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            ยังไม่มีโปรเจกต์ที่คุณส่งคำขอ กรุณากดปุ่ม &quot;Add New Project&quot; เพื่อเริ่มต้น
          </p>
        </Card>
      )}

      {/* Stats (ใช้ข้อมูลจริงจาก projects state) */}
      {!loading && !error && projects.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Projects</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {projects.length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {projects.filter((p) => p.status === "In Progress").length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {projects.filter((p) => p.status === "Completed").length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <ExternalLink className="h-6 w-6 text-accent" />
                </div>
              </div>
            </Card>
          </div>

          {/* Projects List */}
          <div className="space-y-4">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="p-6 hover:bg-card/80 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-lg font-semibold text-foreground text-pretty">
                        {project.name}
                      </h3>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Started: {project.startDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Est. Completion: {project.estimatedCompletion}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Auditor: {project.auditor}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {project.progress > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium text-foreground">
                            {project.progress}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 lg:flex-col">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 lg:flex-none lg:w-full bg-transparent"
                    >
                      View Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 lg:flex-none lg:w-full"
                    >
                      Download Report
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
