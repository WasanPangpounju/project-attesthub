import { cookies } from "next/headers"
import { Search, Brain, Users, FileText } from "lucide-react"
import { detectLocale, getTranslations } from "@/lib/i18n"

export async function HowWeWorkSection() {
  const cookieStore = await cookies()
  const locale = detectLocale(cookieStore.get("attesthub-locale")?.value)
  const t = getTranslations(locale)

  const steps = [
    {
      icon: Search,
      title: t.landing.step1Title,
      description: t.landing.step1Desc,
    },
    {
      icon: Brain,
      title: t.landing.step2Title,
      description: t.landing.step2Desc,
    },
    {
      icon: Users,
      title: t.landing.step3Title,
      description: t.landing.step3Desc,
    },
    {
      icon: FileText,
      title: t.landing.step4Title,
      description: t.landing.step4Desc,
    },
  ]

  return (
    <section id="how-we-work" className="py-20 md:py-28" style={{ backgroundColor: "#ffffff" }}>
      <div className="container mx-auto px-6">
        {/* Section label */}
        <div className="mb-4 text-center">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#0f7c6e" }}
          >
            {t.landing.howWeWorkLabel}
          </span>
        </div>

        {/* H2 */}
        <h2
          className="font-display mx-auto max-w-2xl text-balance text-center text-3xl leading-tight md:text-4xl"
          style={{ color: "#1a2744" }}
        >
          {t.landing.howWeWorkTitle}
        </h2>

        {/* Steps */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              {/* Step number + icon */}
              <div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: "#0f7c6e" }}
              >
                <step.icon className="h-7 w-7 text-white" aria-hidden="true" />
              </div>
              {/* Step number badge */}
              <div
                className="mb-3 text-xs font-bold uppercase tracking-widest"
                style={{ color: "#13a08e" }}
              >
                {String(index + 1).padStart(2, "0")}
              </div>
              <h3 className="mb-2 text-base font-semibold" style={{ color: "#1a2744" }}>
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#5a6478" }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
