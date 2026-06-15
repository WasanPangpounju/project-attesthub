# Scan History (Customer) — Status Notes

Status: **Implemented, committed (634c9b4), pending dev-restart verification** (2026-06-12)

## Summary

Logged-in customers can now see a history of their free/guest scans at
`/dashboard/scan-history`. This closes the gap noted in
`ai-summary-feature.md` ("no scan history list feature").

## What was built

- **`models/GuestScanReport.ts`** — added optional indexed field
  `clerkUserId?: string`
- **`app/api/guest-scan/start/route.ts`**
  - reads `userId` via `auth()` from `@clerk/nextjs/server`
  - new report: `clerkUserId: userId ?? undefined`
  - cache-hit path: if the report has no `clerkUserId` yet and the
    requester is logged in, backfills `cached.clerkUserId = userId`
  - **TEMP DEBUG LOG at line ~90**:
    `console.log('[start] userId:', userId, 'reportId:', report._id)`
    — added 2026-06-12 to verify the fix works; **remove once confirmed**
- **`app/api/scan-history/route.ts`** (new) — `GET`, requires Clerk auth,
  returns last 20 `GuestScanReport`s for `clerkUserId === userId`:
  `{ reportId, url, domain, score, wcagLevel, status, createdAt, urgency }`
- **`app/dashboard/scan-history/page.tsx`** (new) — customer-only
  (`RoleGuard(['customer'])`), list view using small `ScoreCircle`,
  WCAG/urgency badges, status badge for non-completed scans, links to
  `/free-scan/result/[reportId]`; empty state CTA → `/free-scan`
- **`components/free-scan/scan-result-views.tsx`** — `ScoreCircle` now
  takes optional `size` (default 140) and `showLabel` (default true) props
  so it can be rendered small in the history list
- **Nav**: added "ประวัติการตรวจสอบฟรี" / "Scan History" item (lucide
  `History` icon) to the **customer** sidebar only
  (`components/dashboard-sidebar.tsx`), with i18n keys
  `dashboard.nav.scanHistory` in `lib/i18n/translations/{en,th}.ts`

## Bug found & fix required (action needed before this works)

`/dashboard/scan-history` was empty even after a logged-in scan. Root cause:

- The running `npm run dev` process was started **before** the
  `clerkUserId` field was added to the Mongoose schema.
- `mongoose.models.GuestScanReport || mongoose.model(...)` reuses the
  already-registered (old) schema in a long-lived process — Next.js
  hot-reload of the route file does not re-register the model.
- Mongoose `strict` mode silently drops `clerkUserId` on `.create()`
  against the stale schema → field never saved → `/api/scan-history`
  returns `[]`.

Confirmed via direct MongoDB query: no document (including the most recent
scan after the field was added) has `clerkUserId`.

**Fix: restart `npm run dev`** (kills the stale mongoose model cache so the
new schema with `clerkUserId` registers correctly). Not done yet —
requires the user to restart their own dev server.

## Verification steps (for next session, after restart)

**This is the #1 priority for the next session** — the code is written and
committed, but unverified end-to-end.

1. Restart dev server (`npm run dev`)
2. Log in as a customer, run a free scan (use a domain not already cached
   within 30 days)
3. Check terminal for `[start] userId: <id> reportId: <id>` — userId should
   be non-null
4. Visit `/dashboard/scan-history` — the new scan should appear
5. **Remove the temp `console.log` at `app/api/guest-scan/start/route.ts:90`**
   once confirmed working, then commit that small cleanup separately

## Known gaps / follow-ups

- Scans made **before** this fix (no `clerkUserId`) will never show in
  history — would need manual backfill (e.g. match by `visitorIp` +
  approximate timestamp) if historical data is wanted. Not done.
- `/api/scan-history` only covers `customer` role nav link; if
  tester/admin should also see their own free-scan history, add the nav
  item to their sidebar sections too (API already works for any logged-in
  user regardless of role).
