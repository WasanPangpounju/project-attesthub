# AttestHub – Project Brief

> Generated: 2026-02-19. Intended for AI assistants helping plan or implement features in this codebase.

---

## 1. Purpose

AttestHub is a multi-role SaaS platform for managing **accessibility audits** of digital properties (websites, mobile apps) and physical spaces. Customers submit audit requests, testers perform the work, and admins orchestrate the whole pipeline.

**Current state:** Early-stage MVP. Core data models and dashboard UIs exist. Tester workflow and admin assignment features are partially wired. Several hardcoded bypasses are in place while role-based routing is finalized.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + Shadcn/ui (Radix UI primitives) |
| Auth | Clerk (`@clerk/nextjs`) |
| Database | MongoDB via Mongoose |
| Forms | React Hook Form + Zod (imported; not yet used in most forms) |
| Icons | Lucide React |
| Toasts | Sonner |
| Path alias | `@/*` → repo root |

---

## 3. Architecture

### Multi-Role System

Three roles: **Customer**, **Tester**, **Admin**. Roles are stored in MongoDB and assigned by an admin after sign-up.

**Auth flow:**
1. User signs up via Clerk → MongoDB `User` record created with `roleAssigned: false`
2. Admin assigns role via `POST /api/admin/assign-role`
3. `/dashboard` reads role from session → redirects to role-specific sub-dashboard

**Dashboard routing:**

| Role | Route |
|---|---|
| Admin | `/dashboard/admin` |
| Tester | `/dashboard/tester` |
| Customer | `/dashboard/customer` |
| Unassigned | `/dashboard` (shows "Contact Support") |

**Known hardcodes (temporary):**
- `app/dashboard/page.tsx:14` — `FORCE_ADMIN = true`, bypasses redirect logic
- `app/dashboard/admin/page.tsx:87` — `FORCE_ADMIN = true`, bypasses role check
- Role checks in all API routes are **commented out** (marked with TODOs)

---

## 4. Directory Structure

```
project-attesthub/
├── app/
│   ├── page.tsx                          # Landing page (static sections)
│   ├── globals.css
│   ├── api/
│   │   ├── audit-requests/
│   │   │   ├── route.ts                  # GET list / POST create (customer)
│   │   │   └── [id]/route.ts             # GET / PATCH / DELETE single request
│   │   ├── admin/
│   │   │   ├── audit-requests/
│   │   │   │   ├── route.ts              # GET all (admin)
│   │   │   │   └── [id]/route.ts         # GET single with fallback ID lookup
│   │   │   └── assign-role.ts            # POST assign role / GET list users
│   │   ├── profile/
│   │   │   ├── get-profile.ts            # GET/auto-create user profile
│   │   │   └── update-profile.ts         # (not yet implemented)
│   │   └── debug/
│   │       └── mongo/route.ts            # MongoDB debug info
│   └── dashboard/
│       ├── page.tsx                      # Role-based redirect (hardcoded → admin)
│       ├── admin/
│       │   ├── page.tsx                  # Admin overview + project table
│       │   ├── loading.tsx
│       │   └── projects/[id]/
│       │       ├── page.tsx              # Project detail (tabs: General/Testers/Timeline/Notes)
│       │       └── edit-form.tsx         # Inline edit overlay
│       ├── tester/
│       │   └── page.tsx                  # Tester dashboard (mock data, bilingual EN/TH)
│       └── customer/
│           ├── page.tsx                  # Customer project list + stats
│           └── new-project/
│               └── page.tsx             # 3-step audit request form
├── models/
│   ├── audit-request.ts                  # Core model (see §6)
│   ├── User.ts                           # Clerk-linked user with role tracking
│   ├── Customer.ts                       # Placeholder (extends User)
│   ├── Tester.ts                         # Placeholder (extends User)
│   └── Admin.ts                          # Placeholder (extends User)
├── components/
│   ├── ui/                               # Shadcn/ui primitives — DO NOT modify
│   ├── audit-request-form.tsx            # 3-step wizard form (1100+ lines)
│   ├── projects-list.tsx                 # Customer project cards + filtering
│   ├── dashboard-layout.tsx              # Tester dashboard shell
│   ├── dashboard-sidebar.tsx             # Sidebar nav with Clerk user info
│   ├── dashboard-header.tsx              # Header with user info
│   ├── role-guard.tsx                    # Client-side role protection wrapper
│   ├── current-task-card.tsx             # Tester current task (mock)
│   ├── new-tasks-list.tsx                # Tester available tasks (mock)
│   ├── user-profile.tsx                  # User profile display
│   ├── theme-provider.tsx                # Dark mode provider
│   ├── hero-section.tsx                  # Landing page sections...
│   ├── services-section.tsx
│   ├── how-we-work-section.tsx
│   ├── why-choose-us-section.tsx
│   ├── testimonials-section.tsx
│   ├── cta-section.tsx
│   ├── footer.tsx
│   ├── login-form.tsx
│   └── header.tsx
├── lib/
│   ├── mongodb.ts                        # Mongoose connection singleton (serverless-safe)
│   └── utils.ts                          # cn() helper for Tailwind class merging
├── hooks/
│   ├── use-mobile.ts
│   └── use-toast.ts
└── public/                               # Static assets
```

---

## 5. Data Models

### AuditRequest (`models/audit-request.ts`)

The core business entity.

```typescript
{
  // Identity
  customerId: string           // Clerk user ID of the requester
  projectName: string
  serviceCategory: "website" | "mobile" | "physical"

  // Scope
  targetUrl?: string           // Required for website/mobile
  locationAddress?: string     // Required for physical
  accessibilityStandard: string  // e.g., "WCAG 2.1 AA"
  servicePackage: "automated" | "hybrid" | "expert"
  devices: string[]            // ["desktop", "mobile-ios", "screen-reader", ...]
  specialInstructions?: string
  files?: { name: string; size: number; type: string }[]

  // Pricing (stored in smallest currency unit to avoid float errors)
  priceAmount?: number         // e.g., 150000 = 1,500 THB
  priceCurrency?: "THB" | "USD"
  priceNote?: string

  // Lifecycle
  status: "pending" | "open" | "in_review" | "scheduled" | "completed" | "cancelled"
  statusHistory: {
    from: string; to: string; changedAt: Date; changedBy?: string; note?: string
  }[]

  // Tester assignment (multiple testers per project)
  assignedTesters: {
    testerId: string
    role: "lead" | "member" | "reviewer"
    workStatus: "assigned" | "accepted" | "working" | "done" | "removed"
    assignedAt: Date
    acceptedAt?: Date
    completedAt?: Date
    assignedBy?: string
    note?: string
  }[]

  // Admin
  priority?: "low" | "normal" | "high" | "urgent"
  dueDate?: Date
  adminNotes?: string

  // AI integration (future)
  aiConfidence?: number        // 0–100
  aiReportStatus?: "none" | "generated" | "validated" | "rejected"

  createdAt: Date
  updatedAt: Date
}
```

**Key constraints:**
- Schema-level validation prevents duplicate tester assignments
- Indexes on: `customerId`, `status`, `createdAt`, `assignedTesters.testerId`
- Collection name is hardcoded to `"auditrequests"` to bypass Mongoose auto-pluralization

### User (`models/User.ts`)

Bridges Clerk auth with MongoDB:

```typescript
{
  clerkUserId: string    // Unique. Sourced from Clerk.
  email?: string
  firstName?: string
  lastName?: string
  role?: "admin" | "tester" | "customer"
  roleAssigned: boolean  // False until admin assigns a role
  status: "active" | "suspended"
  createdAt: Date
  updatedAt: Date
}
```

---

## 6. API Endpoints

### Customer

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/audit-requests` | List audit requests (filter by `?customerId=`) |
| `POST` | `/api/audit-requests` | Create audit request |
| `GET` | `/api/audit-requests/[id]` | Get single request |
| `PATCH` | `/api/audit-requests/[id]` | Update request (admin fields) |
| `DELETE` | `/api/audit-requests/[id]` | Delete request |

**PATCH** allows updating: `projectName`, `status`, `priority`, `dueDate`, `adminNotes`, `priceAmount`, `priceCurrency`, `priceNote`, `aiConfidence`, `aiReportStatus`. Status changes are auto-appended to `statusHistory`.

### Admin

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/audit-requests` | List all requests |
| `GET` | `/api/admin/audit-requests/[id]` | Get single with fallback ID resolution |
| `POST` | `/api/admin/assign-role` | Assign role to user |
| `GET` | `/api/admin/assign-role` | List all users (limit 100) |

### Profile

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/profile/get-profile` | Fetch or auto-create user profile |

### Debug

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/debug/mongo` | MongoDB connection + collection info |

---

## 7. Coding Conventions

### API Routes

```typescript
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase()
    // business logic
    return NextResponse.json({ data: result }, { status: 200 })
  } catch (err) {
    console.error("[GET /api/...] error:", err)
    return NextResponse.json({ error: "message" }, { status: 500 })
  }
}
```

- All routes use `try/catch` wrapping the full body
- `console.error` prefixed with `[METHOD /path]` for searchability
- Explicit HTTP status codes always
- MongoDB ObjectId validated before use

### Mongoose Models

```typescript
const NestedSchema = new Schema<INested>(
  { field: { type: String } },
  { _id: false }  // no ObjectId for subdocuments
)

const MainSchema = new Schema<IMain>(
  { field: { type: String, required: true, index: true } },
  { timestamps: true }
)

// Validators registered via .path().validate()
MainSchema.path("someField").validate(fn, "Error message")

// Export pattern prevents model re-registration on hot reload
export default models.ModelName || model<IMain>("ModelName", MainSchema, "collectionname")
```

### React Components

**Client components** (`"use client"`) pattern:

```typescript
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  let cancelled = false
  async function load() {
    try {
      const res = await fetch("/api/...", { cache: "no-store" })
      const json = await res.json()
      if (!cancelled) setData(json)
    } catch (e) {
      if (!cancelled) setError(String(e))
    } finally {
      if (!cancelled) setLoading(false)
    }
  }
  load()
  return () => { cancelled = true }
}, [deps])
```

- `cache: "no-store"` for fresh data
- Cancelled flag prevents state updates on unmounted components
- Loading + error states always tracked

### Styling

- Use `cn()` from `@/lib/utils` to merge conditional Tailwind classes
- Tailwind CSS 4 with CSS variables for theming
- Responsive breakpoints: `md:` and `lg:`
- ARIA labels on interactive elements

### Forms

- Large forms use multi-step wizard pattern with `currentStep` state
- `updateFormData()` helper clears errors on input change
- `validateStep(step)` checks required fields before advancing
- `handleSubmit()` validates then calls API
- React Hook Form + Zod are imported but **not yet used in most forms** — prefer adopting them for new forms

---

## 8. Implemented Features

### Landing Page (`/`)
Static marketing sections: Hero, Services, How It Works, Why Choose Us, Testimonials, CTA, Footer.

### Customer Dashboard (`/dashboard/customer`)
- Project cards with status, creation date, progress bar
- Stats: Total / In Progress / Completed
- "Add New Project" button

### New Audit Request Form (`/dashboard/customer/new-project`)
3-step wizard:
1. Project name, service category, target URL or location
2. Accessibility standard, service package
3. Devices (multi-select), special instructions, file upload

Includes per-step validation, conditional fields, and a success confirmation screen.

### Admin Dashboard (`/dashboard/admin`)
- Metrics: Active Audits, Pending Assignments, Completed Reports, Active Testers
- Searchable project table (by name, customer ID, or tester)
- Color-coded status badges
- Links to project detail pages

### Admin Project Detail (`/dashboard/admin/projects/[id]`)
Four tabs:
- **General** — Project info, pricing, AI report status
- **Testers** — Assigned testers with role and work status
- **Timeline** — Status change history
- **Notes** — Admin notes text area

Includes an edit form overlay for updating project fields.

### Tester Dashboard (`/dashboard/tester`)
- Bilingual (EN/TH) with language toggle
- Current task card and new tasks list
- **All data is currently mock/hardcoded**

### Role Assignment
- API endpoint to assign roles
- `RoleGuard` component for client-side route protection
- Auto-creates MongoDB User on first login

---

## 9. What Is Not Yet Implemented

| Feature | Notes |
|---|---|
| Real role-based routing | Hardcoded FORCE_ADMIN bypasses in place |
| API route role enforcement | Role checks commented out |
| Tester task acceptance workflow | `workStatus` transitions not wired |
| Tester data from API | Dashboard uses mock data |
| Tester assignment (admin) | Button exists in UI, no backend action |
| Report submission & validation | AI report status field exists, no upload flow |
| Payment processing | Schema has price fields, no payment integration |
| File upload storage | Form collects metadata, files not stored anywhere |
| Email notifications | Not started |
| Real-time updates | Not started |
| Tests | No test suite |
| `update-profile` endpoint | Route file exists but is empty |

---

## 10. Environment Variables

```env
MONGODB_URI=
MONGODB_DB=attesthub
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

---

## 11. Commands

```bash
npm run dev      # Start dev server → http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

---

## 12. Planning Notes for New Features

- **Adopt React Hook Form + Zod** for any new forms — the libraries are already installed
- **Remove FORCE_ADMIN** hardcodes before implementing any role-gated feature — otherwise role checks will silently be bypassed
- **Uncomment API route role checks** when implementing tester/customer-specific endpoints
- **Shared types** are currently duplicated across components — consider a `types/` directory
- **Mock tester data** lives in `app/dashboard/tester/page.tsx` — replace with real API calls before building tester features
- The `Customer`, `Tester`, and `Admin` Mongoose models are empty placeholders — extend them when role-specific data fields are needed
- When adding new API routes, follow the `connectToDatabase()` + try/catch + explicit status code pattern
- Collection name must be explicitly set on new Mongoose models to avoid pluralization surprises
