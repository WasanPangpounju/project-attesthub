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
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  ArrowLeft, Pencil, Loader2, AlertCircle, Users, Trash2,
  GripVertical, ChevronDown, ChevronUp, Plus, FileText, ArrowUp, ArrowDown,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import EditProjectForm from "./edit-form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

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

interface Scenario {
  _id: string;
  auditRequestId: string;
  title: string;
  description?: string;
  assignedTesterId: string;
  order: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  testCaseCount?: number;
}

interface TestStep {
  order: number;
  instruction: string;
}

interface TesterResult {
  testerId: string;
  status: "pending" | "pass" | "fail" | "skip";
  note?: string;
  attachments: { name: string; size: number; type: string; url?: string; publicId?: string }[];
  testedAt?: string;
}

interface TestCase {
  _id: string;
  scenarioId: string;
  auditRequestId: string;
  title: string;
  description?: string;
  steps: TestStep[];
  expectedResult: string;
  priority: "low" | "medium" | "high" | "critical";
  order: number;
  results: TesterResult[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface TCFormState {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  expectedResult: string;
  steps: TestStep[];
  order: string;
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

const DEFAULT_SCENARIO_FORM = { title: "", description: "", assignedTesterId: "", order: "" };
const DEFAULT_TC_FORM: TCFormState = {
  title: "", description: "", priority: "medium", expectedResult: "", steps: [], order: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | undefined | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString(); } catch { return "—"; }
}

function testerDisplayName(info: AvailableTester | undefined, fallback: string): string {
  if (!info) return fallback;
  const name = `${info.firstName ?? ""} ${info.lastName ?? ""}`.trim();
  return name || info.email || fallback;
}

function getPriorityBadgeClass(priority: string) {
  switch (priority) {
    case "critical": return "bg-red-100 text-red-800";
    case "high": return "bg-orange-100 text-orange-800";
    case "medium": return "bg-yellow-100 text-yellow-800";
    case "low": return "bg-gray-100 text-gray-600";
    default: return "bg-gray-100 text-gray-600";
  }
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

  // Tester list
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

  // Assign tester form
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

  // ─── Tab state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("general");

  // ─── Scenarios ────────────────────────────────────────────────────────────
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  // Add Scenario dialog
  const [addScenarioOpen, setAddScenarioOpen] = useState(false);
  const [addScenarioForm, setAddScenarioForm] = useState({ ...DEFAULT_SCENARIO_FORM });
  const [addScenarioError, setAddScenarioError] = useState("");
  const [addingScenario, setAddingScenario] = useState(false);

  // Delete Scenario
  const [deleteScenarioId, setDeleteScenarioId] = useState<string | null>(null);
  const [deletingScenario, setDeletingScenario] = useState(false);

  // Edit Scenario inline
  const [editScenarioMode, setEditScenarioMode] = useState(false);
  const [editScenarioForm, setEditScenarioForm] = useState({ ...DEFAULT_SCENARIO_FORM });
  const [savingScenario, setSavingScenario] = useState(false);

  // ─── Test Cases ───────────────────────────────────────────────────────────
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loadingTestCases, setLoadingTestCases] = useState(false);
  const [expandedTCs, setExpandedTCs] = useState<Set<string>>(new Set());
  const [addTCOpen, setAddTCOpen] = useState(false);
  const [editTC, setEditTC] = useState<TestCase | null>(null);
  const [deleteTCId, setDeleteTCId] = useState<string | null>(null);
  const [deletingTC, setDeletingTC] = useState(false);
  const [tcForm, setTCForm] = useState<TCFormState>({ ...DEFAULT_TC_FORM });
  const [tcFormError, setTCFormError] = useState("");
  const [submittingTC, setSubmittingTC] = useState(false);

  // Fetch scenarios when tab = testcases
  useEffect(() => {
    if (!id || activeTab !== "testcases") return;
    let alive = true;
    async function run() {
      setLoadingScenarios(true);
      try {
        const res = await fetch(
          `/api/admin/audit-requests/${encodeURIComponent(id)}/scenarios`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Failed to fetch scenarios");
        const json = await res.json() as { data: Scenario[] };
        if (!alive) return;
        setScenarios(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (alive) toast.error("Failed to load scenarios");
      } finally {
        if (alive) setLoadingScenarios(false);
      }
    }
    run();
    return () => { alive = false; };
  }, [id, activeTab]);

  // Fetch test cases when selected scenario changes
  useEffect(() => {
    if (!id || !selectedScenario) { setTestCases([]); return; }
    let alive = true;
    async function run() {
      setLoadingTestCases(true);
      try {
        const res = await fetch(
          `/api/admin/audit-requests/${encodeURIComponent(id)}/scenarios/${encodeURIComponent(selectedScenario._id)}/test-cases`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Failed to fetch test cases");
        const json = await res.json() as { data: TestCase[] };
        if (!alive) return;
        setTestCases(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (alive) toast.error("Failed to load test cases");
      } finally {
        if (alive) setLoadingTestCases(false);
      }
    }
    run();
    return () => { alive = false; };
  }, [id, selectedScenario]);

  async function handleAddScenario() {
    if (!addScenarioForm.title.trim()) { setAddScenarioError("Title is required"); return; }
    if (!addScenarioForm.assignedTesterId) { setAddScenarioError("Please select a tester"); return; }
    setAddScenarioError("");
    setAddingScenario(true);
    try {
      const body: Record<string, unknown> = {
        title: addScenarioForm.title.trim(),
        description: addScenarioForm.description.trim() || undefined,
        assignedTesterId: addScenarioForm.assignedTesterId,
      };
      if (addScenarioForm.order !== "") body.order = Number(addScenarioForm.order);
      const res = await fetch(
        `/api/admin/audit-requests/${encodeURIComponent(id)}/scenarios`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`);
      }
      const { data } = await res.json() as { data: Scenario };
      setScenarios((prev) => [...prev, data]);
      setSelectedScenario(data);
      setAddScenarioOpen(false);
      setAddScenarioForm({ ...DEFAULT_SCENARIO_FORM });
      toast.success("Scenario created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create scenario");
    } finally {
      setAddingScenario(false);
    }
  }

  async function handleDeleteScenario(scenarioId: string) {
    setDeletingScenario(true);
    try {
      const res = await fetch(
        `/api/admin/audit-requests/${encodeURIComponent(id)}/scenarios/${encodeURIComponent(scenarioId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`);
      }
      setScenarios((prev) => prev.filter((s) => s._id !== scenarioId));
      if (selectedScenario?._id === scenarioId) {
        setSelectedScenario(null);
        setTestCases([]);
      }
      toast.success("Scenario deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete scenario");
    } finally {
      setDeletingScenario(false);
      setDeleteScenarioId(null);
    }
  }

  function startEditScenario() {
    if (!selectedScenario) return;
    setEditScenarioForm({
      title: selectedScenario.title,
      description: selectedScenario.description ?? "",
      assignedTesterId: selectedScenario.assignedTesterId,
      order: String(selectedScenario.order),
    });
    setEditScenarioMode(true);
  }

  async function handleSaveScenario() {
    if (!selectedScenario) return;
    setSavingScenario(true);
    try {
      const body: Record<string, unknown> = {
        title: editScenarioForm.title.trim(),
        description: editScenarioForm.description.trim() || undefined,
        assignedTesterId: editScenarioForm.assignedTesterId,
      };
      if (editScenarioForm.order !== "") body.order = Number(editScenarioForm.order);
      const res = await fetch(
        `/api/admin/audit-requests/${encodeURIComponent(id)}/scenarios/${encodeURIComponent(selectedScenario._id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`);
      }
      const { data } = await res.json() as { data: Scenario };
      setScenarios((prev) => prev.map((s) => (s._id === data._id ? data : s)));
      setSelectedScenario(data);
      setEditScenarioMode(false);
      toast.success("Scenario updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update scenario");
    } finally {
      setSavingScenario(false);
    }
  }

  function toggleExpandTC(tcId: string) {
    setExpandedTCs((prev) => {
      const next = new Set(prev);
      if (next.has(tcId)) next.delete(tcId); else next.add(tcId);
      return next;
    });
  }

  function openAddTC() {
    setEditTC(null);
    setTCForm({ ...DEFAULT_TC_FORM, steps: [] });
    setTCFormError("");
    setAddTCOpen(true);
  }

  function openEditTC(tc: TestCase) {
    setEditTC(tc);
    setTCForm({
      title: tc.title,
      description: tc.description ?? "",
      priority: tc.priority,
      expectedResult: tc.expectedResult,
      steps: tc.steps.map((s) => ({ ...s })),
      order: String(tc.order),
    });
    setTCFormError("");
    setAddTCOpen(true);
  }

  function addStep() {
    setTCForm((prev) => ({
      ...prev,
      steps: [...prev.steps, { order: prev.steps.length, instruction: "" }],
    }));
  }

  function removeStep(idx: number) {
    setTCForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })),
    }));
  }

  function moveStep(idx: number, dir: "up" | "down") {
    setTCForm((prev) => {
      const steps = [...prev.steps];
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= steps.length) return prev;
      const temp = steps[idx];
      steps[idx] = steps[swap];
      steps[swap] = temp;
      return { ...prev, steps: steps.map((s, i) => ({ ...s, order: i })) };
    });
  }

  function updateStepInstruction(idx: number, instruction: string) {
    setTCForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === idx ? { ...s, instruction } : s)),
    }));
  }

  async function handleSubmitTC() {
    if (!selectedScenario) return;
    if (!tcForm.title.trim()) { setTCFormError("Title is required"); return; }
    if (!tcForm.expectedResult.trim()) { setTCFormError("Expected result is required"); return; }
    setTCFormError("");
    setSubmittingTC(true);
    try {
      const body: Record<string, unknown> = {
        title: tcForm.title.trim(),
        description: tcForm.description.trim() || undefined,
        priority: tcForm.priority,
        expectedResult: tcForm.expectedResult.trim(),
        steps: tcForm.steps,
      };
      if (tcForm.order !== "") body.order = Number(tcForm.order);
      const tcUrl = editTC
        ? `/api/admin/audit-requests/${encodeURIComponent(id)}/scenarios/${encodeURIComponent(selectedScenario._id)}/test-cases/${encodeURIComponent(editTC._id)}`
        : `/api/admin/audit-requests/${encodeURIComponent(id)}/scenarios/${encodeURIComponent(selectedScenario._id)}/test-cases`;
      const res = await fetch(tcUrl, {
        method: editTC ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`);
      }
      const { data } = await res.json() as { data: TestCase };
      if (editTC) {
        setTestCases((prev) => prev.map((tc) => (tc._id === data._id ? data : tc)));
      } else {
        setTestCases((prev) => [...prev, data]);
      }
      setAddTCOpen(false);
      setEditTC(null);
      toast.success(editTC ? "Test case updated" : "Test case created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save test case");
    } finally {
      setSubmittingTC(false);
    }
  }

  async function handleDeleteTC(tcId: string) {
    if (!selectedScenario) return;
    setDeletingTC(true);
    try {
      const res = await fetch(
        `/api/admin/audit-requests/${encodeURIComponent(id)}/scenarios/${encodeURIComponent(selectedScenario._id)}/test-cases/${encodeURIComponent(tcId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`);
      }
      setTestCases((prev) => prev.filter((tc) => tc._id !== tcId));
      toast.success("Test case deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete test case");
    } finally {
      setDeletingTC(false);
      setDeleteTCId(null);
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="testers">Testers</TabsTrigger>
                <TabsTrigger value="testcases">Test Cases</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              {/* ─── General Tab ──────────────────────────────────────────── */}
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

              {/* ─── Testers Tab ──────────────────────────────────────────── */}
              <TabsContent value="testers" className="space-y-4">
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
                                  <Progress value={progress} className="h-1.5" aria-label={`${name} progress: ${progress}%`} />
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
                  <CardHeader><CardTitle>Assign New Tester</CardTitle></CardHeader>
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
                            <SelectItem value="__none__" disabled>No active testers found</SelectItem>
                          )}
                          {testers.map((t) => {
                            const name = testerDisplayName(t, t.clerkUserId);
                            const isAlreadyAssigned = (item.assignedTesters || []).some(
                              (at) => at.testerId === t.clerkUserId && at.workStatus !== "removed"
                            );
                            return (
                              <SelectItem key={t.clerkUserId} value={t.clerkUserId} disabled={isAlreadyAssigned}>
                                {name}{t.email ? ` · ${t.email}` : ""}{isAlreadyAssigned ? " (assigned)" : ""}
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
                        <SelectTrigger id="assign-role-select"><SelectValue /></SelectTrigger>
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
                    <Button onClick={handleAssignTester} disabled={!assignForm.testerId || assigning} className="gap-2">
                      {assigning && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      Assign Tester
                    </Button>
                  </CardContent>
                </Card>

                {/* Remove Tester Confirmation */}
                <AlertDialog open={!!removeConfirmId} onOpenChange={(open) => { if (!open) setRemoveConfirmId(null); }}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Tester</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove{" "}
                        <strong>
                          {removeConfirmId ? testerDisplayName(testerMap[removeConfirmId], removeConfirmId) : "this tester"}
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

              {/* ─── Test Cases Tab ───────────────────────────────────────── */}
              <TabsContent value="testcases">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Left: Scenario List */}
                  <div className="md:col-span-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Scenarios</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs h-7"
                        onClick={() => setAddScenarioOpen(true)}
                      >
                        <Plus className="h-3 w-3" />
                        Add Scenario
                      </Button>
                    </div>

                    {loadingScenarios ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                      </div>
                    ) : scenarios.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border rounded-lg">
                        <FileText className="h-8 w-8 mb-2 opacity-30" aria-hidden="true" />
                        <p className="text-xs">No scenarios yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {scenarios.map((s) => (
                          <div
                            key={s._id}
                            className={cn(
                              "p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors",
                              selectedScenario?._id === s._id && "border-primary bg-accent"
                            )}
                            onClick={() => { setSelectedScenario(s); setEditScenarioMode(false); }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{s.title}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {testerDisplayName(testerMap[s.assignedTesterId], s.assignedTesterId)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Badge variant="secondary" className="text-xs">{s.testCaseCount ?? 0} TC</Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                  onClick={(e) => { e.stopPropagation(); setDeleteScenarioId(s._id); }}
                                  aria-label={`Delete scenario ${s.title}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Test Case List */}
                  <div className="md:col-span-2">
                    {!selectedScenario ? (
                      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border rounded-lg">
                        <FileText className="h-10 w-10 mb-2 opacity-30" aria-hidden="true" />
                        <p className="text-sm">Select a scenario to view test cases</p>
                      </div>
                    ) : (
                      <div className="space-y-4">

                        {/* Scenario header */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h3 className="font-semibold">{selectedScenario.title}</h3>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs h-7"
                              onClick={startEditScenario}
                            >
                              <Pencil className="h-3 w-3" />
                              Edit Scenario
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1 text-xs h-7"
                              onClick={openAddTC}
                            >
                              <Plus className="h-3 w-3" />
                              Add Test Case
                            </Button>
                          </div>
                        </div>

                        {/* Inline edit scenario form */}
                        {editScenarioMode && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm">Edit Scenario</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="space-y-1">
                                <Label htmlFor="edit-sc-title" className="text-xs">Title *</Label>
                                <Input
                                  id="edit-sc-title"
                                  value={editScenarioForm.title}
                                  onChange={(e) => setEditScenarioForm((f) => ({ ...f, title: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="edit-sc-desc" className="text-xs">Description</Label>
                                <Textarea
                                  id="edit-sc-desc"
                                  value={editScenarioForm.description}
                                  onChange={(e) => setEditScenarioForm((f) => ({ ...f, description: e.target.value }))}
                                  rows={2}
                                  className="resize-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="edit-sc-tester" className="text-xs">Assigned Tester</Label>
                                <Select
                                  value={editScenarioForm.assignedTesterId}
                                  onValueChange={(v) => setEditScenarioForm((f) => ({ ...f, assignedTesterId: v }))}
                                >
                                  <SelectTrigger id="edit-sc-tester"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {testers.map((t) => (
                                      <SelectItem key={t.clerkUserId} value={t.clerkUserId}>
                                        {testerDisplayName(t, t.clerkUserId)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="edit-sc-order" className="text-xs">Order</Label>
                                <Input
                                  id="edit-sc-order"
                                  type="number"
                                  value={editScenarioForm.order}
                                  onChange={(e) => setEditScenarioForm((f) => ({ ...f, order: e.target.value }))}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleSaveScenario} disabled={savingScenario} className="gap-1">
                                  {savingScenario && <Loader2 className="h-3 w-3 animate-spin" />}
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditScenarioMode(false)}>
                                  Cancel
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Test cases list */}
                        {loadingTestCases ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                          </div>
                        ) : testCases.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border rounded-lg">
                            <FileText className="h-8 w-8 mb-2 opacity-30" aria-hidden="true" />
                            <p className="text-sm">No test cases yet. Add the first one.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {testCases.map((tc) => {
                              const expanded = expandedTCs.has(tc._id);
                              const pass = tc.results.filter((r) => r.status === "pass").length;
                              const fail = tc.results.filter((r) => r.status === "fail").length;
                              const skip = tc.results.filter((r) => r.status === "skip").length;
                              const pending = Math.max(0, activeTesters.length - (pass + fail + skip));

                              return (
                                <div key={tc._id} className="border rounded-lg overflow-hidden">
                                  <div className="flex items-center gap-2 p-3">
                                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                                    <Badge variant="outline" className="text-xs shrink-0">#{tc.order + 1}</Badge>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium">{tc.title}</p>
                                        <Badge className={cn("text-xs", getPriorityBadgeClass(tc.priority))}>
                                          {tc.priority}
                                        </Badge>
                                      </div>
                                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                        <span className="flex items-center gap-1">
                                          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                                          Pass {pass}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                                          Fail {fail}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
                                          Skip {skip}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <span className="inline-block w-2 h-2 rounded-full bg-slate-200 border border-slate-300" />
                                          Pending {pending}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => openEditTC(tc)}
                                        aria-label="Edit test case"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                        onClick={() => setDeleteTCId(tc._id)}
                                        aria-label="Delete test case"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => toggleExpandTC(tc._id)}
                                        aria-label={expanded ? "Collapse" : "Expand"}
                                      >
                                        {expanded
                                          ? <ChevronUp className="h-3 w-3" />
                                          : <ChevronDown className="h-3 w-3" />}
                                      </Button>
                                    </div>
                                  </div>

                                  {expanded && (
                                    <div className="border-t px-4 py-3 space-y-3 bg-muted/30 text-sm">
                                      {tc.description && (
                                        <div>
                                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                            Description
                                          </p>
                                          <p className="whitespace-pre-wrap">{tc.description}</p>
                                        </div>
                                      )}
                                      {tc.steps.length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                            Steps
                                          </p>
                                          <ol className="space-y-1 list-decimal list-inside">
                                            {tc.steps.map((step, idx) => (
                                              <li key={idx} className="text-sm">{step.instruction}</li>
                                            ))}
                                          </ol>
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                          Expected Result
                                        </p>
                                        <p className="whitespace-pre-wrap">{tc.expectedResult}</p>
                                      </div>

                                      {tc.results.length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                            Tester Results
                                          </p>
                                          <div className="space-y-3">
                                            {tc.results.map((result, rIdx) => {
                                              const testerInfo = testerMap[result.testerId]
                                              const testerName = testerInfo
                                                ? `${testerInfo.firstName ?? ""} ${testerInfo.lastName ?? ""}`.trim() || testerInfo.email || result.testerId
                                                : result.testerId

                                              return (
                                                <div key={rIdx} className="border rounded-lg p-3 space-y-2">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-medium">{testerName}</span>
                                                    <Badge className={cn("text-xs", {
                                                      "bg-green-100 text-green-700": result.status === "pass",
                                                      "bg-red-100 text-red-700": result.status === "fail",
                                                      "bg-yellow-100 text-yellow-700": result.status === "skip",
                                                      "bg-gray-100 text-gray-600": result.status === "pending",
                                                    })}>
                                                      {result.status}
                                                    </Badge>
                                                    {result.testedAt && (
                                                      <span className="text-xs text-muted-foreground">{fmtDate(result.testedAt)}</span>
                                                    )}
                                                  </div>

                                                  {result.note && (
                                                    <p className="text-xs text-muted-foreground italic">{result.note}</p>
                                                  )}

                                                  {(result.attachments ?? []).length > 0 && (
                                                    <div className="space-y-1.5">
                                                      {result.attachments.map((att, aIdx) => {
                                                        const isImage = att.type?.startsWith("image/")
                                                        const isVideo = att.type?.startsWith("video/")
                                                        return (
                                                          <div key={aIdx} className="border rounded overflow-hidden">
                                                            {isImage && att.url && (
                                                              <a href={att.url} target="_blank" rel="noopener noreferrer">
                                                                <img src={att.url} alt={att.name} className="w-full max-h-40 object-cover" loading="lazy" />
                                                              </a>
                                                            )}
                                                            {isVideo && att.url && (
                                                              <video src={att.url} controls className="w-full max-h-40" preload="metadata" />
                                                            )}
                                                            <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 text-xs">
                                                              <span className="flex-1 truncate">{att.name}</span>
                                                              {att.url && (
                                                                <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline shrink-0">
                                                                  Open
                                                                </a>
                                                              )}
                                                            </div>
                                                          </div>
                                                        )
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Scenario Dialog */}
                <Dialog open={addScenarioOpen} onOpenChange={(open) => { setAddScenarioOpen(open); if (!open) { setAddScenarioError(""); setAddScenarioForm({ ...DEFAULT_SCENARIO_FORM }); } }}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Scenario</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1">
                        <Label htmlFor="add-sc-title">Title *</Label>
                        <Input
                          id="add-sc-title"
                          placeholder="Scenario title"
                          value={addScenarioForm.title}
                          onChange={(e) => setAddScenarioForm((f) => ({ ...f, title: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="add-sc-desc">Description</Label>
                        <Textarea
                          id="add-sc-desc"
                          placeholder="Optional description"
                          value={addScenarioForm.description}
                          onChange={(e) => setAddScenarioForm((f) => ({ ...f, description: e.target.value }))}
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="add-sc-tester">Assigned Tester *</Label>
                        <Select
                          value={addScenarioForm.assignedTesterId}
                          onValueChange={(v) => setAddScenarioForm((f) => ({ ...f, assignedTesterId: v }))}
                        >
                          <SelectTrigger id="add-sc-tester">
                            <SelectValue placeholder="Select a tester…" />
                          </SelectTrigger>
                          <SelectContent>
                            {testers.length === 0 && (
                              <SelectItem value="__none__" disabled>No active testers found</SelectItem>
                            )}
                            {testers.map((t) => (
                              <SelectItem key={t.clerkUserId} value={t.clerkUserId}>
                                {testerDisplayName(t, t.clerkUserId)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="add-sc-order">Order (optional)</Label>
                        <Input
                          id="add-sc-order"
                          type="number"
                          placeholder="Auto-assigned if empty"
                          value={addScenarioForm.order}
                          onChange={(e) => setAddScenarioForm((f) => ({ ...f, order: e.target.value }))}
                        />
                      </div>
                      {addScenarioError && (
                        <p className="text-sm text-destructive">{addScenarioError}</p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddScenarioOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddScenario} disabled={addingScenario} className="gap-2">
                        {addingScenario && <Loader2 className="h-4 w-4 animate-spin" />}
                        Create Scenario
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Delete Scenario Confirmation */}
                <AlertDialog open={!!deleteScenarioId} onOpenChange={(open) => { if (!open) setDeleteScenarioId(null); }}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the scenario and all its test cases. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => { if (deleteScenarioId) handleDeleteScenario(deleteScenarioId); }}
                        disabled={deletingScenario}
                      >
                        {deletingScenario ? "Deleting…" : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Delete Test Case Confirmation */}
                <AlertDialog open={!!deleteTCId} onOpenChange={(open) => { if (!open) setDeleteTCId(null); }}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Test Case</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the test case and all tester results associated with it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => { if (deleteTCId) handleDeleteTC(deleteTCId); }}
                        disabled={deletingTC}
                      >
                        {deletingTC ? "Deleting…" : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Add / Edit Test Case Sheet */}
                <Sheet open={addTCOpen} onOpenChange={(open) => { setAddTCOpen(open); if (!open) { setEditTC(null); setTCFormError(""); } }}>
                  <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                    <SheetHeader className="mb-4">
                      <SheetTitle>{editTC ? "Edit Test Case" : "Add Test Case"}</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="tc-title">Title *</Label>
                        <Input
                          id="tc-title"
                          placeholder="Test case title"
                          value={tcForm.title}
                          onChange={(e) => setTCForm((f) => ({ ...f, title: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="tc-desc">Description</Label>
                        <Textarea
                          id="tc-desc"
                          placeholder="Optional description"
                          value={tcForm.description}
                          onChange={(e) => setTCForm((f) => ({ ...f, description: e.target.value }))}
                          rows={2}
                          className="resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="tc-priority">Priority</Label>
                          <Select
                            value={tcForm.priority}
                            onValueChange={(v) => setTCForm((f) => ({ ...f, priority: v as TCFormState["priority"] }))}
                          >
                            <SelectTrigger id="tc-priority"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="tc-order">Order (optional)</Label>
                          <Input
                            id="tc-order"
                            type="number"
                            placeholder="Auto"
                            value={tcForm.order}
                            onChange={(e) => setTCForm((f) => ({ ...f, order: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="tc-expected">Expected Result *</Label>
                        <Textarea
                          id="tc-expected"
                          placeholder="What should happen after executing the steps"
                          value={tcForm.expectedResult}
                          onChange={(e) => setTCForm((f) => ({ ...f, expectedResult: e.target.value }))}
                          rows={3}
                          className="resize-none"
                        />
                      </div>

                      {/* Steps editor */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Steps</Label>
                          <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={addStep}>
                            <Plus className="h-3 w-3" />
                            Add Step
                          </Button>
                        </div>
                        {tcForm.steps.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No steps added yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {tcForm.steps.map((step, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">{idx + 1}.</span>
                                <Input
                                  value={step.instruction}
                                  onChange={(e) => updateStepInstruction(idx, e.target.value)}
                                  placeholder={`Step ${idx + 1} instruction`}
                                  className="flex-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0"
                                  onClick={() => moveStep(idx, "up")}
                                  disabled={idx === 0}
                                  aria-label="Move step up"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0"
                                  onClick={() => moveStep(idx, "down")}
                                  disabled={idx === tcForm.steps.length - 1}
                                  aria-label="Move step down"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10"
                                  onClick={() => removeStep(idx)}
                                  aria-label="Remove step"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {tcFormError && (
                        <p className="text-sm text-destructive">{tcFormError}</p>
                      )}
                    </div>

                    <SheetFooter className="mt-6">
                      <Button variant="outline" onClick={() => setAddTCOpen(false)}>Cancel</Button>
                      <Button onClick={handleSubmitTC} disabled={submittingTC} className="gap-2">
                        {submittingTC && <Loader2 className="h-4 w-4 animate-spin" />}
                        {editTC ? "Save Changes" : "Create Test Case"}
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </TabsContent>

              {/* ─── Timeline Tab ─────────────────────────────────────────── */}
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

              {/* ─── Notes Tab ────────────────────────────────────────────── */}
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
