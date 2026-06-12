# Landing Page Hero Scan Widget

Status: **Implemented** (2026-06-10, updated to redirect flow same day)

## Goal

Add a "free scan" entry point directly to the landing page hero
(`app/page.tsx` / `components/hero-section.tsx`) without removing the existing
standalone `/free-scan` flow.

- Hero section has a URL input + "ตรวจสอบฟรี" button + trust badges.
- Submitting calls the guest-scan API, then **redirects** to
  `/free-scan/result/[reportId]?cached=true|false` to show progress/results
  (same page used by the standalone `/free-scan` flow).
- `/free-scan` and `/free-scan/result/[reportId]` remain fully functional for
  direct links / bookmarks.

## Current architecture

- `components/free-scan/scan-result-views.tsx`
  - Shared types: `ScanStatus`, `StatusResponse`, `ScanIssue`, `ReportData`
  - Shared components: `ScoreCircle`, `LoadingView`, `FailedView`, `ResultView`
  - Used by both `/free-scan/result/[reportId]/page.tsx` and (previously) the
    inline result section.

- `components/free-scan/scan-context.tsx`
  - `ScanProvider` / `useScan()` — client context holding `url`, `loading`,
    `error`, and `submitScan()`.
  - `submitScan`:
    - trims URL, validates non-empty
    - `POST /api/guest-scan/start`
    - handles 429 rate-limit (shows retry-after minutes), resets `loading`
    - on other errors, shows `data.error` and resets `loading`
    - **on success**: `router.push('/free-scan/result/${reportId}?cached=${cached}')`
      — `loading` stays `true` through the navigation (no reset on success path)
  - No longer holds `reportId` / `cached` state — navigation replaces it.

- `components/free-scan/hero-scan-input.tsx`
  - URL input + "ตรวจสอบฟรี" button styled for the teal hero background
  - Trust badges line: "WCAG 2.1 · ไม่ต้องสมัคร · ผลภายใน 60 วิ"
  - Uses `useScan()` from the context — unchanged by the redirect refactor.

- `app/page.tsx`
  - Wrapped page body in `<ScanProvider>` (still needed — `HeroScanInput` uses
    `useScan()`).
  - **No longer renders an inline result section** — `ScanResultSection` was
    removed and the file `components/free-scan/scan-result-section.tsx` was
    **deleted**.

- `app/free-scan/result/[reportId]/page.tsx`
  - Reads `reportId` from route params and `cached` from `?cached=` query.
  - Polls `GET /api/guest-scan/{id}/status` every 3s, then
    `GET /api/guest-scan/{id}` on completion.
  - Renders `LoadingView` / `FailedView` / `ResultView`.
  - **New**: sticky bottom CTA bar shown once `status === 'completed'`:
    - Gradient `linear-gradient(135deg, #1a2744 0%, #0f4c40 100%)` (teal-navy,
      same gradient as the CTA block inside `ResultView`)
    - Text: "ต้องการแก้ไขปัญหาทั้งหมด? ผู้เชี่ยวชาญของเราช่วยได้"
    - Buttons: "สมัครใช้งานฟรี" → `/sign-up` (yellow `#FACC15` bg), "ดูแพ็กเกจ"
      → `/#services` (outline, white text)

## Design / styling

- Reused existing color tokens: teal `#0f7c6e`, navy `#1a2744`, yellow accent
  `#FACC15`, light bg `#f8fafc`.
- Reused `components/ui/input.tsx` and `components/ui/button.tsx` (shadcn).
- `ResultView` already has its own CTA linking to `/sign-up` — the new sticky
  bar is an additional, more persistent CTA on the same page.
- "ดูแพ็กเกจ" links to `/#services` (the landing page services section) since
  there is no dedicated `/pricing` page yet.

## Known follow-ups / things to check next time

- `createdAt` state in `app/free-scan/result/[reportId]/page.tsx` is set but
  unused — pre-existing, not addressed in this change.
- If a real `/pricing` or `/packages` page is added, update the "ดูแพ็กเกจ"
  link in the sticky CTA bar (`app/free-scan/result/[reportId]/page.tsx`).
- Hero scan widget is Thai-only (matches the existing `/free-scan` page).
- ESLint config (`eslint .`) currently fails project-wide ("couldn't find a
  configuration file") — pre-existing issue, not related to this change.
- `npm run build` passes after this change.
