"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleGuard } from "@/components/role-guard";
import {
  LayoutDashboard,
  Users,
  Network,
  FileText,
  Settings,
  ScanLine,
  Loader2,
  Play,
  Calendar,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  UserCircle,
  ExternalLink,
  Globe,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanScope = "single" | "full_site";

type AuditItem = {
  _id: string;
  projectName: string;
  targetUrl: string;
  status: string;
  scanScope?: ScanScope;
  scheduleEnabled?: boolean;
  scheduleCron?: string;
};

type ActiveScan = {
  auditRequestId: string;
  projectName: string;
  targetUrl: string;
  jobId: string;
  reportId: string;
  progress: number;
  jobStatus: string; // "waiting" | "active" | "completed" | "failed"
  reportStatus: string | null;
};

// ─── Nav ──────────────────────────────────────────────────────────────────────

const navItems = [
  { label: "Project Overview", icon: LayoutDashboard, href: "/dashboard/admin" },
  { label: "Customer Management", icon: Users, href: "/dashboard/admin/users?role=customer" },
  { label: "Tester Network", icon: Network, href: "/dashboard/admin/users?role=tester" },
  { label: "AI Audit Reports", icon: FileText, href: "/dashboard/reports" },
  { label: "Scan Management", icon: ScanLine, href: "/dashboard/admin/scan" },
  { label: "Guest Scans", icon: Globe, href: "/admin/guest-scans" },
  { label: "System Settings", icon: Settings, href: "/dashboard/admin/settings" },
  { label: "My Profile", icon: UserCircle, href: "/dashboard/profile" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScanManagementPage() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // All audit requests
  const [allItems, setAllItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Scans that are currently running (tracked client-side)
  const [activeScans, setActiveScans] = useState<ActiveScan[]>([]);
  // IDs that have been started (to remove from pending list)
  const [startedIds, setStartedIds] = useState<Set<string>>(new Set());
  // Loading state per request
  const [startingIds, setStartingIds] = useState<Set<string>>(new Set());

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function isNavActive(href: string) {
    const base = href.split("?")[0];
    if (base === "/dashboard/admin") return pathname === base;
    return pathname.startsWith(base);
  }

  // ── Fetch all audit requests ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await fetch("/api/admin/audit-requests", { cache: "no-store" });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d?.error || `Request failed (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled) setAllItems(Array.isArray(data.items) ? data.items : []);
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e?.message || "Failed to load projects");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Pending: not yet started ───────────────────────────────────────────────
  const pendingItems = allItems.filter(
    (item) => !startedIds.has(item._id) && !item.scheduleEnabled
  );

  // ── Scheduled: scheduleEnabled = true ─────────────────────────────────────
  const scheduledItems = allItems.filter((item) => item.scheduleEnabled);

  // ── Start scan ────────────────────────────────────────────────────────────
  async function handleStartScan(item: AuditItem) {
    setStartingIds((prev) => new Set(prev).add(item._id));
    try {
      const res = await fetch("/api/admin/scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditRequestId: item._id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || `Failed to start scan (${res.status})`);
      }
      const { jobId, reportId } = await res.json();

      setStartedIds((prev) => new Set(prev).add(item._id));
      setActiveScans((prev) => [
        ...prev,
        {
          auditRequestId: item._id,
          projectName: item.projectName,
          targetUrl: item.targetUrl,
          jobId,
          reportId,
          progress: 0,
          jobStatus: "waiting",
          reportStatus: null,
        },
      ]);
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to start scan");
    } finally {
      setStartingIds((prev) => {
        const next = new Set(prev);
        next.delete(item._id);
        return next;
      });
    }
  }

  // ── Poll active scans every 3 seconds ─────────────────────────────────────
  const pollScans = useCallback(async () => {
    setActiveScans((prev) => {
      // Only poll non-terminal scans
      const toUpdate = prev.filter(
        (s) => s.jobStatus !== "completed" && s.jobStatus !== "failed"
      );
      if (toUpdate.length === 0) return prev;

      Promise.all(
        toUpdate.map(async (scan) => {
          try {
            const res = await fetch(`/api/admin/scan/${scan.jobId}/status`);
            if (!res.ok) return null;
            return await res.json();
          } catch {
            return null;
          }
        })
      ).then((results) => {
        setActiveScans((current) =>
          current.map((scan) => {
            const result = results.find((r) => r && r.jobId === scan.jobId);
            if (!result) return scan;
            return {
              ...scan,
              progress: typeof result.progress === "number" ? result.progress : scan.progress,
              jobStatus: result.status ?? scan.jobStatus,
              reportStatus: result.reportStatus ?? scan.reportStatus,
              reportId: result.reportId ?? scan.reportId,
            };
          })
        );
      });

      return prev;
    });
  }, []);

  useEffect(() => {
    pollingRef.current = setInterval(pollScans, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pollScans]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function scopeLabel(scope?: ScanScope) {
    return scope === "full_site" ? "Full Site" : "Single Page";
  }

  function cronLabel(cron?: string) {
    if (!cron) return "—";
    // Simple human-readable mapping for common patterns
    const map: Record<string, string> = {
      "0 2 * * 1": "Every Monday 02:00",
      "0 2 * * *": "Every day 02:00",
      "0 0 * * 0": "Every Sunday 00:00",
      "0 * * * *": "Every hour",
    };
    return map[cron] ?? cron;
  }

  function jobStatusBadge(status: string) {
    const map: Record<string, { label: string; className: string }> = {
      waiting: { label: "Waiting", className: "bg-muted text-muted-foreground" },
      active: { label: "Scanning", className: "bg-chart-1/20 text-chart-1" },
      completed: { label: "Completed", className: "bg-chart-2/20 text-chart-2" },
      failed: { label: "Failed", className: "bg-destructive/15 text-destructive" },
    };
    const entry = map[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
    return (
      <Badge variant="secondary" className={entry.className}>
        {entry.label}
      </Badge>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="flex min-h-screen bg-background">
        {/* Mobile overlay */}
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
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            <nav className="flex-1 space-y-1 p-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
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
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Scan Management</h1>
                <p className="text-sm text-muted-foreground">
                  Trigger, monitor, and schedule AI accessibility scans
                </p>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-6">
            {errorMsg && (
              <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                <span className="font-medium">Error:</span> {errorMsg}
              </div>
            )}

            {/* ── Section 1: Pending Requests ──────────────────────────────── */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ScanLine className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  Pending Requests
                  {!loading && (
                    <Badge variant="secondary" className="ml-2 bg-muted text-muted-foreground">
                      {pendingItems.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Loading projects…
                  </div>
                ) : pendingItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 italic">
                    No pending scan requests.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-muted/50">
                          <TableHead className="text-muted-foreground">Project</TableHead>
                          <TableHead className="text-muted-foreground">URL</TableHead>
                          <TableHead className="text-muted-foreground">Scope</TableHead>
                          <TableHead className="text-muted-foreground">Status</TableHead>
                          <TableHead className="text-muted-foreground text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingItems.map((item) => (
                          <TableRow key={item._id} className="border-border hover:bg-muted/50">
                            <TableCell className="font-medium text-foreground">
                              {item.projectName}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[180px] truncate">
                              {item.targetUrl}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {scopeLabel(item.scanScope)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="bg-muted text-muted-foreground capitalize"
                              >
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                className="gap-1.5"
                                onClick={() => handleStartScan(item)}
                                disabled={startingIds.has(item._id)}
                                aria-label={`Start scan for ${item.projectName}`}
                              >
                                {startingIds.has(item._id) ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
                                Start Scan
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Section 2: Active Scans ───────────────────────────────────── */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Loader2
                    className={`h-5 w-5 ${activeScans.length > 0 ? "animate-spin text-chart-1" : "text-muted-foreground"}`}
                    aria-hidden="true"
                  />
                  Active Scans
                  {activeScans.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-chart-1/20 text-chart-1">
                      {activeScans.filter((s) => s.jobStatus !== "completed" && s.jobStatus !== "failed").length} running
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeScans.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 italic">
                    No active scans. Start a scan from the Pending Requests section above.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {activeScans.map((scan) => {
                      const isDone = scan.jobStatus === "completed";
                      const isFailed = scan.jobStatus === "failed";
                      const isRunning = !isDone && !isFailed;

                      return (
                        <div
                          key={scan.jobId}
                          className="rounded-lg border border-border bg-background p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {scan.projectName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {scan.targetUrl}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {jobStatusBadge(scan.jobStatus)}
                              {isDone && scan.reportId && (
                                <Button asChild size="sm" variant="outline" className="gap-1.5">
                                  <Link href={`/dashboard/reports/${scan.reportId}`}>
                                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                    View Report
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>
                                {isFailed ? "Scan failed" : isDone ? "Completed" : "Scanning…"}
                              </span>
                              <span>{scan.progress}%</span>
                            </div>
                            <Progress
                              value={isDone ? 100 : isFailed ? scan.progress : scan.progress}
                              className={`h-2 ${isFailed ? "[&>div]:bg-destructive" : isDone ? "[&>div]:bg-chart-2" : ""}`}
                              aria-label={`Scan progress for ${scan.projectName}`}
                            />
                          </div>

                          {/* Status icon row */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {isDone ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-chart-2" aria-hidden="true" />
                            ) : isFailed ? (
                              <XCircle className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                            ) : (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            )}
                            <span>Job ID: {scan.jobId}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Section 3: Scheduled Scans ───────────────────────────────── */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  Scheduled Scans
                  {!loading && scheduledItems.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-muted text-muted-foreground">
                      {scheduledItems.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Loading…
                  </div>
                ) : scheduledItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 italic">
                    No scheduled scans. Enable a schedule on an Audit Request to see it here.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-muted/50">
                          <TableHead className="text-muted-foreground">Project</TableHead>
                          <TableHead className="text-muted-foreground">URL</TableHead>
                          <TableHead className="text-muted-foreground">Schedule</TableHead>
                          <TableHead className="text-muted-foreground">Scope</TableHead>
                          <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scheduledItems.map((item) => (
                          <TableRow key={item._id} className="border-border hover:bg-muted/50">
                            <TableCell className="font-medium text-foreground">
                              {item.projectName}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[160px] truncate">
                              {item.targetUrl}
                            </TableCell>
                            <TableCell className="text-foreground text-sm">
                              {cronLabel(item.scheduleCron)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {scopeLabel(item.scanScope)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5"
                                  onClick={() => handleStartScan(item)}
                                  disabled={startingIds.has(item._id) || startedIds.has(item._id)}
                                  aria-label={`Run scan now for ${item.projectName}`}
                                >
                                  {startingIds.has(item._id) ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                  Run Now
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-muted-foreground"
                                  asChild
                                >
                                  <Link href={`/dashboard/admin/projects/${item._id}`}>
                                    Edit Schedule
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
