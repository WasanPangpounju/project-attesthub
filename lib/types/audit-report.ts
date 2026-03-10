export type WcagLevel = "A" | "AA" | "AAA"
export type ScanType = "single" | "full_site"
export type ReportStatus = "pending" | "scanning" | "completed" | "failed"
export type IssueSeverity = "critical" | "serious" | "moderate" | "minor"

export interface AuditIssue {
  id: string
  severity: IssueSeverity
  wcagCriteria: string
  wcagTitle: string
  element: string
  description: string
  recommendation: string
  pageUrl?: string
}

export interface AuditSummary {
  passed: number
  failed: number
  warnings: number
  total: number
}

export interface AuditReport {
  id: string
  auditRequestId: string
  projectName: string
  url: string
  scanType: ScanType
  status: ReportStatus
  score: number
  wcagLevel: WcagLevel
  summary: AuditSummary
  issues: AuditIssue[]
  pagesScanned: number
  scanDurationMs: number
  errorMessage?: string
  generatedAt: string
  requestedBy: string
}
