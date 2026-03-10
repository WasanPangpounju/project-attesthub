"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AuditReport } from "@/lib/types/audit-report"
import { FileText, BarChart2, ChevronDown } from "lucide-react"

interface ExportButtonProps {
  report: AuditReport
}

export function ExportButton({ report }: ExportButtonProps) {
  function exportCSV() {
    const headers = [
      "Severity",
      "WCAG Criteria",
      "WCAG Title",
      "Description",
      "Recommendation",
      "Element",
      "Page URL",
    ]

    const rows = report.issues.map((issue) => [
      issue.severity,
      issue.wcagCriteria,
      issue.wcagTitle,
      issue.description,
      issue.recommendation,
      issue.element,
      issue.pageUrl ?? "",
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const date = new Date().toISOString().split("T")[0]
    const filename = `attesthub-report-${report.id}-${date}.csv`

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    toast.success(`Downloaded ${filename}`)
  }

  function exportPDF() {
    toast("กำลังเตรียม PDF...")
    setTimeout(() => window.print(), 300)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          Export
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportPDF} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCSV} className="gap-2 cursor-pointer">
          <BarChart2 className="h-4 w-4" />
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
