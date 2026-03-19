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
      className="sticky top-0 z-50 w-full bg-white"
      style={{ borderBottom: "0.5px solid #e2e8f0" }}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <ShieldCheck className="h-6 w-6" style={{ color: "#0f7c6e" }} aria-hidden="true" />
          <span className="text-lg font-bold" style={{ color: "#1a2744" }}>
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
                style={{ color: "#5a6478" }}
              >
                {t.nav.features}
              </Link>
            </li>
            <li>
              <Link
                href="#how-we-work"
                className="text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                style={{ color: "#5a6478" }}
              >
                {t.nav.about}
              </Link>
            </li>
            <li>
              <Link
                href="#testimonials"
                className="text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                style={{ color: "#5a6478" }}
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
            style={{ color: "#5a6478" }}
          >
            {t.nav.login}
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center rounded-[14px] px-4 py-2 text-sm font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            style={{ backgroundColor: "#0f7c6e" }}
          >
            {t.nav.getStarted}
          </Link>
        </div>
      </div>
    </header>
  )
}
