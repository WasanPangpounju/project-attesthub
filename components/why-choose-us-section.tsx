import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Award, Heart, HeadphonesIcon } from "lucide-react"

const benefits = [
  {
    icon: Award,
    title: "Industry Expertise",
    description:
      "Our team consists of certified accessibility specialists with years of experience in WCAG compliance, ADA standards, and inclusive design principles.",
  },
  {
    icon: Heart,
    title: "User-Centric Approach",
    description:
      "We work directly with people with disabilities and elderly users to ensure our audits reflect real-world experiences and needs.",
  },
  {
    icon: HeadphonesIcon,
    title: "Continuous Support",
    description:
      "Beyond the audit, we provide ongoing support and guidance to help you maintain and improve accessibility over time.",
  },
]

export function WhyChooseUsSection() {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
            Why Choose Us
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Trusted by organizations worldwide for accessibility excellence
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border-2 transition-all hover:border-primary hover:shadow-lg">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <benefit.icon className="h-8 w-8" aria-hidden="true" />
                </div>
                <CardTitle className="text-xl">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-base leading-relaxed text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
