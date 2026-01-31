# 📊 AttestHub Project Analysis
## Accessibility Audit Platform for WCAG Compliance

**Last Updated:** January 27, 2026  
**Project Purpose:** BuildPortal สำหรับการตรวจสอบความเข้าถึงได้ (Accessibility Audit) ของเว็บไซต์ แอพพลิเคชัน และพื้นที่ทางกายภาพ ตามมาตรฐาน WCAG โดยรวมกำลัง AI tools และการทดสอบจริงจากผู้ทดสอบที่เป็นคนพิการและผู้สูงอายุ

---

## 🎯 Project Overview

### Mission
AttestHub ให้บริการตรวจสอบความเข้าถึงได้ (Accessibility Audit) ที่ครบครัน โดยรวมกำลัง:
- ✅ **Automated Tools** - สแกนด้วย AI tools อย่างรวดเร็ว
- ✅ **Manual Testing** - ทดสอบจริงจากผู้ทดสอบที่มีความพิการ (Disabled Users)
- ✅ **Expert Analysis** - วิเคราะห์และให้คำแนะนำจาก Accessibility Experts

### Target Users
1. **Customers** - บริษัทที่ต้องการตรวจสอบความเข้าถึงได้ของผลิตภัณฑ์
2. **Testers** - ผู้ทดสอบที่มีความพิการหรือผู้สูงอายุ ทำหน้าที่ manual testing
3. **Admin** - ผู้บริหารระบบที่จัดการงาน และ tester
4. **System** - AI Tools สำหรับ automated testing

---

## 🏗️ Technical Stack

### Frontend Framework
- **Next.js 16.0.10** - React Framework with Server-Side Rendering
- **React 19.2.3** - UI Library
- **TypeScript** - Type-safe development
- **Tailwind CSS 4.1.9** - Utility-first CSS framework
- **Tailwind Animate** - Animation utilities

### UI Component Library
- **Radix UI** - Unstyled, accessible components (accordion, dialog, dropdown, etc.)
- **Shadcn/ui** - Composed components from Radix UI
- **Lucide React** - Icon library
- **Recharts** - Data visualization

### Form & Validation
- **React Hook Form** - Efficient form management
- **Zod** - TypeScript schema validation
- **Hookform/Resolvers** - Integration between RHF and Zod

### Backend & Database
- **MongoDB** - NoSQL database via Mongoose 9.1.2
- **Mongoose** - MongoDB object modeling

### Authentication & Authorization
- **Clerk** (@clerk/nextjs 6.36.5) - Modern authentication platform

### Additional Libraries
- **Date-fns** - Date utilities
- **Sonner** - Toast notifications
- **Embla Carousel** - Carousel component
- **Input-OTP** - OTP input component
- **React Resizable Panels** - Resizable UI panels
- **Vaul** - Drawer component
- **CMDk** - Command palette

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

---

## 📊 Data Models

### 1. User Model
```typescript
{
  clerkUserId: string (unique),
  role: "admin" | "tester" | "customer",
  status: "active" | "suspended",
  createdAt: Date
}
```

### 2. Customer Model (Placeholder)
```typescript
{
  userId: ObjectId (ref User),
  companyName: string,
  plan: string,
  projects: Array
}
```

### 3. Tester Model (Placeholder)
```typescript
{
  userId: ObjectId (ref User),
  skills: Array,
  rating: number,
  availability: status
}
```

### 4. Admin Model (Placeholder)
```typescript
{
  userId: ObjectId (ref User),
  scope: ["system", "finance", "audit"]
}
```

### 5. AuditRequest Model (Core Business Logic)
```typescript
{
  // Project Information
  customerId: string,
  projectName: string,
  serviceCategory: "website" | "mobile" | "physical",
  targetUrl: string,
  locationAddress: string,
  
  // Audit Configuration
  accessibilityStandard: string (WCAG version),
  servicePackage: "automated" | "hybrid" | "expert",
  devices: string[],
  specialInstructions: string,
  files: Array<{name, size, type}>,
  
  // Pricing
  priceAmount: number (in smallest currency unit),
  priceCurrency: "THB" | "USD",
  priceNote: string,
  
  // Status Tracking
  status: "pending" | "open" | "in_review" | "scheduled" | "completed" | "cancelled",
  statusHistory: Array<StatusHistoryItem>,
  
  // Tester Assignment
  assignedTesters: Array<{
    testerId: string,
    role: "lead" | "member" | "reviewer",
    workStatus: "assigned" | "accepted" | "working" | "done" | "removed",
    assignedAt: Date,
    assignedBy?: string,
    acceptedAt?: Date,
    completedAt?: Date,
    note?: string
  }>,
  
  // Admin & AI Fields
  priority: "low" | "normal" | "high" | "urgent",
  dueDate: Date,
  adminNotes: string,
  aiConfidence: number,
  aiReportStatus: "none" | "generated" | "validated" | "rejected",
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

## 📁 Project Structure

### Core Directories

#### `/app` - Next.js App Router
```
app/
├── page.tsx                    # Landing page with sections
├── layout.tsx                  # Root layout with Clerk provider
├── globals.css                 # Global styles
├── middleware.ts               # Request middleware
├── dashboard/
│   ├── page.tsx               # Main dashboard
│   ├── admin/                 # Admin portal
│   ├── customer/              # Customer dashboard
│   │   └── new-project/       # Create new audit request
│   └── tester/                # Tester dashboard
├── sign-in/                   # Clerk auth pages
├── sign-up/
└── api/
    ├── audit-requests/        # CRUD operations for audit requests
    │   ├── route.ts
    │   └── [id]/
    ├── admin/
    │   └── audit-requests/    # Admin-specific operations
    └── debug/
        └── mongo/             # Database debugging
```

#### `/components` - Reusable UI Components
```
components/
├── audit-request-form.tsx      # Multi-step form for creating audits
├── cta-section.tsx             # Call-to-action section
├── current-task-card.tsx        # Display current task
├── dashboard-header.tsx         # Header with user info
├── dashboard-layout.tsx         # Dashboard wrapper
├── dashboard-sidebar.tsx        # Navigation sidebar with Clerk UserButton
├── footer.tsx                   # Footer section
├── header.tsx                   # Main header
├── hero-section.tsx             # Landing page hero
├── how-we-work-section.tsx      # Process explanation
├── login-form.tsx               # Login form
├── new-tasks-list.tsx           # Task list component
├── projects-list.tsx            # Projects list view
├── services-section.tsx         # Services showcase
├── testimonials-section.tsx     # User testimonials
├── theme-provider.tsx           # Theme context provider
├── why-choose-us-section.tsx    # Benefits section
└── ui/                          # Shadcn UI components
    ├── accordion.tsx
    ├── alert.tsx
    ├── avatar.tsx
    ├── button.tsx
    ├── card.tsx
    ├── checkbox.tsx
    ├── dialog.tsx
    ├── dropdown-menu.tsx
    ├── form.tsx
    ├── input.tsx
    ├── label.tsx
    ├── progress.tsx
    ├── radio-group.tsx
    ├── select.tsx
    ├── sheet.tsx
    ├── sidebar.tsx
    ├── skeleton.tsx
    ├── switch.tsx
    ├── table.tsx
    ├── tabs.tsx
    ├── textarea.tsx
    ├── toast.tsx
    └── ... (40+ UI components)
```

#### `/lib` - Utilities & Services
```
lib/
├── mongodb.ts                  # MongoDB connection handler
└── utils.ts                    # Utility functions
```

#### `/models` - Mongoose Schemas
```
models/
├── User.ts                     # User schema with role-based access
├── audit-request.ts            # Main audit request schema
├── Customer.ts                 # Customer profile
├── Tester.ts                   # Tester profile
└── Admin.ts                    # Admin profile
```

#### `/hooks` - React Custom Hooks
```
hooks/
├── use-mobile.ts              # Mobile breakpoint detection
└── use-toast.ts               # Toast notification hook
```

#### `/styles` - Styling
```
styles/
└── globals.css                # Global CSS with Tailwind directives
```

---

## 🔄 User Workflows

### 1. Customer Flow
```
Customer Sign Up
    ↓
Login via Clerk
    ↓
Create New Audit Request
    ├─ Step 1: Project Basic Info (name, category, URL)
    ├─ Step 2: Audit Standards & Methodology (WCAG, package)
    └─ Step 3: Specific Requirements (devices, instructions)
    ↓
Payment/Pricing Configuration
    ↓
Submit Request
    ↓
View My Projects Dashboard
    └─ Monitor status: pending → open → in_review → completed
```

### 2. Tester Flow
```
Tester Sign Up
    ↓
Login via Clerk
    ↓
View Available Audit Tasks (status: "open")
    ↓
Accept Task
    ├─ Assigned Status changes to "accepted"
    ├─ View pricing information
    └─ Access project details & special instructions
    ↓
Perform Manual Testing
    ├─ Status: "working"
    ├─ Test with assistive technologies
    └─ Document accessibility issues
    ↓
Submit Test Results
    └─ Status changes to "done"
```

### 3. Admin Flow
```
Admin Login
    ↓
Dashboard Overview
    ├─ View all audit requests
    └─ Manage tester assignments
    ↓
Assign Testers to Projects
    ├─ Set role: lead/member/reviewer
    ├─ Set priority
    └─ Add due dates & notes
    ↓
Monitor Progress
    └─ Track status history
    ↓
Generate & Validate AI Reports
    ├─ Trigger automated scanning
    └─ Validate AI findings
```

---

## 🔐 Authentication & Authorization

### Clerk Integration
- **Provider:** `ClerkProvider` wraps entire app
- **User Management:** Clerk handles sign-up, sign-in, MFA
- **Components Used:**
  - `useUser()` - Get current user info
  - `UserButton` - Profile & sign-out dropdown
  - `SignOutButton` - Sign-out functionality
  - `[[...sign-in]]/` & `[[...sign-up]]/` - Catch-all auth routes

### Role-Based Access
- **Roles:** `admin`, `tester`, `customer`
- **Stored in:** MongoDB User model
- **Future Implementation:** Middleware to enforce role-based access

---

## 🎨 UI/UX Features

### Responsive Design
- **Mobile-first approach** using Tailwind CSS
- **Sidebar toggle** for mobile devices
- **Viewport-aware theme colors** (light/dark mode)
- **User-scalable viewport** enabled for accessibility

### Accessibility Components Used
- **Radix UI** - All components built with ARIA attributes
- **Semantic HTML** - Main content wrapped in `<main id="main-content">`
- **Keyboard Navigation** - Built-in support from Radix UI components
- **Color Contrast** - Tailwind utility classes support WCAG AA compliance
- **Icons** - Lucide React icons (scalable SVGs)

### Dark Mode Support
- **NextThemes** - Theme persistence
- **System preference detection** - `prefers-color-scheme`
- **Light & Dark icons** - Conditional icon loading

---

## 📡 API Routes

### Public Routes
- `GET /api/audit-requests` - Get audit requests (filterable by customerId)
- `POST /api/audit-requests` - Create new audit request

### Admin Routes
- `POST /api/admin/audit-requests/[id]` - Assign testers
- `PATCH /api/admin/audit-requests/[id]/status` - Update status
- `GET /api/admin/audit-requests` - List all requests

### Debug Routes
- `GET /api/debug/mongo` - Database connection test

---

## 🔧 Key Technologies & Patterns

### Form Handling (Multi-Step Form)
- **React Hook Form** - Manages form state efficiently
- **Zod validation** - Schema-based validation
- **Step tracking** - `currentStep` state with navigation
- **Progress indicator** - Visual feedback to users

### Database Connection
- **MongoDB Atlas** - Cloud database
- **Mongoose** - Schema definition & queries
- **Connection pooling** - Handled by `connectToDatabase()`

### Security Considerations
- **Environment variables** - MongoDB URI in .env
- **Clerk authentication** - All user actions tied to Clerk userId
- **Role-based filtering** - `customerId` filtering in API routes
- **Middleware** - Next.js middleware for request processing

---

## 🚀 Service Packages Offered

### 1. **Automated Only** 🤖
- Quick scan using AI tools
- Fastest turnaround
- Best for initial assessment

### 2. **Hybrid** 🤖 + 👤
- Automated tools + User testing with disabled/elderly testers
- Combines speed with real-world accessibility feedback
- Most balanced option

### 3. **Full Expert Review** 🤖 + 👤 + 👨‍💼
- Automated + User testing + Professional analysis
- Comprehensive remediation guide
- Premium tier with deep analysis

---

## 📋 Audit Stages (Project Lifecycle)

1. **pending** - Customer submitted, awaiting admin review
2. **open** - Ready for tester assignment
3. **in_review** - Testers actively testing
4. **scheduled** - Assigned but not started
5. **completed** - Testing finished, results ready
6. **cancelled** - Project cancelled

---

## 📊 Tester Assignment & Status Tracking

### Assignment Roles
- **lead** - Primary tester, coordinates testing
- **member** - Assistant tester
- **reviewer** - Reviews findings

### Tester Work Status
- **assigned** - Admin assigned, awaiting tester acceptance
- **accepted** - Tester confirmed, ready to work
- **working** - Currently testing
- **done** - Completed testing
- **removed** - Removed from project

### Status History
Each status change is recorded with:
- Previous status → New status
- Timestamp
- Changed by (admin ID)
- Optional notes

---

## 🌐 Supported Audit Categories

1. **Website** - Web applications & websites
2. **Mobile** - iOS/Android applications
3. **Physical** - Physical spaces & facilities

---

## 🛠️ Configuration Files

### `next.config.mjs` / `next.config.ts`
- Next.js configuration
- Build optimizations

### `tsconfig.json`
- TypeScript configuration
- Path aliases (`@/components`, `@/lib`, etc.)

### `components.json`
- Shadcn/ui configuration
- Styling preferences (New York style)
- Tailwind setup
- Icon library (Lucide)

### `postcss.config.mjs`
- PostCSS configuration
- Tailwind CSS integration

### `eslint.config.mjs`
- ESLint rules
- Code quality standards

---

## 📦 Dependencies Overview

### Key Dependencies (58 packages)
- **React Ecosystem:** React, React DOM, React Hook Form
- **Styling:** Tailwind CSS, PostCSS, Autoprefixer
- **UI Components:** Radix UI (40+ components), Shadcn/ui
- **Database:** Mongoose
- **Authentication:** Clerk
- **Form Validation:** Zod, Hookform/Resolvers
- **Utilities:** Date-fns, Clsx, Tailwind Merge
- **Icons & Visualization:** Lucide React, Recharts
- **Notifications:** Sonner
- **Analytics:** Vercel Analytics

---

## 🎯 Future Enhancements

### Planned Features
- [ ] Advanced filtering & search in audit request lists
- [ ] Real-time notifications for status updates
- [ ] Detailed accessibility reports with recommendations
- [ ] Integration with automated testing tools (Axe, WAVE, etc.)
- [ ] Payment gateway integration
- [ ] Analytics & reporting dashboard
- [ ] Mobile app version
- [ ] Multi-language support
- [ ] Advanced scheduling & calendar integration
- [ ] Tester rating & review system
- [ ] Project templates for common use cases
- [ ] Bulk operations for admin

---

## 🔍 WCAG Compliance Focus

### Current Implementation
- ✅ Semantic HTML (`<main id="main-content">`)
- ✅ Accessible components (Radix UI)
- ✅ Keyboard navigation support
- ✅ Color contrast via Tailwind utilities
- ✅ Responsive design for all screen sizes
- ✅ User-scalable viewport
- ✅ Theme color detection

### Accessibility Testing (Built-in Purpose)
The platform itself serves as an accessibility testing tool:
- Allows manual testing by disabled users
- Combines automated scanning with human feedback
- Provides comprehensive accessibility audit reports
- Guides remediation for accessibility issues

---

## 📞 Support & Documentation

### Learning Resources
- Next.js: https://nextjs.org/docs
- React: https://react.dev
- Radix UI: https://www.radix-ui.com
- Tailwind CSS: https://tailwindcss.com
- MongoDB: https://docs.mongodb.com
- Clerk: https://clerk.com/docs

### Development Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

---

## 📌 Summary

**AttestHub** is a modern, accessible web platform designed to help organizations achieve WCAG compliance by combining:
- **Automated accessibility scanning** (AI tools)
- **Manual testing from real users** (disabled & elderly testers)
- **Expert professional guidance**

Built with cutting-edge technologies (Next.js, React, TypeScript, Tailwind CSS), the platform prioritizes accessibility itself while providing comprehensive accessibility audit services. The role-based system enables customers, testers, and administrators to collaborate      efficiently in the accessib     ility testing process.
                

                