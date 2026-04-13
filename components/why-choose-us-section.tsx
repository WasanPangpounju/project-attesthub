import { cookies } from "next/headers"
import { detectLocale, getTranslations } from "@/lib/i18n"

export async function WhyChooseUsSection() {
  const cookieStore = await cookies()
  const locale = detectLocale(cookieStore.get("attesthub-locale")?.value)
  const t = getTranslations(locale)

  const benefits = [
    {
      number: "01",
      title: t.landing.benefit1Title,
      description: t.landing.benefit1Desc,
    },
    {
      number: "02",
      title: t.landing.benefit2Title,
      description: t.landing.benefit2Desc,
    },
    {
      number: "03",
      title: t.landing.benefit3Title,
      description: t.landing.benefit3Desc,
    },
  ]

  return (
    <section className="py-14 md:py-20" style={{ backgroundColor: "#f0f8f5" }}>
      <div className="container mx-auto px-6">
        {/* Section label */}
        <div className="mb-4 text-center">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#0f7c6e" }}
          >
            {t.landing.whyChooseLabel}
          </span>
        </div>

        {/* H2 */}
        <h2
          className="font-display font-semibold mx-auto max-w-2xl text-balance text-center text-3xl leading-tight md:text-4xl"
          style={{ color: "#1a2744" }}
        >
          {t.landing.whyChooseTitle}
        </h2>

        {/* Cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {benefits.map((benefit) => (
            <div
              key={benefit.number}
              className="rounded-[14px] p-8 transition-shadow hover:shadow-md"
              style={{ backgroundColor: "#FAFAF8", border: "0.5px solid #e2e8f0" }}
            >
              <div
                className="font-display mb-4 text-5xl font-semibold leading-none"
                style={{ color: "#0f7c6e", background: '#FEF9C3', display: 'inline-block', padding:'6px',borderRadius: '25%' }}
              >
                {benefit.number}
              </div>
              <h3 className="mb-3 text-base font-semibold" style={{ color: "#1a2744" }}>
                {benefit.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#5a6478" }}>
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
