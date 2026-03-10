# AttestHub — AI Audit Scanner (Playwright + axe-core + BullMQ)

## Overview
Wire axe-core scan engine เข้ากับ Playwright crawler
Admin trigger scan จาก Audit Request, Worker รันแยกใน Docker

## Stack
Next.js 14 · MongoDB · BullMQ + Redis · Playwright · axe-core · Docker · TypeScript

## Architecture
```
Next.js → BullMQ (Redis) → Scanner Worker (Docker)
                                    ↓
                          Playwright login + crawl
                                    ↓
                          axe-core inject ทุกหน้า
                                    ↓
                          save AuditReport → MongoDB
```

## Run Order
```
Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Step 6 → Step 7
```

---

## Step 1 — เพิ่ม Fields ใน AuditRequest Model + Form

```
แก้ไข models/AuditRequest.ts (หรือชื่อจริงใน codebase) เพิ่ม fields:

Interface เพิ่ม:
  loginRequired?: boolean
  loginUrl?: string
  loginCredentials?: {
    usernameField?: string   // CSS selector เช่น "#username" หรือ "input[name=email]"
    passwordField?: string   // CSS selector เช่น "#password"
    submitSelector?: string  // CSS selector ของปุ่ม submit เช่น "button[type=submit]"
    username?: string
    encryptedPassword?: string  // เก็บ encrypted ด้วย AES-256
  }
  submitRequired?: boolean
  submitSteps?: {
    selector: string
    action: "click" | "fill"
    value?: string
  }[]
  scanScope: "single" | "full_site"  // default "single"
  maxPages?: number  // default 50 สำหรับ full_site
  scheduleEnabled?: boolean
  scheduleCron?: string  // เช่น "0 2 * * 1" = ทุก จันทร์ 02:00

Schema เพิ่ม (Mongoose):
  loginRequired: { type: Boolean, default: false }
  loginUrl: { type: String }
  loginCredentials: {
    usernameField: { type: String, default: 'input[name="email"]' },
    passwordField: { type: String, default: 'input[name="password"]' },
    submitSelector: { type: String, default: 'button[type="submit"]' },
    username: { type: String },
    encryptedPassword: { type: String },
  }
  submitRequired: { type: Boolean, default: false }
  submitSteps: [{ selector: String, action: String, value: String }]
  scanScope: { type: String, enum: ["single", "full_site"], default: "single" }
  maxPages: { type: Number, default: 50 }
  scheduleEnabled: { type: Boolean, default: false }
  scheduleCron: { type: String }

แก้ไข Customer Audit Request Form (หาไฟล์ form จาก codebase):
เพิ่ม section "Scan Configuration" ต่อท้าย form:

Section: Scan Scope
- Radio: "Single Page" / "Full Site" → scanScope
- ถ้า Full Site → input "Max Pages (default 50)" → maxPages

Section: Login Configuration (toggle ถ้า loginRequired = true)
- Checkbox "Website requires login" → loginRequired
- ถ้าเปิด:
  - Input "Login URL" → loginUrl
  - Input "Username/Email" → username
  - Input "Password" (type=password) → password (จะ encrypt ก่อน save)
  - Input "Username field selector" placeholder='input[name="email"]' → usernameField
  - Input "Password field selector" placeholder='input[name="password"]' → passwordField
  - Input "Submit button selector" placeholder='button[type="submit"]' → submitSelector

Section: Schedule (admin-only section ซ่อนจาก customer)
- Checkbox "Enable scheduled scan" → scheduleEnabled
- ถ้าเปิด → Input "Cron expression" เช่น "0 2 * * 1"

API: เมื่อ form submit ให้ encrypt password ก่อน save:
- ใช้ crypto module ใน Node.js: AES-256-CBC
- key จาก process.env.ENCRYPTION_KEY (32 bytes hex)
- เก็บ iv + encrypted ใน encryptedPassword field เป็น "iv:encrypted" format
- อย่า log หรือ return password กลับไป client
```

---

## Step 2 — AuditReport Model (MongoDB)

```
สร้าง models/AuditReport.ts

Interface:
export interface IAuditReport {
  _id: string
  auditRequestId: string        // ref AuditRequest
  projectName: string
  url: string
  scanScope: "single" | "full_site"
  status: "pending" | "scanning" | "completed" | "failed"
  score: number                 // 0-100
  wcagLevel: "A" | "AA" | "AAA"
  summary: {
    passed: number
    failed: number
    warnings: number
    total: number
  }
  issues: {
    id: string
    severity: "critical" | "serious" | "moderate" | "minor"
    wcagCriteria: string
    wcagTitle: string
    element: string
    description: string
    recommendation: string
    pageUrl: string
    impact: string
  }[]
  pagesScanned: number
  scanDurationMs: number
  errorMessage?: string         // ถ้า failed
  jobId?: string                // BullMQ job id
  requestedBy: string           // clerkUserId
  generatedAt: Date
  completedAt?: Date
}

Mongoose Schema:
- issues เป็น array ของ subdocument
- index บน auditRequestId และ requestedBy
- timestamps: true
```

---

## Step 3 — BullMQ Queue Setup (Next.js side)

```
ติดตั้ง packages ก่อน:
npm install bullmq ioredis

สร้าง lib/queue/scanQueue.ts:

import { Queue } from "bullmq"
import IORedis from "ioredis"

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

export const scanQueue = new Queue("audit-scan", { connection })

export interface ScanJobData {
  auditRequestId: string
  reportId: string           // AuditReport _id ที่สร้างไว้แล้ว
}

สร้าง app/api/admin/scan/start/route.ts:

POST handler:
1. auth() → ตรวจ role === "admin" ถ้าไม่ใช่ return 403
2. รับ body { auditRequestId }
3. ดึง AuditRequest จาก DB → ตรวจว่ามีจริง
4. สร้าง AuditReport ใหม่ { status: "pending", auditRequestId, ... }
5. เพิ่ม job เข้า scanQueue:
   await scanQueue.add("scan", { auditRequestId, reportId: report._id }, {
     attempts: 3,
     backoff: { type: "exponential", delay: 5000 },
   })
6. return { reportId, jobId }

สร้าง app/api/admin/scan/[jobId]/status/route.ts:

GET handler:
1. auth() → admin only
2. ดึง job จาก scanQueue.getJob(jobId)
3. return { status: job.state, progress: job.progress, reportId }

สร้าง app/api/admin/scan/schedule/route.ts:

POST handler รับ { auditRequestId, cronExpression }:
1. validate cronExpression ด้วย regex
2. update AuditRequest { scheduleEnabled: true, scheduleCron: cronExpression }
3. return { message: "Schedule saved" }
(Worker จะ poll และรัน schedule เอง)
```

---

## Step 4 — Scanner Worker Service

```
สร้าง folder ใหม่ชื่อ scanner-worker/ ใน root ของ project (ข้าง project-attesthub/)

--- scanner-worker/package.json ---
{
  "name": "attesthub-scanner-worker",
  "version": "1.0.0",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "playwright": "^1.44.0",
    "@axe-core/playwright": "^4.9.0",
    "bullmq": "^5.0.0",
    "ioredis": "^5.0.0",
    "mongoose": "^8.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.0.0",
    "@types/node": "^20.0.0"
  }
}

--- scanner-worker/src/index.ts ---
Worker entry point:

import { Worker, Job } from "bullmq"
import IORedis from "ioredis"
import mongoose from "mongoose"
import { runScan } from "./crawler"
import { ScanJobData } from "./types"

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

// Connect MongoDB
await mongoose.connect(process.env.MONGODB_URI!)

const worker = new Worker<ScanJobData>("audit-scan", async (job: Job<ScanJobData>) => {
  console.log(`[Worker] Starting job ${job.id} for report ${job.data.reportId}`)
  await job.updateProgress(0)
  await runScan(job)
}, { connection, concurrency: 2 })

worker.on("completed", job => console.log(`[Worker] Job ${job.id} completed`))
worker.on("failed", (job, err) => console.error(`[Worker] Job ${job?.id} failed:`, err))

// Schedule poller: ตรวจ AuditRequest ที่ scheduleEnabled ทุก 5 นาที
setInterval(async () => {
  const { checkSchedules } = await import("./scheduler")
  await checkSchedules()
}, 5 * 60 * 1000)

--- scanner-worker/src/crawler.ts ---
Playwright crawler:

import { chromium } from "playwright"
import { Job } from "bullmq"
import { AxeBuilder } from "@axe-core/playwright"
import { saveResults } from "./scanner"
import { ScanJobData } from "./types"
import { decryptPassword } from "./crypto"

export async function runScan(job: Job<ScanJobData>) {
  const { auditRequestId, reportId } = job.data
  
  // 1. ดึง AuditRequest + AuditReport จาก DB
  // (import models จาก shared models หรือ define ซ้ำใน worker)
  const request = await AuditRequest.findById(auditRequestId)
  await AuditReport.findByIdAndUpdate(reportId, { status: "scanning" })
  
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // 2. Login ถ้าจำเป็น
    if (request.loginRequired && request.loginCredentials) {
      const { loginUrl, loginCredentials } = request
      const password = decryptPassword(loginCredentials.encryptedPassword)
      
      await page.goto(loginUrl)
      await page.fill(loginCredentials.usernameField, loginCredentials.username)
      await page.fill(loginCredentials.passwordField, password)
      await page.click(loginCredentials.submitSelector)
      await page.waitForLoadState("networkidle")
    }
    
    // 3. Crawl pages
    const pagesToScan: string[] = [request.url]
    const visited = new Set<string>()
    const allIssues = []
    
    if (request.scanScope === "full_site") {
      // collect links จาก sitemap หรือ crawl
      const discovered = await discoverPages(page, request.url, request.maxPages ?? 50)
      pagesToScan.push(...discovered)
    }
    
    // 4. Scan ทุกหน้าด้วย axe-core
    for (let i = 0; i < pagesToScan.length; i++) {
      const url = pagesToScan[i]
      if (visited.has(url)) continue
      visited.add(url)
      
      await page.goto(url, { waitUntil: "networkidle" })
      
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
      
      // map violations → AuditIssue format
      for (const violation of results.violations) {
        for (const node of violation.nodes) {
          allIssues.push({
            id: `${violation.id}-${node.target[0]}`,
            severity: violation.impact as any,
            wcagCriteria: violation.tags.find(t => t.match(/wcag\d+\.\d+\.\d+/))?.replace("wcag","") ?? "",
            wcagTitle: violation.description,
            element: node.html,
            description: node.failureSummary ?? violation.description,
            recommendation: violation.helpUrl,
            pageUrl: url,
            impact: violation.impact ?? "minor",
          })
        }
      }
      
      // update progress
      await job.updateProgress(Math.round(((i + 1) / pagesToScan.length) * 100))
    }
    
    // 5. คำนวณ score และ save
    await saveResults(reportId, allIssues, pagesToScan.length)
    
  } finally {
    await browser.close()
  }
}

async function discoverPages(page: any, baseUrl: string, maxPages: number): Promise<string[]> {
  // 1. ลอง fetch /sitemap.xml ก่อน
  // 2. ถ้าไม่มี → ดึง links ทั้งหมดจาก homepage ที่ตรงกับ base domain
  // return array ของ URLs ไม่เกิน maxPages
  const base = new URL(baseUrl)
  const links = await page.evaluate((origin: string) => {
    return Array.from(document.querySelectorAll("a[href]"))
      .map((a: any) => a.href)
      .filter((href: string) => href.startsWith(origin))
  }, base.origin)
  
  return [...new Set(links)].slice(0, maxPages)
}

--- scanner-worker/src/scanner.ts ---
Score calculation + save:

export async function saveResults(reportId: string, issues: any[], pagesScanned: number) {
  // คำนวณ score: เริ่มจาก 100 หักตาม severity
  // critical: -10, serious: -5, moderate: -2, minor: -1
  const deductions = issues.reduce((acc, issue) => {
    const weights = { critical: 10, serious: 5, moderate: 2, minor: 1 }
    return acc + (weights[issue.severity as keyof typeof weights] ?? 1)
  }, 0)
  
  const score = Math.max(0, Math.min(100, 100 - deductions))
  
  // determine WCAG level
  const hasCritical = issues.some(i => i.severity === "critical")
  const hasSerious = issues.some(i => i.severity === "serious")
  const wcagLevel = hasCritical ? "A" : hasSerious ? "AA" : "AAA"
  
  const summary = {
    failed: issues.length,
    passed: Math.round(issues.length * (score / 100)),
    warnings: issues.filter(i => i.severity === "moderate").length,
    total: issues.length + Math.round(issues.length * (score / 100)),
  }
  
  await AuditReport.findByIdAndUpdate(reportId, {
    status: "completed",
    score,
    wcagLevel,
    summary,
    issues,
    pagesScanned,
    completedAt: new Date(),
  })
}

--- scanner-worker/src/crypto.ts ---
Password decrypt:

import crypto from "crypto"

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex") // 32 bytes

export function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()])
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`
}

export function decryptPassword(encryptedPassword: string): string {
  const [ivHex, encryptedHex] = encryptedPassword.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const encrypted = Buffer.from(encryptedHex, "hex")
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}

--- scanner-worker/src/scheduler.ts ---
Schedule poller:

export async function checkSchedules() {
  const now = new Date()
  const requests = await AuditRequest.find({ scheduleEnabled: true, scheduleCron: { $exists: true } })
  
  for (const req of requests) {
    if (shouldRunNow(req.scheduleCron, now)) {
      // สร้าง AuditReport และ add job
      const report = await AuditReport.create({ auditRequestId: req._id, status: "pending", ... })
      await scanQueue.add("scan", { auditRequestId: req._id, reportId: report._id })
    }
  }
}

function shouldRunNow(cron: string, now: Date): boolean {
  // parse cron "0 2 * * 1" และเทียบกับ now
  // ใช้ logic simple: เปรียบเทียบ minute, hour, dayOfWeek
  // ถ้าตรงกัน return true
}
```

---

## Step 5 — Docker Setup

```
สร้างไฟล์ต่อไปนี้ใน scanner-worker/:

--- scanner-worker/Dockerfile ---
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Install Playwright browsers
RUN npx playwright install chromium --with-deps

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]

--- docker-compose.yml (วางที่ root ข้าง project-attesthub/) ---
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  scanner-worker:
    build: ./scanner-worker
    environment:
      - REDIS_URL=redis://redis:6379
      - MONGODB_URI=${MONGODB_URI}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      - redis
    restart: unless-stopped
    deploy:
      replicas: 2  # รัน 2 worker พร้อมกัน

volumes:
  redis-data:

--- scanner-worker/.env.example ---
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb+srv://...
ENCRYPTION_KEY=<32-bytes-hex-string>

เพิ่มใน project-attesthub/.env.local:
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=<same-32-bytes-hex-string>

สร้าง ENCRYPTION_KEY:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 6 — Admin Scan Management UI

```
สร้าง app/dashboard/admin/scan/page.tsx

หน้านี้ admin ใช้จัดการ scan ทั้งหมด

Layout:
┌────────────────────────────────────────────┐
│  Scan Management                           │
├────────────────────────────────────────────┤
│  Pending Requests (รอ scan)                │
│  ┌──────────────────────────────────────┐  │
│  │ kbank.co.th  Full Site  [Start Scan] │  │
│  │ scb.co.th    Single     [Start Scan] │  │
│  └──────────────────────────────────────┘  │
├────────────────────────────────────────────┤
│  Active Scans                              │
│  ┌──────────────────────────────────────┐  │
│  │ true.th  ████████░░ 80%  scanning... │  │
│  └──────────────────────────────────────┘  │
├────────────────────────────────────────────┤
│  Scheduled Scans                          │
│  ┌──────────────────────────────────────┐  │
│  │ example.com  Every Monday 02:00      │  │
│  │ [Edit Schedule] [Run Now] [Disable]  │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘

Behavior:
1. Fetch AuditRequests ที่ยังไม่มี completed report → แสดงใน "Pending"
2. ปุ่ม "Start Scan":
   - POST /api/admin/scan/start { auditRequestId }
   - ย้าย card ไป "Active Scans"
   - poll GET /api/admin/scan/[jobId]/status ทุก 3 วินาที
   - แสดง Progress bar จาก job.progress
3. เมื่อ completed → แสดงปุ่ม "View Report" → /dashboard/reports/[reportId]
4. Schedule section → ดึง AuditRequests ที่ scheduleEnabled = true

ใช้ shadcn/ui: Card, Button, Progress, Badge, Table
ใช้ useEffect polling interval สำหรับ active scans
RoleGuard allowedRoles={["admin"]}
```

---

## Step 7 — Replace Mock Data ใน Report Pages

```
แก้ไข app/dashboard/reports/page.tsx และ app/dashboard/reports/[id]/page.tsx
แทน mock data ด้วย API calls จริง

1. app/dashboard/reports/page.tsx:
   - แทน import mockReports ด้วย:
     useEffect(() => {
       fetch("/api/audit-reports")
         .then(r => r.json())
         .then(data => setReports(data.reports))
     }, [])

2. สร้าง app/api/audit-reports/route.ts:
   GET handler:
   - auth() → ดึง role
   - ถ้า customer → AuditReport.find({ requestedBy: userId })
   - ถ้า admin/tester → AuditReport.find({})
   - return { reports }

3. สร้าง app/api/audit-reports/[id]/route.ts:
   GET handler:
   - auth()
   - ดึง report
   - ถ้า customer → ตรวจ requestedBy === userId ถ้าไม่ใช่ return 403
   - return { report }

4. app/dashboard/reports/[id]/page.tsx:
   - แทน mockReports.find() ด้วย fetch("/api/audit-reports/${id}")
   - แสดง loading skeleton ขณะ fetch
```

---

## Environment Variables สรุป

```
# project-attesthub/.env.local
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=<32-bytes-hex>

# scanner-worker/.env
REDIS_URL=redis://redis:6379
MONGODB_URI=mongodb+srv://...
ENCRYPTION_KEY=<same-key>
```

## คำสั่ง Run

```bash
# Dev: รัน Redis + Worker
docker-compose up redis scanner-worker

# Next.js (แยก terminal)
cd project-attesthub && npm run dev

# Build worker
cd scanner-worker && npm run build
```
