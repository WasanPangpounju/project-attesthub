"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FolderOpen, FileText, Menu, X, Shield, LogOut } from "lucide-react"
// 1. Import Clerk Components
import { UserButton, useUser, SignOutButton } from "@clerk/nextjs"
import { Users } from "lucide-react"

const navItems = [
  {
    title: "My Projects",
    href: "/projects",
    icon: FolderOpen,
  },
  {
    title: "New Audit Request",
    href: "/new-audit",
    icon: FileText,
  },
  // ลบ Profile ออกจากรายการด้านบน เพราะจะเอาไปไว้ด้านล่างแทน
]

const adminNavItems = [
  {
    title: "Users",
    href: "/dashboard/admin/users",
    icon: Users,
  },
]

export function DashboardSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  // 2. ดึงข้อมูล User มาแสดงผล
  const { user } = useUser();

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
          "fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static",
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
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <Icon className="h-5 w-5" />
                    {item.title}
                  </Button>
                </Link>
              )
            })}

            {/* Admin section */}
            <div className="pt-2">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Admin
              </p>
              {adminNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-accent"
                    >
                      <Icon className="h-5 w-5" />
                      {item.title}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* 3. Footer: User Profile & Sign Out Section */}
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-3">
                {/* ปุ่มจัดการ Profile ของ Clerk */}
                <UserButton 
                  afterSignOutUrl="/" 
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "h-9 w-9"
                    }
                  }}
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

            {/* ปุ่ม Logout แบบแยกออกมาให้เห็นชัดๆ */}
            <SignOutButton>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                Sign out
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