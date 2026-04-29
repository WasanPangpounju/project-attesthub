import Link from "next/link"
import { cookies } from "next/headers"
import { ShieldCheck } from "lucide-react"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { detectLocale, getTranslations } from "@/lib/i18n"

export async function Header() {
  const cookieStore = await cookies()
  const locale = detectLocale(cookieStore.get("attesthub-locale")?.value)
  const t = getTranslations(locale)

  return (
    <header
      className="sticky top-0 z-50 w-full "
      style={{  background: "#0f7c6e" }}
    >
      <div className="flex h-16 w-full items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <ShieldCheck className="h-6 w-6" style={{ color: "#ffffff" }} aria-hidden="true" />
          <span className="text-lg font-bold" style={{ color: "#ffffff" }}>
            Attesthub
          </span>
        </Link>

        {/* Nav */}
        <nav aria-label="Main navigation" className="min-w-0 overflow-hidden">
          <ul className="flex items-center gap-8 whitespace-nowrap">
            <li>
              <Link
                href="#services"
                className="text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                style={{ color: "rgba(255,255,255,0.95)" }}
              >
                {t.nav.features}
              </Link>
            </li>
            <li>
              <Link
                href="#how-we-work"
                className="text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                style={{ color: "rgba(255,255,255,0.95)" }}
              >
                {t.nav.about}
              </Link>
            </li>
            <li>
              <Link
                href="#testimonials"
                className="text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                style={{ color: "rgba(255,255,255,0.95)" }}
              >
                {t.nav.pricing}
              </Link>
            </li>
          </ul>
        </nav>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-3">
          <LanguageSwitcher variant="minimal" />
          <Link
            href="/sign-in"
            className="text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            style={{ color: "rgba(255,255,255,0.95)" }}
          >
            {t.nav.login}
          </Link>
          <Link
            href="/sign-up?intro=true"
            className="inline-flex items-center rounded-[14px] px-4 py-2 text-sm font-semibold  transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            style={{ backgroundColor: "#fafafa", border: "1px solid #eaeaea", color: "#1a2744" }}
          >
            {t.nav.getStarted}
          </Link>
        </div>
      </div>
    </header>
  )
}
