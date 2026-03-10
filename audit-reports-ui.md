# AttestHub — AI Audit Reports UI (Mock Data Phase)

## Overview
สร้าง UI สำหรับ AI Audit Reports โดยใช้ mock data ก่อน
ใช้ axe-core เป็น scan engine (wire จริงใน phase ถัดไป)

## Stack
Next.js 14 App Router · TypeScript · Tailwind · shadcn/ui · Recharts (chart)

## Run Order
```
Step 1 → Step 2 → Step 3 → Step 4 → Step 5
```

---

## Step 1 — Types + Mock Data

```
สร้างไฟล์ต่อไปนี้:

--- lib/types/audit-report.ts ---
export type WcagLevel = "A" | "AA" | "AAA"
export type ScanType = "single" | "full_site"
export type ReportStatus = "pending" | "scanning" | "completed" | "failed"
export type IssueSeverity = "critical" | "serious" | "moderate" | "minor"

export interface AuditIssue {
  id: string
  severity: IssueSeverity
  wcagCriteria: string        // เช่น "1.1.1", "4.1.2"
  wcagTitle: string           // เช่น "Non-text Content"
  element: string             // HTML snippet
  description: string
  recommendation: string
  pageUrl?: string            // สำหรับ full_site scan
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
  score: number               // 0–100
  wcagLevel: WcagLevel
  summary: AuditSummary
  issues: AuditIssue[]
  generatedAt: string         // ISO date string
  requestedBy: string         // userId
}

--- lib/mock/audit-reports.ts ---
สร้าง mockReports: AuditReport[] จำนวน 5 รายการ ครอบคลุม:
- report ที่ score สูง (85+) และต่ำ (50-)
- scanType ทั้ง "single" และ "full_site"
- status ครบ: "completed" x3, "scanning" x1, "failed" x1
- issues ครอบคลุมทุก severity (critical, serious, moderate, minor)
- wcagCriteria ที่พบบ่อย: 1.1.1, 1.3.1, 2.4.3, 3.3.2, 4.1.2
- projectName และ url ที่ดูสมจริง (เช่น "ธนาคารกสิกรไทย", "https://kbank.co.th")
```

---

## Step 2 — Report List Page

```
สร้าง app/dashboard/reports/page.tsx

Requirements:
- "use client"
- ดึงข้อมูลจาก mockReports (import จาก lib/mock/audit-reports.ts)
- ถ้า role === "customer" → filter เฉพาะ requestedBy === currentUserId
  (ตอนนี้ mock ได้เลย ใช้ useUser() จาก Clerk)
- ถ้า role === "admin" หรือ "tester" → แสดงทั้งหมด

Layout:
┌─────────────────────────────────────────┐
│  AI Audit Reports          [+ New Scan] │  ← ปุ่ม New Scan เฉพาะ admin/tester
├─────────────────────────────────────────┤
│  🔍 Search URL...  [Status ▼] [WCAG ▼]  │  ← filter bar
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │ 🌐 kbank.co.th          Score: 85  ││
│  │ Full Site · AA · 2026-02-20  [View] ││
│  └─────────────────────────────────────┘│
│  (ReportCard × N)                       │
└─────────────────────────────────────────┘

ReportCard แสดง:
- project name + URL
- scanType badge (Single Page / Full Site)
- status badge (สี: completed=green, scanning=blue/animate, failed=red, pending=gray)
- score: circular progress หรือ badge สี (≥80=green, 60-79=yellow, <60=red)
- wcagLevel badge
- generatedAt (format วันที่ไทย/อังกฤษตาม locale)
- ปุ่ม "View Report" → /dashboard/reports/[id]

Filter:
- search: กรอง url หรือ projectName
- status dropdown: All / Completed / Scanning / Failed / Pending
- wcagLevel dropdown: All / A / AA / AAA

ใช้ shadcn/ui: Card, Badge, Button, Input, Select
```

---

## Step 3 — Report Detail Page

```
สร้าง app/dashboard/reports/[id]/page.tsx

ดึงข้อมูลจาก mockReports.find(r => r.id === params.id)
ถ้าไม่เจอ → notFound()

Layout 3 ส่วน:

─── ส่วนที่ 1: Header + Score ───
┌──────────────────────────────────────────────┐
│ ← Back    kbank.co.th                        │
│           Full Site Scan · 2026-02-20        │
│                                              │
│  ┌──────────┐  Passed: 42   Failed: 8        │
│  │   85     │  Warnings: 5  Total: 55        │
│  │  /100    │                                │
│  └──────────┘  WCAG Level: AA    [Export ▼]  │
└──────────────────────────────────────────────┘

─── ส่วนที่ 2: Summary Chart ───
Bar chart หรือ Donut chart แสดงสัดส่วน passed/failed/warnings
ใช้ Recharts

─── ส่วนที่ 3: Issues Table ───
┌─────────────────────────────────────────────────┐
│ Issues (8)    [Severity ▼] [WCAG ▼] [🔍 Search] │
├──────────┬──────────┬───────────────────────────┤
│ Severity │ WCAG     │ Description               │
├──────────┼──────────┼───────────────────────────┤
│ 🔴Critical│ 1.1.1   │ Image missing alt text... │
│          │          │ <img src="..."/>           │
│          │          │ 💡 Add descriptive alt... │
└──────────┴──────────┴───────────────────────────┘

Issue row แสดง:
- severity badge (critical=red, serious=orange, moderate=yellow, minor=blue)
- wcagCriteria + wcagTitle
- element (monospace, truncate ถ้ายาว)
- description
- recommendation (สี muted, icon 💡)
- ถ้า full_site → แสดง pageUrl ด้วย

Filter issues:
- severity dropdown
- wcagCriteria search/filter
- text search ใน description

ใช้ shadcn/ui: Table, Badge, Button, Select, Input
ใช้ Recharts: PieChart หรือ BarChart
```

---

## Step 4 — Export Button (PDF + CSV)

```
สร้าง components/reports/ExportButton.tsx

"use client"
Props: report: AuditReport

UI: shadcn DropdownMenu
┌─────────────┐
│ Export ▼    │
├─────────────┤
│ 📄 PDF      │
│ 📊 CSV      │
└─────────────┘

CSV export:
- ใช้ native JS สร้าง CSV string จาก report.issues
- columns: Severity, WCAG Criteria, WCAG Title, Description, Recommendation, Element, Page URL
- filename: attesthub-report-[id]-[date].csv
- trigger download ด้วย URL.createObjectURL + <a> click

PDF export:
- ตอนนี้ให้ใช้ window.print() + print stylesheet (CSS @media print)
- แสดง toast "กำลังเตรียม PDF..." ก่อน print
- (จะ upgrade เป็น puppeteer/playwright ใน phase 2)

ใช้ shadcn/ui: DropdownMenu, Button
ใช้ sonner หรือ shadcn toast สำหรับ notification
```

---

## Step 5 — Navigation + RoleGuard

```
เชื่อม Report pages เข้ากับ navigation ที่มีอยู่

1. app/dashboard/reports/page.tsx
   - ครอบด้วย RoleGuard allowedRoles={["admin", "tester", "customer"]}
   - ใช้ DashboardLayout หรือ layout ที่เหมาะกับ role

2. เพิ่ม nav link ใน sidebar/layout ของแต่ละ role:

   Admin (app/dashboard/admin/page.tsx → navItems):
   - "AI Audit Reports" href="/dashboard/reports" มีอยู่แล้ว → ตรวจว่า href ถูกต้อง

   Tester (components/dashboard-layout.tsx → navigationItems):
   - เพิ่ม { name: "Audit Reports", href: "/dashboard/reports", icon: FileBarChart }

   Customer (components/dashboard-sidebar.tsx):
   - เพิ่ม { title: "My Reports", href: "/dashboard/reports", icon: FileBarChart }

3. import FileBarChart จาก lucide-react ในทุกไฟล์ที่เพิ่ม

4. ตรวจสอบ app/dashboard/reports/[id]/page.tsx:
   - ถ้า role === "customer" → ตรวจว่า report.requestedBy === userId ก่อนแสดง
   - ถ้าไม่ใช่ → redirect ไป /dashboard/reports
```

---

## หมายเหตุ Phase ถัดไป (ยังไม่ต้องทำตอนนี้)

- **Backend model**: `models/AuditReport.ts` + MongoDB
- **API routes**: GET/POST `/api/audit-reports`
- **axe-core integration**: `lib/scanner/axe-runner.ts` รัน scan จริง
- **Replace mock**: แทน mockReports ด้วย fetch จาก API
- **PDF จริง**: ใช้ `@react-pdf/renderer` หรือ puppeteer
