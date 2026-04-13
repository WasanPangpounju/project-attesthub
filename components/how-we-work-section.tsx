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
    <section id="how-we-work" className="py-14 md:py-20" style={{ backgroundColor: "#FAFAF8" }}>
      <style>{`
        .how-we-work-steps {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 3.5rem;
          gap: 0;
        }
        .how-we-work-steps .step-card {
          width: 100%;
          max-width: 280px;
        }
        .step-connector {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1A7A6E;
          font-size: 24px;
          font-weight: bold;
        }
        .step-connector .arrow-h { display: none; }
        .step-connector .arrow-v { display: block; padding: 6px 0; }
        @media (min-width: 768px) {
          .how-we-work-steps {
            flex-direction: row;
            align-items: flex-start;
          }
          .how-we-work-steps .step-card {
            flex: 1;
            width: auto;
            max-width: none;
          }
          .step-connector {
            align-self: flex-start;
            margin-top: 32px;
            padding: 0 4px;
            flex-shrink: 0;
          }
          .step-connector .arrow-h { display: block; }
          .step-connector .arrow-v { display: none; }
        }
      `}</style>
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
          className="font-display font-semibold mx-auto max-w-2xl text-balance text-center text-3xl leading-tight md:text-4xl"
          style={{ color: "#1a2744" }}
        >
          {t.landing.howWeWorkTitle}
        </h2>

        {/* Steps */}
        <div className="how-we-work-steps">
          {steps.flatMap((step, index) => {
            const card = (
              <div key={`step-${index}`} className="step-card flex flex-col items-center text-center">
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
            )
            if (index < steps.length - 1) {
              return [
                card,
                <div key={`arrow-${index}`} className="step-connector" aria-hidden="true">
                  <span className="arrow-h">&#x2192;</span>
                  <span className="arrow-v">&#x2193;</span>
                </div>,
              ]
            }
            return [card]
          })}
        </div>
      </div>
    </section>
  )
}
