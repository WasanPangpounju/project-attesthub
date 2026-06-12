# AI Summary (Free Scan) — Status Notes

Status: **Working** (confirmed 2026-06-11, new `ANTHROPIC_API_KEY` applied)

## Summary

The free-scan / guest-scan flow generates an AI summary of accessibility
issues using Anthropic Claude (`claude-sonnet-4-6`) and persists it to
MongoDB along with the rest of the scan report. Confirmed working after
updating `ANTHROPIC_API_KEY`.

## Where things live

- **Generation:** `scanner-worker/ai-summary.ts`
  - `generateAiSummary(issues: IGuestScanIssue[]): Promise<IGuestScanAiSummary>`
  - Uses `@anthropic-ai/sdk`, model `claude-sonnet-4-6`, `max_tokens: 1024`
  - Prompts/responses are in Thai
  - Output shape: `{ overview, topIssues[], recommendations[], urgency }`
    - `urgency`: `'ด่วนมาก' | 'ด่วน' | 'ควรแก้ไข' | 'แนะนำ'`
  - On failure, falls back to a default summary (`scanner-worker/crawler.ts`
    lines ~172-177)

- **Worker flow:** `scanner-worker/crawler.ts`
  - Playwright + axe-core scan → builds issue list → calls
    `generateAiSummary()` (~line 169) → saves full report incl. `aiSummary`
    to MongoDB (~lines 182-191)

- **Storage:** `models/GuestScanReport.ts`
  - Collection: `guestscanreports`
  - `aiSummary` field (lines ~78-86): `overview`, `topIssues[]`,
    `recommendations[]`, `urgency`
  - TTL index: auto-delete after 30 days (~line 96)
  - Each scan = one document with its own `reportId` → acts as the
    "history" for that scan, but there's no list/history view across scans

- **API:**
  - `GET /api/guest-scan/[reportId]` — returns full report incl. `aiSummary`
    once `status === 'completed'`
  - `GET /api/guest-scan/[reportId]/status` — progress only, does **not**
    include `aiSummary`
  - `POST /api/guest-scan/start` — creates report (status `pending`),
    rate-limited (5/hour/IP), 30-day cache per domain

- **Config:** `scanner-worker/.env` → `ANTHROPIC_API_KEY` (rotated/fixed
  2026-06-11)

## Known gaps / follow-ups

- ~~No "scan history list" feature~~ — **implemented 2026-06-12**, see
  `scan-history-feature.md` (`clerkUserId` field, `/api/scan-history`,
  `/dashboard/scan-history`). Still pending a dev-server restart to take
  effect — see that doc for details.
- Reports auto-expire after 30 days (TTL index) — history feature would
  need to account for this if long-term retention is desired.
