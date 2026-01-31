"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { CheckSquare, ClipboardList, FileText, LogOut, Menu, Settings, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  testerName: string
}

export function DashboardLayout({ children, testerName }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const navigationItems = [
    {
      name: "Available Tasks",
      href: "/tasks",
      icon: ClipboardList,
      current: true,
    },
    {
      name: "My Active Tests",
      href: "/active",
      icon: CheckSquare,
      current: false,
    },
    {
      name: "Submission History",
      href: "/history",
      icon: FileText,
      current: false,
    },
    {
      name: "Accessibility Settings",
      href: "/settings",
      icon: Settings,
      current: false,
    },
  ]

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-full flex-col">
          {/* Logo/Brand */}
          <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
                <span className="text-xl font-bold text-sidebar-primary-foreground">A</span>
              </div>
              <span className="text-xl font-bold text-sidebar-foreground">AttestHub</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation menu"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6" aria-label="Primary">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-4 rounded-lg px-4 py-4 text-base font-medium transition-colors min-h-[3.5rem]",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring",
                    item.current
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                  aria-current={item.current ? "page" : undefined}
                >
                  <Icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
                  <span>{item.name}</span>
                </a>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border px-4 py-6">
            <p className="mb-2 px-4 text-sm font-medium text-sidebar-foreground">Help & Support</p>
            <a
              href="/help"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent min-h-[3rem]"
            >
              Documentation
            </a>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-card px-6 lg:px-8">
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden min-h-[2.75rem] min-w-[2.75rem] bg-transparent"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex flex-1 items-center justify-end gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">Signed in as</p>
              <p className="text-lg font-semibold text-foreground">{testerName}</p>
            </div>
            <Button variant="destructive" className="min-h-[2.75rem] gap-2 px-6" aria-label="Sign out of your account">
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}
