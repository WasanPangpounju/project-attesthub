"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { locales, defaultLocale, LOCALE_COOKIE, type Locale } from "./config"
import { getTranslations } from "./index"

function readLocaleCookie(): Locale {
  if (typeof document === "undefined") return defaultLocale
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
  const value = match?.split("=")?.[1]
  if (value && locales.includes(value as Locale)) {
    return value as Locale
  }
  return defaultLocale
}

export function useTranslation() {
  const router = useRouter()
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  useEffect(() => {
    setLocaleState(readLocaleCookie())
  }, [])

  const t = getTranslations(locale)

  async function setLocale(newLocale: Locale) {
    // 1. Set cookie (365 days)
    const maxAge = 60 * 60 * 24 * 365
    document.cookie = `${LOCALE_COOKIE}=${newLocale}; max-age=${maxAge}; path=/`

    // 2. If user is logged in → PATCH /api/profile
    try {
      const profileRes = await fetch("/api/profile")
      if (profileRes.ok) {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferredLanguage: newLocale }),
        })
      }
    } catch {
      // Not logged in or network error — cookie-only is fine
    }

    // 3. Trigger re-render + refresh Server Components
    setLocaleState(newLocale)
    router.refresh()
  }

  return { t, locale, setLocale }
}
