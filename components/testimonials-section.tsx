import { cookies } from "next/headers"
import { detectLocale, getTranslations } from "@/lib/i18n"

export async function TestimonialsSection() {
  const cookieStore = await cookies()
  const locale = detectLocale(cookieStore.get("attesthub-locale")?.value)
  const t = getTranslations(locale)

  const stats = [
    { value: t.landing.stat1Value, desc: t.landing.stat1Desc },
    { value: t.landing.stat2Value, desc: t.landing.stat2Desc },
    { value: t.landing.stat3Value, desc: t.landing.stat3Desc },
  ]

  return (
    <section id="testimonials" className="py-14 md:py-20" style={{ backgroundColor: "#FAFAF8" }}>
      <div className="container mx-auto px-6">
        {/* Section label */}
        <div className="mb-4 text-center">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#0f7c6e" }}
          >
            {t.landing.testimonialsLabel}
          </span>
        </div>

        {/* H2 */}
        <h2
          className="font-display font-semibold mx-auto max-w-2xl text-balance text-center text-3xl leading-tight md:text-4xl"
          style={{ color: "#1a2744" }}
        >
          {t.landing.testimonialsTitle}
        </h2>

        {/* Cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="rounded-2xl text-center"
              style={{
                background: "#FFFFFF",
                border: "1.5px solid #e2e8f0",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                padding: "2rem 1.5rem",
              }}
            >
              <div
                className="font-display font-bold"
                style={{ color: "#0f7c6e", fontSize: "2.5rem", lineHeight: 1 }}
              >
                {stat.value}
              </div>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "#5a6478" }}>
                {stat.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Survey note */}
        <p className="mt-8 text-center text-xs" style={{ color: "#9aa3b2" }}>
          {t.landing.testimonialsNote}
        </p>
      </div>
    </section>
  )
}
