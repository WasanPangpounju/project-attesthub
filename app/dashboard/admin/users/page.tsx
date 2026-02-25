import { AdminUserTable } from "@/components/admin-user-table"
import { RoleGuard } from "@/components/role-guard"

export const metadata = { title: "User Management | AttestHub Admin" }

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const { role } = await searchParams

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add, edit, or remove users. Pre-registered users appear here until they log in.
            Removing a user deletes their platform record only — their Clerk login is preserved.
          </p>
        </div>
        <AdminUserTable initialRole={role ?? ""} />
      </div>
    </RoleGuard>
  )
}
