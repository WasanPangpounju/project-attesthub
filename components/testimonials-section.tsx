import { Card, CardContent } from "@/components/ui/card"
import { Quote } from "lucide-react"

const testimonials = [
  {
    quote:
      "Attesthub transformed our website accessibility. Their thorough audit and clear recommendations helped us achieve WCAG 2.2 AA compliance within weeks.",
    author: "Sarah Johnson",
    role: "CTO, TechCorp Solutions",
  },
  {
    quote:
      "The real user testing was invaluable. We learned so much about how people with disabilities actually use our app. Highly recommended!",
    author: "Michael Chen",
    role: "Product Manager, AppVentures",
  },
  {
    quote:
      "Professional, knowledgeable, and genuinely committed to making the digital world more accessible. Working with Attesthub was a game-changer for us.",
    author: "Emily Rodriguez",
    role: "Director of UX, Design Studio Pro",
  },
]

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-muted/30 py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
            What Our Clients Say
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Trusted by companies committed to accessibility
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative">
              <CardContent className="flex flex-col gap-4 p-6">
                <Quote className="h-8 w-8 text-primary/20" aria-hidden="true" />
                <blockquote className="text-base leading-relaxed text-foreground">"{testimonial.quote}"</blockquote>
                <footer className="mt-4 border-t border-border pt-4">
                  <div className="font-semibold text-foreground">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </footer>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
