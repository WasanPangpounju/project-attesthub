"use client"
import { AuditRequestForm } from "@/components/audit-request-form"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { useTranslation } from "@/lib/i18n/useTranslation"

export default function Page() {
  const { t } = useTranslation()

  return (
    <main className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        <div className="mx-4">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
              {t.customer.newProject.title}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground text-pretty">
              {t.customer.newProject.subtitle}
            </p>
          </div>
          <AuditRequestForm />
        </div>
      </div>
    </main>
  )
}
