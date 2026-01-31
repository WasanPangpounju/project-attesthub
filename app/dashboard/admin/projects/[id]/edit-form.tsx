"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

type ProjectStatus = "pending" | "open" | "in_review" | "scheduled" | "completed" | "cancelled";
type ServicePackage = "automated" | "hybrid" | "expert";

interface AuditRequest {
  _id: string;
  customerId: string;
  projectName: string;
  status: ProjectStatus;
  servicePackage: ServicePackage;
  priority?: "low" | "normal" | "high" | "urgent";
  dueDate?: string;
  adminNotes?: string;
  priceAmount: number;
  priceCurrency: "THB" | "USD";
  priceNote?: string;
  aiConfidence?: number;
  aiReportStatus?: "none" | "generated" | "validated" | "rejected";
  [key: string]: any;
}

interface EditProjectFormProps {
  project: AuditRequest;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditProjectForm({ project, onSuccess, onCancel }: EditProjectFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectName: project.projectName || "",
    status: project.status || "pending",
    priority: project.priority || "normal",
    dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split("T")[0] : "",
    adminNotes: project.adminNotes || "",
    priceAmount: (project.priceAmount / 100).toFixed(2),
    priceCurrency: project.priceCurrency || "THB",
    priceNote: project.priceNote || "",
    aiConfidence: project.aiConfidence ? (project.aiConfidence * 100).toFixed(0) : "0",
    aiReportStatus: project.aiReportStatus || "none",
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        projectName: formData.projectName,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        adminNotes: formData.adminNotes,
        priceAmount: Math.round(parseFloat(formData.priceAmount) * 100),
        priceCurrency: formData.priceCurrency,
        priceNote: formData.priceNote,
        aiConfidence: parseInt(formData.aiConfidence) / 100,
        aiReportStatus: formData.aiReportStatus,
      };

      const res = await fetch(`/api/audit-requests/${project._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update project");
      }

      toast.success("Project updated successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to update project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Project Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={formData.projectName}
              onChange={(e) => handleChange("projectName", e.target.value)}
              placeholder="Project name"
            />
          </div>

          {/* Status, Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(val) => handleChange("status", val)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(val) => handleChange("priority", val)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleChange("dueDate", e.target.value)}
            />
          </div>

          {/* Pricing */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <p className="font-semibold text-sm">Pricing Information</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceAmount">Amount</Label>
                <Input
                  id="priceAmount"
                  type="number"
                  step="0.01"
                  value={formData.priceAmount}
                  onChange={(e) => handleChange("priceAmount", e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceCurrency">Currency</Label>
                <Select value={formData.priceCurrency} onValueChange={(val) => handleChange("priceCurrency", val)}>
                  <SelectTrigger id="priceCurrency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="THB">THB</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceAmount" className="text-xs text-muted-foreground">
                  Calculated
                </Label>
                <div className="flex items-center h-10 px-3 rounded-md border border-input bg-background">
                  <span className="font-semibold">
                    {parseFloat(formData.priceAmount).toFixed(2)} {formData.priceCurrency}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceNote">Price Note</Label>
              <Textarea
                id="priceNote"
                value={formData.priceNote}
                onChange={(e) => handleChange("priceNote", e.target.value)}
                placeholder="Additional pricing details or scope notes..."
                rows={3}
              />
            </div>
          </div>

          {/* AI Report */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <p className="font-semibold text-sm">AI Report Settings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aiConfidence">AI Confidence (%)</Label>
                <Input
                  id="aiConfidence"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.aiConfidence}
                  onChange={(e) => handleChange("aiConfidence", e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aiReportStatus">Report Status</Label>
                <Select
                  value={formData.aiReportStatus}
                  onValueChange={(val) => handleChange("aiReportStatus", val)}
                >
                  <SelectTrigger id="aiReportStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="generated">Generated</SelectItem>
                    <SelectItem value="validated">Validated</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="adminNotes">Admin Notes</Label>
            <Textarea
              id="adminNotes"
              value={formData.adminNotes}
              onChange={(e) => handleChange("adminNotes", e.target.value)}
              placeholder="Add any internal notes for this project..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
