'use client';

import { RoleGuard } from '@/components/role-guard';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProjectsList } from '@/components/projects-list';

export default function CustomerDashboard() {
  return (
    <RoleGuard allowedRoles={['customer']}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 lg:p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Customer Dashboard</h1>
              <p className="text-muted-foreground">Manage your audit requests and projects</p>
            </div>
            <ProjectsList />
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
