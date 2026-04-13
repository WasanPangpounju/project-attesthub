import { cookies } from "next/headers"
import { detectLocale, getTranslations } from "@/lib/i18n"

export async function TestimonialsSection() {
  const cookieStore = await cookies()
  const locale = detectLocale(cookieStore.get("attesthub-locale")?.value)
  const t = getTranslations(locale)

  const testimonials = [
    {
      quote: t.landing.testimonial1Quote,
      author: t.landing.testimonial1Author,
      role: t.landing.testimonial1Role,
      initials: "SJ",
    },
    {
      quote: t.landing.testimonial2Quote,
      author: t.landing.testimonial2Author,
      role: t.landing.testimonial2Role,
      initials: "MC",
    },
    {
      quote: t.landing.testimonial3Quote,
      author: t.landing.testimonial3Author,
      role: t.landing.testimonial3Role,
      initials: "ER",
    },
  ]

  return (
    <section id="testimonials" className="py-14 md:py-20" style={{ backgroundColor: "#FAFAF8" }}>
      <style>{`
        .speech-bubble {
          position: relative;
          background: #FFFFFF;
          border-radius: 16px;
          padding: 1.5rem;
          border: 1.5px solid #e2e8f0;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .speech-bubble::before {
          content: "";
          position: absolute;
          bottom: -14px;
          left: 10px;
          width: 0;
          height: 0;
          border-left: 14px solid transparent;
          border-right: 14px solid transparent;
          border-top: 14px solid #e2e8f0;
        }
        .speech-bubble::after {
          content: "";
          position: absolute;
          bottom: -12px;
          left: 10px;
          width: 0;
          height: 0;
          border-left: 12px solid transparent;
          border-right: 12px solid transparent;
          border-top: 12px solid #FFFFFF;
        }
      `}</style>
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
          {testimonials.map((testimonial, index) => (
            <div key={index} className="min-w-0">
              {/* Speech bubble */}
              <div className="speech-bubble">
                <blockquote className="text-sm italic leading-relaxed" style={{ color: "#5a6478" }}>
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
              </div>

              {/* Author row — below the bubble */}
              <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: "#0f7c6e" }}
                  aria-hidden="true"
                >
                  {testimonial.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: "#1a2744", fontSize: "0.875rem" }}>
                    {testimonial.author}
                  </div>
                  <div aria-label="5 out of 5 stars" style={{ color: "#F5C518", fontSize: "14px" }}>
                    ★★★★★
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
