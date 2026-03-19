# Guest Free Scan Feature — AttestHub
> Branch: feature/customer-management  
> เป้าหมาย: Guest กด "เริ่มตรวจสอบ" บน Landing Page → ใส่ URL → รับรายงาน WCAG ภาษาไทย พร้อม AI แปรผล

---

## สถาปัตยกรรมภาพรวม

```
Landing Page (hero-section.tsx)
    ↓ กด "เริ่มตรวจสอบ"
/free-scan
    ↓ submit URL
POST /api/guest-scan/start
    ↓ ตรวจ cache (domain เดิม < 1 เดือน?)
    ├── HIT  → return reportId ที่มีอยู่ (cached: true)
    └── MISS → สร้าง GuestScanReport + push BullMQ job
                    ↓
             scanner-worker/ (แยก process)
             Playwright + axe-core + Claude AI
                    ↓
/free-scan/result/[reportId]
    ↓ polling จนเสร็จ
รายงาน WCAG ภาษาไทย + AI แปรผล
    ↓ CTA ท้ายหน้า
"ต้องการรายงานละเอียด? สมัครใช้งาน" → /sign-up
```

---

## ไฟล์ที่ต้องสร้าง/แก้ไข

| # | ไฟล์ | Action |
|---|------|--------|
| 1 | `middleware.ts` | แก้ — เพิ่ม public routes |
| 2 | `models/GuestScanReport.ts` | สร้างใหม่ |
| 3 | `lib/queue/guestScanQueue.ts` | สร้างใหม่ |
| 4 | `app/api/guest-scan/start/route.ts` | สร้างใหม่ |
| 5 | `app/api/guest-scan/[reportId]/status/route.ts` | สร้างใหม่ |
| 6 | `app/api/guest-scan/[reportId]/route.ts` | สร้างใหม่ |
| 7 | `scanner-worker/index.ts` | สร้างใหม่ |
| 8 | `scanner-worker/crawler.ts` | สร้างใหม่ |
| 9 | `scanner-worker/ai-summary.ts` | สร้างใหม่ |
| 10 | `scanner-worker/package.json` | สร้างใหม่ |
| 11 | `app/free-scan/page.tsx` | สร้างใหม่ |
| 12 | `app/free-scan/result/[reportId]/page.tsx` | สร้างใหม่ |
| 13 | `components/hero-section.tsx` | แก้ — เปลี่ยน CTA link |

---

## Step-by-Step Instructions

### STEP 1: middleware.ts
เพิ่ม public routes:
```
/free-scan
/free-scan/(.*)
/api/guest-scan/(.*)
```

---

### STEP 2: models/GuestScanReport.ts
สร้าง Mongoose model:
```typescript
{
  domain: String,        // required, indexed (hostname ไม่มี www)
  url: String,           // required (URL จริงที่ scan)
  status: enum ['pending','scanning','completed','failed'],
  jobId: String,
  score: Number,         // 0-100
  wcagLevel: enum ['A','AA','AAA','None'],
  summary: { passed, failed, warnings, total: Number },
  issues: [{
    severity: enum ['critical','serious','moderate','minor'],
    wcagCriteria: String,
    element: String,
    description: String,
    recommendation: String
  }],
  aiSummary: {
    overview: String,
    topIssues: [String],
    recommendations: [String],
    urgency: enum ['ด่วนมาก','ด่วน','ควรแก้ไข','แนะนำ']
  },
  pagesScanned: Number,
  scanDurationMs: Number,
  errorMessage: String,
  createdAt: Date        // default: Date.now, TTL index 30 วัน
}
```

---

### STEP 3: lib/queue/guestScanQueue.ts
- BullMQ Queue ชื่อ `"guest-scan"`
- pattern เดิมจาก `lib/queue/scanQueue.ts`
- jobData interface: `{ reportId: string }`

---

### STEP 4: POST /api/guest-scan/start/route.ts
Logic:
1. รับ `{ url: string }` — validate URL format
2. normalize domain: `new URL(url).hostname.replace(/^www\./, '')`
3. ค้นหา cache:
```typescript
GuestScanReport.findOne({
  domain,
  status: 'completed',
  createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
}).sort({ createdAt: -1 })
```
4. พบ cache → `return { reportId: cached._id, cached: true }`
5. ไม่พบ → สร้าง `GuestScanReport(status:'pending')` + `guestScanQueue.add()` → `return { reportId, cached: false }`

---

### STEP 5: GET /api/guest-scan/[reportId]/status/route.ts
- `GuestScanReport.findById(reportId)`
- return `{ status, progress (จาก BullMQ job), score, wcagLevel, summary }`

---

### STEP 6: GET /api/guest-scan/[reportId]/route.ts
- `GuestScanReport.findById(reportId)`
- ถ้า status !== `'completed'` → return `{ status }` เท่านั้น
- return report เต็ม

---

### STEP 7–10: scanner-worker/ (แยก folder ระดับ root)

**package.json dependencies:**
```
bullmq, ioredis, playwright, axe-core, @anthropic-ai/sdk, mongoose, dotenv
```

**index.ts — BullMQ Worker:**
- เชื่อม Redis queue `"guest-scan"`
- `lockDuration: 300_000`
- process job → เรียก `runGuestScan(reportId)`

**crawler.ts — runGuestScan(reportId):**
```
1. update status → 'scanning'
2. normalizeUrl() — เติม https:// ถ้าขาด
3. Playwright launch (headless) → goto(url, timeout: 30s)
4. inject axe-core via page.addScriptTag
5. page.evaluate(() => axe.run()) → violations[]
6. map violations → issues[]
   severity mapping: critical→critical, serious→serious,
                     moderate→moderate, minor→minor
7. คำนวณ score:
   100 - (critical×25 + serious×15 + moderate×5 + minor×1)
   min 0
8. เรียก generateAiSummary(issues)
9. update GuestScanReport → status:'completed'
```

**ai-summary.ts — generateAiSummary(issues[]):**
- เรียก Anthropic API model `claude-sonnet-4-20250514`
- prompt ให้ตอบ JSON ภาษาไทย:
```json
{
  "overview": "สรุปภาพรวม 2-3 ประโยค",
  "topIssues": ["ปัญหาหลัก 3 อันดับ"],
  "recommendations": ["คำแนะนำเบื้องต้น"],
  "urgency": "ด่วนมาก|ด่วน|ควรแก้ไข|แนะนำ"
}
```
- parse JSON response → return

---

### STEP 11: app/free-scan/page.tsx
- Input กรอก URL (placeholder: `https://example.com`)
- note: "ตรวจสอบเฉพาะหน้าแรกของเว็บไซต์"
- ปุ่ม "ตรวจสอบ" → POST `/api/guest-scan/start`
- loading spinner ระหว่าง submit
- cached: true → redirect `/free-scan/result/[reportId]?cached=true`
- cached: false → redirect `/free-scan/result/[reportId]`
- ใช้ shadcn/ui `Input` + `Button`

---

### STEP 12: app/free-scan/result/[reportId]/page.tsx
**Polling (pending/scanning):**
- GET `/api/guest-scan/[reportId]/status` ทุก 3 วินาที
- แสดง progress bar + "กำลังตรวจสอบ..."

**Completed — แสดง:**
- Score วงกลม % พร้อมสี (≥80=green, ≥60=yellow, <60=red)
- WCAG Level badge
- AI Summary ภาษาไทย (overview, topIssues, recommendations)
- ตารางปัญหาจัดกลุ่มตาม severity
- ถ้า `?cached=true` → banner "ผลจากการตรวจสอบเมื่อ [วันที่]"

**CTA ท้ายหน้า:**
> "ต้องการรายงานละเอียดและการแก้ไขจากผู้เชี่ยวชาญ?"  
> ปุ่ม "สมัครใช้งาน" → `/sign-up`

---

### STEP 13: components/hero-section.tsx
เปลี่ยนปุ่ม "เริ่มตรวจสอบ" (Primary CTA):
- จาก `/sign-up` → `/free-scan`

---

## หมายเหตุ
- ใช้ style และ pattern เดิมของโปรเจกต์ (Tailwind + shadcn/ui)
- Worker แยก process — ต้องรันแยกจาก Next.js dev server
- Cache key คือ `domain` (hostname ไม่มี www) ไม่ใช่ full URL
