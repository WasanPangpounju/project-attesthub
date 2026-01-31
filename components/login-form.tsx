"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [userRole, setUserRole] = useState<"customer" | "tester">("customer")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    // Add your authentication logic here
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email")
    const password = formData.get("password")

    console.log("[v0] Login attempt:", { email, userRole })

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
    }, 1500)
  }

  return (
    <Card className="shadow-2xl border-border/50">
      <CardHeader className="space-y-3 pb-6">
        <div className="flex items-center justify-center mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-foreground">AttestHub</h1>
          </div>
        </div>
        <CardTitle className="text-2xl font-semibold text-center text-balance">Welcome back</CardTitle>
        <CardDescription className="text-center text-pretty">Sign in to your account to continue</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs
          value={userRole}
          onValueChange={(value) => setUserRole(value as "customer" | "tester")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2" role="tablist" aria-label="Select user role">
            <TabsTrigger
              value="customer"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              role="tab"
              aria-selected={userRole === "customer"}
            >
              Customer
            </TabsTrigger>
            <TabsTrigger
              value="tester"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              role="tab"
              aria-selected={userRole === "tester"}
            >
              Tester
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer-email" className="text-sm font-medium">
                  Email address
                </Label>
                <Input
                  id="customer-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="h-11"
                  aria-required="true"
                  aria-describedby="email-description"
                />
                <span id="email-description" className="sr-only">
                  Enter your email address to sign in
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="customer-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="h-11 pr-10"
                    aria-required="true"
                    aria-describedby="password-description"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </Button>
                  <span id="password-description" className="sr-only">
                    Enter your password to sign in
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <a
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                >
                  Forgot password?
                </a>
              </div>

              <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading} aria-busy={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="tester" className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tester-email" className="text-sm font-medium">
                  Email address
                </Label>
                <Input
                  id="tester-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="h-11"
                  aria-required="true"
                  aria-describedby="tester-email-description"
                />
                <span id="tester-email-description" className="sr-only">
                  Enter your email address to sign in as a tester
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tester-password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="tester-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="h-11 pr-10"
                    aria-required="true"
                    aria-describedby="tester-password-description"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </Button>
                  <span id="tester-password-description" className="sr-only">
                    Enter your password to sign in as a tester
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <a
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                >
                  Forgot password?
                </a>
              </div>

              <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading} aria-busy={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 border-t pt-6">
        <p className="text-center text-sm text-muted-foreground text-pretty">
          {"Don't have an account? "}
          <a
            href="/signup"
            className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          >
            Sign up
          </a>
        </p>
      </CardFooter>
    </Card>
  )
}
