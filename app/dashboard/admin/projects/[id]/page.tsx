"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Loader2, AlertCircle, Users, Trash2 } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import EditProjectForm from "./edit-form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ProjectStatus = "pending" | "open" | "in_review" | "scheduled" | "completed" | "cancelled";
type ServiceCategory = "website" | "mobile" | "physical";
type ServicePackage = "automated" | "hybrid" | "expert";
type TesterRole = "lead" | "member" | "reviewer";
type TesterWorkStatus = "assigned" | "accepted" | "working" | "done" | "removed";

interface AssignedTester {
  testerId: string;
  role: TesterRole;
  workStatus: TesterWorkStatus;
  assignedAt: string;
  assignedBy?: string;
  acceptedAt?: string;
  completedAt?: string;
  note?: string;
  progressPercent?: number;
}

interface StatusHistoryItem {
  from?: ProjectStatus;
  to: ProjectStatus;
  changedAt: string;
  changedBy?: string;
  note?: string;
}

interface AuditRequest {
  _id: string;
  customerId: string;
  projectName: string;
  serviceCategory: ServiceCategory;
  targetUrl: string;
  locationAddress: string;
  accessibilityStandard: string;
  servicePackage: ServicePackage;
  devices: string[];
  specialInstructions: string;
  priceAmount: number;
  priceCurrency: "THB" | "USD";
  priceNote?: string;
  status: ProjectStatus;
  assignedTesters: AssignedTester[];
  statusHistory: StatusHistoryItem[];
  priority?: "low" | "normal" | "high" | "urgent";
  dueDate?: string;
  adminNotes?: string;
  aiConfidence?: number;
  aiReportStatus?: "none" | "generated" | "validated" | "rejected";
  createdAt: string;
  updatedAt: string;
}

interface AvailableTester {
  clerkUserId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const statusLabel: Record<string, string> = {
  pending: "Pending",
  open: "Open",
  in_review: "In review",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

const workStatusColors: Record<TesterWorkStatus, string> = {
  assigned: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  working: "bg-purple-100 text-purple-800",
  done: "bg-green-100 text-green-800",
  removed: "bg-gray-100 text-gray-600",
};

function fmtDate(d: string | undefined | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString(); } catch { return "—"; }
}

function testerDisplayName(info: AvailableTester | undefined, fallback: string): string {
  if (!info) return fallback;
  const name = `${info.firstName ?? ""} ${info.lastName ?? ""}`.trim();
  return name || info.email || fallback;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminProjectDetailPage() {
  const params = useParams();
  const [id, setId] = useState("");

  useEffect(() => {
    const paramId = (params as { id?: string })?.id;
    if (typeof paramId === "string") setId(paramId.trim());
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<AuditRequest | null>(null);
  const [error, setError] = useState<string>("");
  const [editMode, setEditMode] = useState(false);

  // Fetch project detail
  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setError("");
      setItem(null);
      if (!id) { setLoading(false); setError("Missing project id"); return; }
      try {
        const res = await fetch(`/api/audit-requests/${encodeURIComponent(id)}`, {
          headers: { accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`API ${res.status}: ${text || "Request failed"}`);
        }
        const data = await res.json();
        if (!alive) return;
        setItem(data?.data ?? null);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }
    run();
    return () => { alive = false; };
  }, [id]);

  // Tester list (for assign dropdown)
  const [testers, setTesters] = useState<AvailableTester[]>([]);
  const [loadingTesters, setLoadingTesters] = useState(false);
  const [testerMap, setTesterMap] = useState<Record<string, AvailableTester>>({});

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoadingTesters(true);
    fetch("/api/admin/testers", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load testers");
        return res.json() as Promise<{ data: AvailableTester[] }>;
      })
      .then(({ data }) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data : [];
        setTesters(list);
        const map: Record<string, AvailableTester> = {};
        list.forEach((t) => { map[t.clerkUserId] = t; });
        setTesterMap(map);
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (alive) setLoadingTesters(false); });
    return () => { alive = false; };
  }, [id]);

  // Assign form
  const [assignForm, setAssignForm] = useState({ testerId: "", role: "member", note: "" });
  const [assigning, setAssigning] = useState(false);

  async function handleAssignTester() {
    if (!assignForm.testerId || !assignForm.role || !item) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/audit-requests/${item._id}/assign-tester`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testerId: assignForm.testerId,
          role: assignForm.role,
          note: assignForm.note,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`);
      }
      const { data } = await res.json() as { data: AuditRequest };
      setItem(data);
      setAssignForm({ testerId: "", role: "member", note: "" });
      toast.success("Tester assigned");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign tester");
    } finally {
      setAssigning(false);
    }
  }

  // Remove tester
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  async function handleRemoveTester(testerId: string) {
    if (!item) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/audit-requests/${item._id}/assign-tester`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testerId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`);
      }
      setItem((prev) =>
        prev
          ? {
              ...prev,
              assignedTesters: prev.assignedTesters.map((t) =>
                t.testerId === testerId ? { ...t, workStatus: "removed" as TesterWorkStatus } : t
              ),
            }
          : null
      );
      toast.success("Tester removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove tester");
    } finally {
      setRemoving(false);
      setRemoveConfirmId(null);
    }
  }

  // ─── Status helpers ────────────────────────────────────────────────────────

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100";
      case "open": return "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100";
      case "in_review":
      case "scheduled": return "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100";
      case "completed": return "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100";
      case "cancelled": return "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100";
      default: return "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100";
      case "high": return "bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100";
      case "normal": return "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100";
      default: return "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  // ─── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 lg:p-8 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading project details...
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 lg:p-8">
            <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Error</p>
                <p className="text-sm text-destructive/80">{error || "Project not found"}</p>
              </div>
            </div>
            <Link href="/dashboard/admin">
              <Button variant="outline" className="mt-4 gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </main>
        </div>
      </div>
    );
  }

  const activeTesters = (item.assignedTesters || []).filter((t) => t.workStatus !== "removed");

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        <main className="flex-1 p-6 lg:p-8">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/admin">
                <Button variant="ghost" size="icon" aria-label="Back to dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">{item.projectName}</h1>
                <p className="text-sm text-muted-foreground mt-1">ID: {item._id}</p>
              </div>
            </div>
            <Button
              onClick={() => setEditMode(!editMode)}
              className="gap-2"
              variant={editMode ? "destructive" : "default"}
            >
              {editMode ? "Cancel" : <><Pencil className="h-4 w-4" /> Edit</>}
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getStatusColor(item.status)}>{statusLabel[item.status] || item.status}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getPriorityColor(item.priority)}>{item.priority || "N/A"}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Service Package</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">{item.servicePackage}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">AI Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">
                  {item.aiConfidence !== undefined ? `${(item.aiConfidence * 100).toFixed(0)}%` : "N/A"}
                </p>
              </CardContent>
            </Card>
          </div>

          {editMode ? (
            <EditProjectForm
              project={item}
              onSuccess={() => { setEditMode(false); window.location.reload(); }}
              onCancel={() => setEditMode(false)}
            />
          ) : (
            <Tabs defaultValue="general" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="testers">Testers</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              {/* General Info Tab */}
              <TabsContent value="general" className="space-y-4">
                <Card>
                  <CardHeader><CardTitle>Project Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Customer ID</p>
                        <p className="font-semibold">{item.customerId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Service Category</p>
                        <p className="font-semibold capitalize">{item.serviceCategory}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Target URL</p>
                        <a href={item.targetUrl} target="_blank" rel="noopener noreferrer"
                          className="font-semibold text-blue-600 dark:text-blue-400 hover:underline break-all">
                          {item.targetUrl}
                        </a>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location Address</p>
                        <p className="font-semibold">{item.locationAddress || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Accessibility Standard</p>
                        <p className="font-semibold">{item.accessibilityStandard}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Devices</p>
                        <div className="flex gap-2 flex-wrap mt-1">
                          {(item.devices || []).map((device) => (
                            <Badge key={device} variant="secondary">{device}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Special Instructions</p>
                      <p className="font-semibold whitespace-pre-wrap">{item.specialInstructions || "None"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Pricing & Payment</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="text-2xl font-bold">
                          {(item.priceAmount / 100).toFixed(2)} {item.priceCurrency}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Currency</p>
                        <p className="font-semibold">{item.priceCurrency}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">AI Report Status</p>
                        <Badge variant="outline">{item.aiReportStatus || "none"}</Badge>
                      </div>
                    </div>
                    {item.priceNote && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm text-muted-foreground">Price Note</p>
                          <p className="whitespace-pre-wrap">{item.priceNote}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Testers Tab ─────────────────────────────────────────── */}
              <TabsContent value="testers" className="space-y-4">

                {/* Current Testers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Assigned Testers</CardTitle>
                    <CardDescription>{activeTesters.length} active tester(s)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingTesters ? (
                      <div className="space-y-3">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <Skeleton key={i} className="h-20 w-full rounded-lg" />
                        ))}
                      </div>
                    ) : activeTesters.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="mx-auto h-10 w-10 mb-2 opacity-30" aria-hidden="true" />
                        <p className="text-sm">No testers assigned yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeTesters.map((tester, idx) => {
                          const info = testerMap[tester.testerId];
                          const name = testerDisplayName(info, tester.testerId);
                          const initials = name.slice(0, 2).toUpperCase();
                          const progress = tester.progressPercent ?? 0;

                          return (
                            <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                              <Avatar className="h-9 w-9 shrink-0">
                                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                              </Avatar>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm">{name}</p>
                                  {info?.email && (
                                    <span className="text-xs text-muted-foreground">{info.email}</span>
                                  )}
                                  <Badge variant="outline" className="text-xs capitalize">{tester.role}</Badge>
                                  <Badge className={cn("text-xs", workStatusColors[tester.workStatus])}>
                                    {tester.workStatus}
                                  </Badge>
                                </div>

                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                    <span>Progress</span>
                                    <span>{progress}%</span>
                                  </div>
                                  <Progress
                                    value={progress}
                                    className="h-1.5"
                                    aria-label={`${name} progress: ${progress}%`}
                                  />
                                </div>

                                <p className="text-xs text-muted-foreground mt-1">
                                  Assigned: {new Date(tester.assignedAt).toLocaleDateString()}
                                  {tester.acceptedAt && ` · Accepted: ${new Date(tester.acceptedAt).toLocaleDateString()}`}
                                  {tester.completedAt && ` · Done: ${new Date(tester.completedAt).toLocaleDateString()}`}
                                </p>
                                {tester.note && (
                                  <p className="text-xs text-muted-foreground mt-0.5 italic">{tester.note}</p>
                                )}
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 shrink-0"
                                onClick={() => setRemoveConfirmId(tester.testerId)}
                                aria-label={`Remove tester ${name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Assign New Tester */}
                <Card>
                  <CardHeader>
                    <CardTitle>Assign New Tester</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="assign-tester-select">Tester</Label>
                      <Select
                        value={assignForm.testerId}
                        onValueChange={(v) => setAssignForm((f) => ({ ...f, testerId: v }))}
                      >
                        <SelectTrigger id="assign-tester-select">
                          <SelectValue placeholder="Select a tester…" />
                        </SelectTrigger>
                        <SelectContent>
                          {testers.length === 0 && (
                            <SelectItem value="__none__" disabled>
                              No active testers found
                            </SelectItem>
                          )}
                          {testers.map((t) => {
                            const name = testerDisplayName(t, t.clerkUserId);
                            const isAlreadyAssigned = (item.assignedTesters || []).some(
                              (at) => at.testerId === t.clerkUserId && at.workStatus !== "removed"
                            );
                            return (
                              <SelectItem
                                key={t.clerkUserId}
                                value={t.clerkUserId}
                                disabled={isAlreadyAssigned}
                              >
                                {name}
                                {t.email ? ` · ${t.email}` : ""}
                                {isAlreadyAssigned ? " (assigned)" : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assign-role-select">Role</Label>
                      <Select
                        value={assignForm.role}
                        onValueChange={(v) => setAssignForm((f) => ({ ...f, role: v }))}
                      >
                        <SelectTrigger id="assign-role-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="reviewer">Reviewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assign-note">Note (optional)</Label>
                      <Input
                        id="assign-note"
                        placeholder="Add a note…"
                        value={assignForm.note}
                        onChange={(e) => setAssignForm((f) => ({ ...f, note: e.target.value }))}
                      />
                    </div>

                    <Button
                      onClick={handleAssignTester}
                      disabled={!assignForm.testerId || assigning}
                      className="gap-2"
                    >
                      {assigning && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      Assign Tester
                    </Button>
                  </CardContent>
                </Card>

                {/* Remove Confirmation Dialog */}
                <AlertDialog
                  open={!!removeConfirmId}
                  onOpenChange={(open) => { if (!open) setRemoveConfirmId(null); }}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Tester</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove{" "}
                        <strong>
                          {removeConfirmId
                            ? testerDisplayName(testerMap[removeConfirmId], removeConfirmId)
                            : "this tester"}
                        </strong>{" "}
                        from this project? Their work history will be preserved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => { if (removeConfirmId) handleRemoveTester(removeConfirmId); }}
                        disabled={removing}
                      >
                        {removing ? "Removing…" : "Remove"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader><CardTitle>Status History</CardTitle></CardHeader>
                  <CardContent>
                    {(item.statusHistory || []).length > 0 ? (
                      <div className="space-y-4">
                        {(item.statusHistory || []).map((historyItem, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-4 h-4 rounded-full bg-primary" />
                              {idx < item.statusHistory.length - 1 && (
                                <div className="w-1 h-12 bg-border" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">
                                {historyItem.from ? `${historyItem.from} → ` : ""}
                                {historyItem.to}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(historyItem.changedAt).toLocaleString()}
                              </p>
                              {historyItem.changedBy && (
                                <p className="text-sm text-muted-foreground">Changed by: {historyItem.changedBy}</p>
                              )}
                              {historyItem.note && <p className="text-sm mt-1">{historyItem.note}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">No status history</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Dates</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-semibold">{fmtDate(item.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Updated</p>
                      <p className="font-semibold">{fmtDate(item.updatedAt)}</p>
                    </div>
                    {item.dueDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Due Date</p>
                        <p className="font-semibold">{fmtDate(item.dueDate)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader><CardTitle>Admin Notes</CardTitle></CardHeader>
                  <CardContent>
                    {item.adminNotes ? (
                      <p className="whitespace-pre-wrap">{item.adminNotes}</p>
                    ) : (
                      <p className="text-muted-foreground italic">No admin notes</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
}
