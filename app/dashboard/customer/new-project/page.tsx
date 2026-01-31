"use client"
import { AuditRequestForm } from "@/components/audit-request-form"

export default function Page() {
  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            New Audit Request
          </h1>
          <p className="mt-3 text-lg text-muted-foreground text-pretty">
            Submit your accessibility audit request and we'll get started on making your digital experience inclusive
            for everyone.
          </p>
        </div>
        <AuditRequestForm />
      </div>
    </main>
  )
}
