import { cookies } from "next/headers"
import Link from "next/link"
import { ShieldCheck, Facebook, Twitter, Linkedin, Mail } from "lucide-react"
import { detectLocale, getTranslations } from "@/lib/i18n"

export async function Footer() {
  const cookieStore = await cookies()
  const locale = detectLocale(cookieStore.get("attesthub-locale")?.value)
  const t = getTranslations(locale)

  return (
    <footer style={{ backgroundColor: "#0a2e28" }}>
      <div className="container mx-auto px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:[grid-template-columns:2fr_1fr_1fr_1fr]">

          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" style={{ color: "#13a08e" }} aria-hidden="true" />
              <span className="text-base font-bold text-white">Attesthub</span>
            </div>
            <p className="leading-relaxed" style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
              {t.landing.footerTagline}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold uppercase tracking-widest text-white" style={{ fontSize: "14px" }}>
              {t.landing.footerQuickLinks}
            </h3>
            <nav aria-label="Footer quick links">
              <ul className="space-y-2">
                <li>
                  <Link
                    href="#services"
                    className="transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
                    style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)" }}
                  >
                    {t.landing.footerServices}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#how-we-work"
                    className="transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
                    style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)" }}
                  >
                    {t.landing.footerHowWeWork}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#testimonials"
                    className="transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
                    style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)" }}
                  >
                    {t.landing.footerTestimonials}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold uppercase tracking-widest text-white" style={{ fontSize: "14px" }}>
              {t.landing.footerLegal}
            </h3>
            <nav aria-label="Legal navigation">
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/about"
                    className="transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
                    style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)" }}
                  >
                    {t.landing.footerAbout}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
                    style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)" }}
                  >
                    {t.landing.footerContact}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
                    style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)" }}
                  >
                    {t.landing.footerPrivacy}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Connect */}
          <div className="space-y-4">
            <h3 className="font-semibold uppercase tracking-widest text-white" style={{ fontSize: "14px" }}>
              {t.landing.footerConnect}
            </h3>
            <div className="flex gap-3">
              <Link
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ border: "0.5px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.55)" }}
                aria-label="Visit our Facebook page"
              >
                <Facebook className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ border: "0.5px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.55)" }}
                aria-label="Visit our Twitter/X page"
              >
                <Twitter className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ border: "0.5px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.55)" }}
                aria-label="Visit our LinkedIn page"
              >
                <Linkedin className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="mailto:contact@attesthub.com"
                className="flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ border: "0.5px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.55)" }}
                aria-label="Send us an email"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-8 text-center"
          style={{ fontSize: "12px", borderTop: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
        >
          {t.landing.footerCopyright}
        </div>
      </div>
    </footer>
  )
}
