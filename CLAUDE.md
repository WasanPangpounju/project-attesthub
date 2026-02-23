# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is currently implemented.

## Tech Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS 4** + **Shadcn/ui** (Radix UI primitives) for UI
- **Clerk** for authentication and role management
- **MongoDB** via **Mongoose** for persistence
- **React Hook Form** + **Zod** for form validation
- **`@/*`** path alias points to the repo root

## Architecture

### Multi-Role System

Three roles: **Customer**, **Tester**, **Admin**. Authentication uses Clerk; roles are stored in MongoDB and assigned by admins after sign-up.

**Auth flow:**
1. User signs up via Clerk → MongoDB `User` record created with `roleAssigned: false`
2. Admin assigns role via `POST /api/admin/assign-role`
3. `/dashboard` reads role from session and redirects to the correct sub-dashboard

### Dashboard Routing

| Role | Route |
|------|-------|
| Admin | `/dashboard/admin` |
| Tester | `/dashboard/tester` |
| Customer | `/dashboard/customer` |

### API Routes (`app/api/`)

- `/audit-requests` – Customer CRUD for audit requests
- `/admin/audit-requests` – Admin management of all requests
- `/admin/assign-role` – Role assignment
- `/profile/get-profile`, `/profile/update-profile` – User profile
- `/debug/mongo` – MongoDB connection debug

Auth in API routes uses Clerk `sessionClaims`. Role checks are partially implemented — some endpoints have role verification commented out (marked with TODOs).

### Data Models (`models/`)

**`AuditRequest`** – The core model. Tracks project details, pricing (stored in smallest currency unit — satang for THB — to avoid float errors), status lifecycle, and tester assignments with roles (lead/member/reviewer). Has schema-level validation to prevent duplicate testers.

- Status flow: `pending → open → in_review → scheduled → completed | cancelled`
- Tester work status: `assigned → accepted → working → done → removed`

**`User`** – Links `clerkUserId` to a MongoDB record; tracks role assignment status and account status (active/suspended). `Customer`, `Tester`, `Admin` models are currently placeholders extending `User`.

### Known Hardcodes (Temporary)

- `app/dashboard/admin/page.tsx:87` — `FORCE_ADMIN = true` bypasses role check
- `app/dashboard/page.tsx:14` — defaults redirect to admin dashboard

These exist while role-based routing is being finalized and should not be treated as permanent patterns.

### Component Organization

- `components/ui/` — Shadcn/ui components (do not modify directly)
- `components/` root — Feature/page-level components
- `lib/mongodb.ts` — MongoDB connection with global caching (Next.js serverless-safe)
- `lib/utils.ts` — `cn()` helper for Tailwind class merging

## Environment Variables

Required in `.env.local`:
```
MONGODB_URI=
MONGODB_DB=attesthub
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```
