import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <span className="text-xl font-bold text-foreground">Attesthub</span>
        </Link>

        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-6">
            <li>
              <Link
                href="#services"
                className="text-sm font-medium text-foreground/80 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring transition-colors"
              >
                Services
              </Link>
            </li>
            <li>
              <Link
                href="#how-we-work"
                className="text-sm font-medium text-foreground/80 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring transition-colors"
              >
                How We Work
              </Link>
            </li>
            <li>
              <Link
                href="#testimonials"
                className="text-sm font-medium text-foreground/80 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring transition-colors"
              >
                Testimonials
              </Link>
            </li>
                        <li>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-foreground/80 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring transition-colors"
              >
                Sign-in
              </Link>
            </li>
            <li>
              <Link
                href="/sign-up"
                className="text-sm font-medium text-foreground/80 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring transition-colors"
              >
                Sign-up
              </Link>
            </li>
            <li>
              <Button size="sm" asChild>
                <Link href="#contact">Get Started</Link>
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
