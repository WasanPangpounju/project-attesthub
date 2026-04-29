"use client"

import Link from "next/link"
import { Bell, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser, SignOutButton } from "@clerk/nextjs"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useTranslation } from "@/lib/i18n/useTranslation"

export function DashboardHeader() {
  const { user } = useUser()
  const { t } = useTranslation()

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User"
  const email = user?.primaryEmailAddress?.emailAddress ?? ""
  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.firstName?.[0]?.toUpperCase() ?? "?"

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-6 py-5 lg:px-8">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder={t.dashboard.searchPlaceholder} className="pl-10 bg-background" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="minimal" className="bg-[#2E4A6B] hover:bg-[#3D6189]"/>

          <Button variant="ghost" size="icon" className="group relative hover:bg-[#3D6189]">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary group-hover:bg-white" />
          </Button>

          <div className="flex items-center gap-3 ml-4 pl-4 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity"
                  aria-label="User menu"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    {t.dashboard.myProfile}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <SignOutButton>
                  <DropdownMenuItem className="text-red-500 focus:text-red-600 cursor-pointer">
                    {t.dashboard.signOut}
                  </DropdownMenuItem>
                </SignOutButton>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
