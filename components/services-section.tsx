import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, Smartphone, Building2 } from "lucide-react"

const services = [
  {
    icon: Globe,
    title: "Web Accessibility Audits (WCAG 2.2)",
    description:
      "Comprehensive website evaluations against the latest WCAG 2.2 standards. We identify barriers and provide actionable recommendations to ensure your digital presence is accessible to all users.",
  },
  {
    icon: Smartphone,
    title: "Inclusive App Testing (Mobile & Web)",
    description:
      "Thorough testing of mobile and web applications with real users, including people with disabilities. We evaluate usability, navigation, and compatibility with assistive technologies.",
  },
  {
    icon: Building2,
    title: "Universal Design for Physical Spaces",
    description:
      "On-site assessments of physical environments to ensure they meet accessibility standards. From offices to retail spaces, we help create welcoming environments for everyone.",
  },
]

export function ServicesSection() {
  return (
    <section id="services" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
            Our Services
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Comprehensive accessibility solutions tailored to your needs
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <Card key={index} className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <service.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <CardTitle className="text-xl">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">{service.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
