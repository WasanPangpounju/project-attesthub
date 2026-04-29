'use client'

import { RoleGuard } from '@/components/role-guard'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardHeader } from '@/components/dashboard-header'
import { ProjectsList } from '@/components/projects-list'
import { useTranslation } from '@/lib/i18n/useTranslation'

export default function CustomerDashboard() {
  const { t } = useTranslation()

  return (
    <RoleGuard allowedRoles={['customer']}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 lg:p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">{t.customer.dashboard.title}</h1>
              <p className="text-muted-foreground">{t.customer.dashboard.subtitle}</p>
            </div>
            <ProjectsList />
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
