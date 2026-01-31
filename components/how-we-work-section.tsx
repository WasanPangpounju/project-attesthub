import { Card, CardContent } from "@/components/ui/card"
import { Bot, Sparkles, Users, FileCheck } from "lucide-react"
import { ArrowRight } from "lucide-react"

const steps = [
  {
    icon: Bot,
    title: "Automated Tools",
    description: "Initial scan using industry-leading accessibility testing tools",
  },
  {
    icon: Sparkles,
    title: "AI Analysis",
    description: "Advanced AI-powered analysis to identify complex accessibility issues",
  },
  {
    icon: Users,
    title: "Real User Testing",
    description: "Testing with disabled and elderly users for authentic feedback",
  },
  {
    icon: FileCheck,
    title: "Expert Review",
    description: "Comprehensive report with actionable recommendations",
  },
]

export function HowWeWorkSection() {
  return (
    <section id="how-we-work" className="bg-muted/30 py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
            How We Work
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Our proven methodology combines technology with human expertise
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <Card className="h-full">
                <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <step.icon className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Arrow connector for desktop */}
              {index < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 lg:block" aria-hidden="true">
                  <ArrowRight className="h-6 w-6 text-primary" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
