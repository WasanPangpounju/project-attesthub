import { cookies } from "next/headers"
import { Monitor, Smartphone, Home } from "lucide-react"
import { detectLocale, getTranslations } from "@/lib/i18n"

export async function ServicesSection() {
  const cookieStore = await cookies()
  const locale = detectLocale(cookieStore.get("attesthub-locale")?.value)
  const t = getTranslations(locale)

  const services = [
    {
      icon: Monitor,
      title: t.landing.service1Title,
      description: t.landing.service1Desc,
    },
    {
      icon: Smartphone,
      title: t.landing.service2Title,
      description: t.landing.service2Desc,
    },
    {
      icon: Home,
      title: t.landing.service3Title,
      description: t.landing.service3Desc,
    },
  ]

  return (
    <section id="services" className="py-20 md:py-28" style={{ backgroundColor: "#f9fafb" }}>
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
          className="font-display mx-auto max-w-2xl text-balance text-center text-3xl leading-tight md:text-4xl"
          style={{ color: "#1a2744" }}
        >
          {t.landing.servicesTitle}
        </h2>

        {/* Cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <div
              key={index}
              className="group rounded-[14px] bg-white p-8 transition-shadow hover:shadow-md"
              style={{ border: "0.5px solid #e2e8f0" }}
            >
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: "#e8f5f3" }}
              >
                <service.icon className="h-6 w-6" style={{ color: "#0f7c6e" }} aria-hidden="true" />
              </div>
              <h3 className="mb-3 text-base font-semibold" style={{ color: "#1a2744" }}>
                {service.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#5a6478" }}>
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
