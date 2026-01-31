import { Button } from "@/components/ui/button"
import Link from "next/link"

export function CtaSection() {
  return (
    <section id="contact" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground shadow-xl md:px-12 md:py-20">
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Ready to Make Your Digital Experience Accessible?
          </h2>
          <p className="mt-6 text-pretty text-lg leading-relaxed opacity-90 md:text-xl">
            Let's work together to create an inclusive experience for all users. Get started with a free accessibility
            assessment today.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="mailto:contact@attesthub.com">Get a Free Assessment</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              asChild
            >
              <Link href="tel:+1234567890">Call Us Today</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
