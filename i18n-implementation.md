# AttestHub — i18n Language Switching Implementation

## Overview
ระบบเปลี่ยนภาษา ไทย/English สำหรับ Tester, Customer Dashboard และ Landing Page  
Storage: Cookie (guest + logged-in) + MongoDB (per-user preference)

## Stack
Next.js 14 App Router · MongoDB/Mongoose · Clerk Auth · shadcn/ui · TypeScript

## Run Order
```
Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Step 6 → Step 7
```

---

## Step 1 — Core i18n Infrastructure

```
สร้างไฟล์ต่อไปนี้สำหรับ i18n system โดยไม่ใช้ external library (ไม่ใช้ next-intl หรือ i18next)

--- lib/i18n/config.ts ---
export const locales = ["en", "th"] as const
export type Locale = typeof locales[number]
export const defaultLocale: Locale = "en"
export const LOCALE_COOKIE = "attesthub-locale"

--- lib/i18n/translations/en.ts ---
สร้าง translation object ครอบคลุม keys:
nav: { home, features, pricing, about, login, getStarted, dashboard }
hero: { title, subtitle, ctaPrimary, ctaSecondary }
features: { title, subtitle }
dashboard: { welcome, profile, settings, logout }
status: { pending, inProgress, completed, approved, rejected }
common: { save, cancel, loading, success, error, language, submit, upload, delete, edit, view, back }

--- lib/i18n/translations/th.ts ---
แปลทุก key จาก en.ts เป็นภาษาไทยที่เป็นธรรมชาติ

--- lib/i18n/index.ts ---
export function getTranslations(locale: Locale) → return translation object ของ locale นั้น
export function detectLocale(cookieValue?: string): Locale → validate locale ว่าอยู่ใน locales[] ถ้าไม่ใช่ return defaultLocale

--- lib/i18n/useTranslation.ts ---
"use client"
hook: useTranslation()
- อ่านค่า locale เริ่มต้นจาก cookie "attesthub-locale" ด้วย document.cookie
- return { t, locale, setLocale }
- setLocale(newLocale) ทำสิ่งต่อไปนี้:
  1. set cookie "attesthub-locale" expire 365 วัน path=/
  2. ถ้า user login (เช็คจาก fetch /api/profile status 200) → PATCH /api/profile body: { preferredLanguage: newLocale }
  3. trigger re-render ด้วย useState
```

---

## Step 2 — Middleware

```
แก้ไข middleware.ts ให้รองรับ locale cookie โดยไม่กระทบ Clerk auth ที่มีอยู่

เพิ่ม logic หลังจาก Clerk ผ่านแล้ว:
1. อ่าน req.cookies.get("attesthub-locale")?.value
2. validate ว่าอยู่ใน ["en","th"] ถ้าไม่ → ดู Accept-Language header → fallback "en"
3. set response header "x-locale" = locale ที่ได้

import ที่ต้องใช้:
import { LOCALE_COOKIE, locales, defaultLocale } from "./lib/i18n/config"

อย่าแก้ส่วน Clerk matcher หรือ publicRoutes เดิม
```

---

## Step 3 — User Model + Profile API

```
แก้ไข models/User.ts และ API routes สำหรับ preferredLanguage

1. models/User.ts
เพิ่มฟิลด์: preferredLanguage: { type: String, enum: ["en", "th"], default: "en" }

2. GET /api/profile
เพิ่ม preferredLanguage ใน select และ response object

3. PATCH /api/profile (หรือ PUT ที่มีอยู่)
รับ body { preferredLanguage } แล้ว validate ว่าเป็น "en" หรือ "th" ก่อน save
```

---

## Step 4 — LanguageSwitcher Component

```
สร้าง components/LanguageSwitcher.tsx

"use client"
import useTranslation จาก lib/i18n/useTranslation.ts

Props:
- variant: "minimal" | "full"  (default: "minimal")

UI:
- variant="minimal" → ปุ่ม toggle แสดง "TH" / "EN" พร้อม flag emoji 🇹🇭 🇬🇧
- variant="full" → shadcn DropdownMenu แสดง "🇬🇧 English" และ "🇹🇭 ภาษาไทย" พร้อม checkmark ที่ active

Behavior:
- คลิก → setLocale() จาก useTranslation hook
- แสดง loading state เล็กน้อยขณะ setLocale กำลังทำงาน
- ใช้ shadcn/ui Button หรือ DropdownMenu
```

---

## Step 5 — แก้ Tester Dashboard ให้ Persist

```
หาไฟล์ที่ทำ language switching ของ Tester dashboard ใน codebase แล้วแก้ไข:

1. แทนที่ state และ logic เปลี่ยนภาษาเดิมทั้งหมดด้วย useTranslation hook จาก lib/i18n/useTranslation.ts
2. แทนที่ hardcoded strings ด้วย t.xxx จาก hook
3. เพิ่ม <LanguageSwitcher variant="minimal" /> ใน header หรือ navbar ของ Tester
4. ลบ code เดิมที่ซ้ำซ้อนออก
```

---

## Step 6 — Customer Dashboard

```
เพิ่ม language switching ใน Customer dashboard

1. เปิด layout หรือ DashboardHeader ของ customer
2. เพิ่ม <LanguageSwitcher variant="minimal" /> ในตำแหน่งเดียวกับที่ Tester มี
3. ใช้ useTranslation hook แปล UI strings ต่อไปนี้ที่มีอยู่บน customer dashboard:
   - nav menu items
   - page titles  
   - button labels (Submit, Cancel, Upload)
   - status labels ใช้ t.status.xxx
```

---

## Step 7 — Landing Page

```
เพิ่ม i18n ใน Landing page

Landing page น่าจะเป็น Server Component ให้ทำดังนี้:

1. อ่าน locale จาก cookies():
   import { cookies } from "next/headers"
   const locale = cookies().get("attesthub-locale")?.value ?? "en"
   const t = getTranslations(locale as Locale)

2. แทน hardcoded strings ด้วย t.nav.xxx, t.hero.xxx ฯลฯ

3. Navbar ของ Landing page (ถ้าเป็น Server Component ให้แยก LanguageSwitcherWrapper เป็น "use client"):
   - เพิ่ม <LanguageSwitcher variant="minimal" />
   - เมื่อ setLocale() ถูกเรียก → ต้องเรียก router.refresh() เพื่อให้ Server Component โหลด locale ใหม่

4. ถ้า router.refresh() ไม่ทำงาน ให้ใช้ window.location.reload() แทนชั่วคราว
```

---

## หมายเหตุ

- **Priority cookie > Accept-Language** เสมอ เพราะ user เลือกเอง
- **Priority DB > cookie** เมื่อ user login — ดึง preferredLanguage จาก GET /api/profile ใน DashboardHeader แล้ว overwrite cookie
- ทุก prompt ต้อง run **Step 1 ก่อน** เพราะ useTranslation hook เป็น dependency ของทุกส่วน
