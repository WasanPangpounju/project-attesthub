import { RoleGuard } from "@/components/role-guard"
import { Settings } from "lucide-react"

export const metadata = { title: "System Settings | AttestHub Admin" }

export default function AdminSettingsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Settings className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground max-w-sm">
          Platform configuration and system settings are coming soon.
        </p>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground border border-border rounded-full px-3 py-1">
          Coming Soon
        </span>
      </div>
    </RoleGuard>
  )
}
