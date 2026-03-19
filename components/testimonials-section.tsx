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
    <section id="testimonials" className="py-14 md:py-20" style={{ backgroundColor: "#ffffff" }}>
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
            <div
              key={index}
              className="flex min-w-0 flex-col rounded-[14px] bg-white p-8"
              style={{ border: "0.5px solid #e2e8f0" }}
            >
              {/* Stars */}
              <div className="mb-4 flex gap-0.5" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} aria-hidden="true" style={{ color: "#c9932a", fontSize: "16px" }}>
                    ★
                  </span>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="flex-1 text-sm italic leading-relaxed" style={{ color: "#5a6478" }}>
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="mt-6 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: "#0f7c6e" }}
                  aria-hidden="true"
                >
                  {testimonial.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#1a2744" }}>
                    {testimonial.author}
                  </div>
                  <div className="text-xs" style={{ color: "#5a6478" }}>
                    {testimonial.role}
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
