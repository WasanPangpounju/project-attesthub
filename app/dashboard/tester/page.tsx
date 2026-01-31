"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { CurrentTaskCard } from "@/components/current-task-card"
import { NewTasksList } from "@/components/new-tasks-list"
import { Button } from "@/components/ui/button"

type Lang = "en" | "th"
const LANG_STORAGE_KEY = "attesthub_lang"

const dict = {
  en: {
    skip: "Skip to main content",
    title: "Tester Dashboard",
    subtitle: "Manage your accessibility testing tasks and submissions",
    currentTask: "Current Task",
    newTasks: "New Tasks Available",
    langLabel: "Language",
    langEn: "English",
    langTh: "ไทย",
  },
  th: {
    skip: "ข้ามไปยังเนื้อหาหลัก",
    title: "แดชบอร์ดผู้ทดสอบ",
    subtitle: "จัดการงานทดสอบการเข้าถึงและการส่งผลงานของคุณ",
    currentTask: "งานปัจจุบัน",
    newTasks: "งานใหม่ที่พร้อมให้รับ",
    langLabel: "ภาษา",
    langEn: "English",
    langTh: "ไทย",
  },
} satisfies Record<Lang, Record<string, string>>

function isLang(v: unknown): v is Lang {
  return v === "en" || v === "th"
}

export default function DashboardPage() {
  const [lang, setLang] = useState<Lang>("en")

  // ✅ โหลดค่าภาษาที่เคยเลือกไว้จาก localStorage ตอนเปิดหน้า
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY)
      if (isLang(saved)) setLang(saved)
    } catch {
      // ignore (เช่น browser block storage)
    }
  }, [])

  // ✅ บันทึกค่าลง localStorage ทุกครั้งที่เปลี่ยนภาษา
  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang)
    } catch {
      // ignore
    }
  }, [lang])

  const t = useMemo(() => dict[lang], [lang])

  // Mock data - in real app, fetch from API
  const testerName = "Alex Johnson"

  const currentTask = {
    id: "task-001",
    website: "EcoCommerce Shop",
    url: "https://ecocommerce-demo.vercel.app",
    taskType: "Web",
    description:
      lang === "th"
        ? "ทดสอบขั้นตอนชำระเงิน (checkout) และการเข้าถึงของการจ่ายเงิน"
        : "Test checkout flow and payment accessibility",
    deadline: "2026-01-08",
  }

  const newTasks = [
    {
      id: "task-002",
      name: "HealthTracker Mobile App",
      type: "App",
      deadline: "2026-01-10",
      reward: "$85",
      description:
        lang === "th"
          ? "ทดสอบเมนูนำทางและการทำงานกับ screen reader"
          : "Test navigation and screen reader compatibility",
      priority: "high",
    },
    {
      id: "task-003",
      name: "BudgetPlanner Dashboard",
      type: "Web",
      deadline: "2026-01-12",
      reward: "$65",
      description:
        lang === "th"
          ? "ประเมินการใช้งานคีย์บอร์ดและคอนโทรลของฟอร์ม"
          : "Evaluate keyboard navigation and form controls",
      priority: "medium",
    },
    {
      id: "task-004",
      name: "FitnessCoach App",
      type: "App",
      deadline: "2026-01-15",
      reward: "$90",
      description:
        lang === "th"
          ? "ทดสอบคอนโทรลเครื่องเล่นวิดีโอและคำบรรยาย (captions)"
          : "Test video player controls and captions",
      priority: "medium",
    },
    {
      id: "task-005",
      name: "RecipeHub Website",
      type: "Web",
      deadline: "2026-01-18",
      reward: "$55",
      description:
        lang === "th"
          ? "ตรวจคอนทราสต์สีและความอ่านง่าย"
          : "Review color contrast and readability",
      priority: "low",
    },
  ]

  return (
    <DashboardLayout testerName={testerName}>
      <a href="#main-content" className="skip-to-main">
        {t.skip}
      </a>

      <main id="main-content" className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Page Header */}
          <div className="space-y-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
                  {t.title}
                </h1>
                <p className="text-lg text-muted-foreground">{t.subtitle}</p>
              </div>

              {/* Language Toggle */}
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
          </div>

          {/* Current Task Section */}
          <section aria-labelledby="current-task-heading">
            <h2 id="current-task-heading" className="mb-4 text-2xl font-semibold text-foreground">
              {t.currentTask}
            </h2>
            <CurrentTaskCard task={currentTask} />
          </section>

          {/* New Tasks Section */}
          <section aria-labelledby="new-tasks-heading">
            <h2 id="new-tasks-heading" className="mb-4 text-2xl font-semibold text-foreground">
              {t.newTasks}
            </h2>
            <NewTasksList tasks={newTasks} />
          </section>
        </div>
      </main>
    </DashboardLayout>
  )
}
