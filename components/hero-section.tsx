import { cookies } from "next/headers"
import Link from "next/link"
import { detectLocale, getTranslations } from "@/lib/i18n"

export async function HeroSection() {
  const cookieStore = await cookies()
  const locale = detectLocale(cookieStore.get("attesthub-locale")?.value)
  const t = getTranslations(locale)

  return (
    <section className="py-24 md:py-36" style={{ backgroundColor: "#ffffff", borderBottom: "0.5px solid #e2e8f0" }}>
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-[760px] text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide"
            style={{ backgroundColor: "#e8f5f3", color: "#0f7c6e" }}
          >
            {t.landing.heroBadge}
          </div>

          {/* H1 */}
          <h1
            className="font-display font-semibold text-balance leading-tight tracking-tight"
            style={{ fontSize: "clamp(40px, 5vw, 56px)", color: "#1a2744" }}
          >
            {t.landing.heroTitleMain}{" "}
            <em
              className="not-italic"
              style={{ color: "#0f7c6e", fontStyle: "italic" }}
            >
              {t.landing.heroTitleHighlight}
            </em>
          </h1>

          {/* Subtitle */}
          <p
            className="mt-6 text-pretty text-lg leading-relaxed"
            style={{ color: "#5a6478" }}
          >
            {t.hero.subtitle}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/free-scan"
              className="inline-flex items-center rounded-[14px] px-6 py-3 text-base font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              style={{ backgroundColor: "#0f7c6e" }}
            >
              {t.hero.ctaPrimary}
            </Link>
            <Link
              href="#services"
              className="inline-flex items-center rounded-[14px] px-6 py-3 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              style={{
                border: "1px solid #1a2744",
                color: "#1a2744",
                backgroundColor: "transparent",
              }}
            >
              {t.hero.ctaSecondary}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
