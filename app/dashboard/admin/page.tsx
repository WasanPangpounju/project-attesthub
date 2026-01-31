"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleGuard } from "@/components/role-guard";
import {
  LayoutDashboard,
  Users,
  Network,
  FileText,
  Settings,
  Search,
  UserPlus,
  CheckCircle,
  Menu,
  X,
} from "lucide-react";

type ProjectStatus = "pending" | "open" | "in_review" | "scheduled" | "completed" | "cancelled";
type TesterRole = "lead" | "member" | "reviewer";
type TesterWorkStatus = "assigned" | "accepted" | "working" | "done" | "removed";

type AssignedTester = {
  testerId: string;
  role: TesterRole;
  workStatus: TesterWorkStatus;
  assignedAt: string;
  assignedBy?: string;
  acceptedAt?: string;
  completedAt?: string;
  note?: string;
};

type AdminAuditItem = {
  _id: string;
  customerId: string;
  projectName: string;
  status: ProjectStatus;

  assignedTesters: AssignedTester[];

  aiConfidence?: number;
  aiReportStatus?: "none" | "generated" | "validated" | "rejected";

  priceAmount: number;
  priceCurrency: "THB" | "USD";

  createdAt: string;
  updatedAt: string;
};

const statusLabel: Record<ProjectStatus, string> = {
  pending: "Pending",
  open: "Open",
  in_review: "In review",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusColors: Record<string, string> = {
  Pending: "bg-muted text-muted-foreground",
  Open: "bg-chart-1/20 text-chart-1",
  "In review": "bg-chart-4/20 text-chart-4",
  Scheduled: "bg-chart-3/20 text-chart-3",
  Completed: "bg-chart-2/20 text-chart-2",
  Cancelled: "bg-destructive/15 text-destructive",
};

const navItems = [
  { label: "Project Overview", icon: LayoutDashboard, active: true },
  { label: "Customer Management", icon: Users, active: false },
  { label: "Tester Network", icon: Network, active: false },
  { label: "AI Audit Reports", icon: FileText, active: false },
  { label: "System Settings", icon: Settings, active: false },
];

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<AdminAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await fetch("/api/admin/audit-requests", { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Request failed (${res.status})`);
        }

        const data = (await res.json()) as { items: AdminAuditItem[] };
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e?.message || "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;

    return items.filter((p) => {
      const name = p.projectName?.toLowerCase() || "";
      const customer = p.customerId?.toLowerCase() || "";
      const testers = (p.assignedTesters || []).map((t) => t.testerId.toLowerCase()).join(" ");
      return name.includes(q) || customer.includes(q) || testers.includes(q);
    });
  }, [items, searchQuery]);

  const metrics = useMemo(() => {
    const total = items.length;

    const active = items.filter((x) => x.status === "open" || x.status === "in_review" || x.status === "scheduled").length;
    const pending = items.filter((x) => x.status === "pending").length;
    const completed = items.filter((x) => x.status === "completed").length;

    const testerSet = new Set<string>();
    items.forEach((x) => (x.assignedTesters || []).forEach((t) => testerSet.add(t.testerId)));

    const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : "0%");

    return [
      { title: "Active Audits", value: String(active), change: pct(active), icon: LayoutDashboard },
      { title: "Pending Assignments", value: String(pending), change: pct(pending), icon: Users },
      { title: "Completed Reports", value: String(completed), change: pct(completed), icon: FileText },
      { title: "Active Testers", value: String(testerSet.size), change: `+${testerSet.size}`, icon: Network },
    ];
  }, [items]);

  const renderAssignedTesters = (assigned: AssignedTester[]) => {
    if (!assigned?.length) return <span className="text-muted-foreground italic">Not assigned</span>;

    const lead = assigned.find((t) => t.role === "lead");
    const shown = lead?.testerId || assigned[0].testerId;
    const extra = assigned.length - 1;

    return (
      <span className="text-foreground">
        {shown}
        {extra > 0 ? <span className="text-muted-foreground"> +{extra}</span> : null}
      </span>
    );
  };

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="flex min-h-screen bg-background">
      {/* Mobile overlay -> button (WCAG) */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 border-r border-border bg-sidebar transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Admin navigation"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-sidebar-primary" aria-hidden="true" />
              <span className="text-lg font-semibold text-sidebar-foreground">Attesthub</span>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                  aria-current={item.active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sidebar-primary" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium text-sidebar-foreground">Admin User</p>
                <p className="text-xs text-sidebar-foreground/70">admin@attesthub.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center gap-4 px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage audits, testers, and reports</p>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {errorMsg && (
            <div role="alert" className="rounded-lg border border-border bg-card p-4 text-sm">
              <span className="font-medium">Error:</span> {errorMsg}
            </div>
          )}

          {/* Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-busy={loading ? "true" : "false"}>
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.title} className="bg-card border-border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-card-foreground">{metric.title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-card-foreground">{loading ? "—" : metric.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="text-chart-2">{metric.change}</span> from total
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick actions (ยังไม่ผูกจริงใน Admin A) */}
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" type="button">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Assign Tester to Project
            </Button>
            <Button variant="outline" className="gap-2 border-border bg-transparent" type="button">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              Validate AI Report
            </Button>
          </div>

          {/* Recent Projects */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-xl font-semibold text-card-foreground">Recent Projects</CardTitle>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <label htmlFor="admin-project-search" className="sr-only">
                    Search projects
                  </label>
                  <Input
                    id="admin-project-search"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background border-border"
                    autoComplete="off"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-muted/50">
                      <TableHead className="text-muted-foreground">Project Name</TableHead>
                      <TableHead className="text-muted-foreground">Customer</TableHead>
                      <TableHead className="text-muted-foreground">Assigned Testers</TableHead>
                      <TableHead className="text-muted-foreground">AI Confidence</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {!loading && filteredProjects.length === 0 && (
                      <TableRow className="border-border">
                        <TableCell colSpan={6} className="text-muted-foreground">
                          No projects found.
                        </TableCell>
                      </TableRow>
                    )}

                    {filteredProjects.map((p) => {
                      const status = statusLabel[p.status] || "Pending";
                      const ai = typeof p.aiConfidence === "number" ? p.aiConfidence : null;

                      return (
                        <TableRow key={p._id} className="border-border hover:bg-muted/50">
                          <TableCell className="font-medium text-foreground">{p.projectName}</TableCell>
                          <TableCell className="text-foreground">{p.customerId}</TableCell>
                          <TableCell>{renderAssignedTesters(p.assignedTesters)}</TableCell>

                          <TableCell>
                            {ai === null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-20 overflow-hidden rounded-full bg-muted"
                                  role="progressbar"
                                  aria-label="AI confidence"
                                  aria-valuenow={ai}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                >
                                  <div className="h-full bg-chart-2" style={{ width: `${ai}%` }} />
                                </div>
                                <span className="text-sm font-medium text-foreground">{ai}%</span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell>
                            <Badge variant="secondary" className={statusColors[status] || "bg-muted text-muted-foreground"}>
                              {status}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/dashboard/admin/projects/${p._id}`} aria-label={`View project ${p.projectName}`}>
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
    </RoleGuard>
  );
}
