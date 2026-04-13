import { cookies } from "next/headers"
import { detectLocale, getTranslations } from "@/lib/i18n"
import { ServiceCards } from "@/components/ServiceCards"

export async function ServicesSection() {
  const cookieStore = await cookies()
  const locale = detectLocale(cookieStore.get("attesthub-locale")?.value)
  const t = getTranslations(locale)

  const services = [
    {
      icon: "Monitor",
      title: t.landing.service1Title,
      description: t.landing.service1Desc,
    },
    {
      icon: "Smartphone",
      title: t.landing.service2Title,
      description: t.landing.service2Desc,
    },
    {
      icon: "Home",
      title: t.landing.service3Title,
      description: t.landing.service3Desc,
    },
  ]

  return (
    <section id="services" className="py-10" style={{ backgroundColor: "#f0f8f5", padding: "2.5rem" }}>
      <div className="container mx-auto px-6">
        {/* Section label */}
        <div className="mb-4 text-center">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#0f7c6e" }}
          >
            {t.landing.servicesLabel}
          </span>
        </div>

        {/* H2 */}
        <h2
          className="font-display font-semibold mx-auto max-w-2xl text-balance text-center text-3xl leading-tight md:text-4xl"
          style={{ color: "#1a2744" }}
        >
          {t.landing.servicesTitle}
        </h2>

        {/* Cards */}
        <ServiceCards services={services} />
      </div>
    </section>
  )
}
