"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslation } from "@/lib/i18n/useTranslation"
import type { Locale } from "@/lib/i18n/config"

interface Props {
  variant?: "minimal" | "full"
}

export function LanguageSwitcher({ variant = "minimal" }: Props) {
  const { locale, setLocale } = useTranslation()
  const [loading, setLoading] = useState(false)

  async function handleChange(newLocale: Locale) {
    if (newLocale === locale || loading) return
    setLoading(true)
    await setLocale(newLocale)
    setLoading(false)
  }

  if (variant === "minimal") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleChange(locale === "en" ? "th" : "en")}
        disabled={loading}
        className="gap-1 text-sm font-medium"
        style={{ color: "rgba(255,255,255,0.85)" }}
        aria-label="Switch language"
      >
        {loading ? "..." : locale === "en" ? "🇹🇭 TH" : "🇬🇧 EN"}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={loading} className="gap-1.5">
          {loading ? "..." : locale === "en" ? "🇬🇧 EN" : "🇹🇭 TH"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleChange("en")} className="gap-2 cursor-pointer">
          🇬🇧 English
          {locale === "en" && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleChange("th")} className="gap-2 cursor-pointer">
          🇹🇭 ภาษาไทย
          {locale === "th" && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
