import { RoleGuard } from "@/components/role-guard"
import { FileText } from "lucide-react"

export const metadata = { title: "AI Audit Reports | AttestHub Admin" }

export default function AdminReportsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Audit Reports</h1>
        <p className="text-muted-foreground max-w-sm">
          AI-powered audit report generation and validation is coming soon.
        </p>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground border border-border rounded-full px-3 py-1">
          Coming Soon
        </span>
      </div>
    </RoleGuard>
  )
}
