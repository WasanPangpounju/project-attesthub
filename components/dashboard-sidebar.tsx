"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Menu, X, Shield, LogOut, UserCircle,
  FolderOpen, FileBarChart, FileText, ClipboardList, LayoutDashboard, Users,
} from "lucide-react"
import { UserButton, useUser, SignOutButton } from "@clerk/nextjs"
import { useTranslation } from "@/lib/i18n/useTranslation"

type NavItem = {
  title: string
  href: string
  icon: React.ElementType
  badge?: number
}

export function DashboardSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useUser()
  const [role, setRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [pendingProfileCount, setPendingProfileCount] = useState(0)
  const { t } = useTranslation()
  const s = t.dashboard

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const fetchedRole = json?.data?.role ?? null
        setRole(fetchedRole)
        if (fetchedRole === "admin") {
          fetch("/api/admin/profile-change-requests?status=pending")
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => setPendingProfileCount(j?.data?.length ?? 0))
            .catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => setRoleLoading(false))
  }, [])

  const navItems: NavItem[] = (() => {
    if (role === "customer") return [
      { title: s.nav.myProjects, href: "/dashboard/customer", icon: FolderOpen },
      { title: s.nav.newAuditRequest, href: "/dashboard/customer/new-project", icon: FileText },
      { title: s.nav.myReports, href: "/dashboard/reports", icon: FileBarChart },
      { title: s.nav.myProfile, href: "/dashboard/profile", icon: UserCircle },
    ]
    if (role === "tester") return [
      { title: s.nav.myTasks, href: "/dashboard/tester", icon: ClipboardList },
      { title: s.nav.aiReports, href: "/dashboard/reports", icon: FileBarChart },
      { title: s.nav.myProfile, href: "/dashboard/profile", icon: UserCircle },
    ]
    if (role === "admin") return [
      { title: s.nav.dashboard, href: "/dashboard/admin", icon: LayoutDashboard },
      { title: s.nav.users, href: "/dashboard/admin/users", icon: Users, badge: pendingProfileCount },
      { title: s.nav.aiAuditReports, href: "/dashboard/reports", icon: FileBarChart },
      { title: s.nav.myProfile, href: "/dashboard/profile", icon: UserCircle },
    ]
    return []
  })()

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 min-h-full w-64 bg-card border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 p-6 border-b border-border">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground">Attesthub</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {roleLoading ? (
              <>
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </>
            ) : (
              navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-accent"
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{item.title}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span className="ml-auto h-5 w-5 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </Button>
                  </Link>
                )
              })
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-3">
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{ elements: { userButtonAvatarBox: "h-9 w-9" } }}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground leading-none">
                    {user?.firstName || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate w-24">
                    {user?.primaryEmailAddress?.emailAddress}
                  </span>
                </div>
              </div>
            </div>

            <SignOutButton>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                {s.signOut}
              </Button>
            </SignOutButton>

            <p className="text-[10px] text-muted-foreground text-center mt-4 uppercase tracking-wider font-semibold">
              © 2026 Attesthub
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
