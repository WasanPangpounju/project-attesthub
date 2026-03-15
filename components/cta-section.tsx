import { cookies } from "next/headers"
import Link from "next/link"
import { detectLocale, getTranslations } from "@/lib/i18n"

export async function CtaSection() {
  const cookieStore = await cookies()
  const locale = detectLocale(cookieStore.get("attesthub-locale")?.value)
  const t = getTranslations(locale)

  return (
    <section id="contact" className="py-20 md:py-28" style={{ backgroundColor: "#f9fafb" }}>
      <div className="container mx-auto px-6">
        <div
          className="mx-auto max-w-3xl px-8 py-16 text-center md:px-16 md:py-20"
          style={{ backgroundColor: "#1a2744", borderRadius: "18px" }}
        >
          <h2
            className="font-display text-balance text-3xl leading-tight text-white md:text-4xl"
          >
            {t.landing.ctaTitle}
          </h2>
          <p
            className="mt-6 text-pretty text-lg leading-relaxed"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {t.landing.ctaSubtext}
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="mailto:contact@attesthub.com"
              className="inline-flex items-center rounded-[14px] px-6 py-3 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
              style={{ backgroundColor: "#ffffff", color: "#1a2744" }}
            >
              {t.landing.ctaButton1}
            </Link>
            <Link
              href="tel:+1234567890"
              className="inline-flex items-center rounded-[14px] px-6 py-3 text-base font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
              style={{ border: "1px solid rgba(255,255,255,0.5)" }}
            >
              {t.landing.ctaButton2}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
