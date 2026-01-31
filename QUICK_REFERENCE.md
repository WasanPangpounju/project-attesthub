# 📖 AttestHub Quick Reference Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (or use `pnpm`)
- MongoDB Atlas account
- Clerk account for authentication
- Environment variables configured

### Installation
```bash
# Install dependencies
pnpm install

# Set up environment variables
# Create .env.local with:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
# CLERK_SECRET_KEY=...
# MONGODB_URI=...

# Run development server
pnpm dev

# Open http://localhost:3000
```

---

## 📊 Project Structure At a Glance

```
attesthub/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page
│   ├── layout.tsx         # Root layout with Clerk
│   ├── dashboard/         # Dashboard pages
│   ├── sign-in/           # Auth pages (Clerk)
│   ├── sign-up/
│   ├── api/               # API routes
│   └── globals.css        # Global styles
│
├── components/            # Reusable components
│   ├── audit-request-form.tsx  # Multi-step form
│   ├── dashboard-*        # Dashboard components
│   └── ui/                # 45+ Shadcn/Radix UI components
│
├── lib/
│   ├── mongodb.ts         # DB connection
│   └── utils.ts           # Helpers
│
├── models/                # Mongoose schemas
│   ├── User.ts
│   ├── audit-request.ts   # Main model
│   ├── Customer.ts
│   ├── Tester.ts
│   └── Admin.ts
│
├── hooks/                 # Custom React hooks
│   ├── use-mobile.ts
│   └── use-toast.ts
│
├── styles/                # Styling
│   └── globals.css
│
└── public/                # Static assets
```

---

## 🔑 Key Files to Understand

| File | Purpose | Lines |
|------|---------|-------|
| [app/page.tsx](app/page.tsx) | Landing page | 25 |
| [app/layout.tsx](app/layout.tsx) | Root layout, Clerk setup | 50 |
| [models/audit-request.ts](models/audit-request.ts) | Core data model | 166 |
| [app/api/audit-requests/route.ts](app/api/audit-requests/route.ts) | Main API | 121 |
| [components/audit-request-form.tsx](components/audit-request-form.tsx) | Multi-step form | 641 |
| [components/dashboard-sidebar.tsx](components/dashboard-sidebar.tsx) | Navigation | 127 |
| [package.json](package.json) | Dependencies | ~58 packages |

---

## 👥 Three User Types

### 1. **CUSTOMER** 🏢
- ✅ Creates audit requests
- ✅ Views their projects
- ✅ Tracks progress
- ✅ Receives reports
- ❌ Cannot assign testers
- **Dashboard:** `/dashboard/customer`

### 2. **TESTER** 👤
- ✅ Views available tasks
- ✅ Accepts projects
- ✅ Performs manual testing
- ✅ Submits findings
- ❌ Cannot see other testers' tasks
- **Dashboard:** `/dashboard/tester`

### 3. **ADMIN** 👨‍💼
- ✅ Views all projects
- ✅ Assigns testers
- ✅ Manages status
- ✅ Generates AI reports
- ✅ Manages all users
- **Dashboard:** `/dashboard/admin`

---

## 🗄️ Main Database Model

### AuditRequest (Most Important)
```typescript
{
  // Project Info
  customerId: string,
  projectName: string,
  serviceCategory: "website" | "mobile" | "physical",
  targetUrl: string,
  
  // Audit Config
  accessibilityStandard: string,      // WCAG version
  servicePackage: "automated" | "hybrid" | "expert",
  
  // Pricing
  priceAmount: number,                 // in cents
  priceCurrency: "THB" | "USD",
  
  // Status Workflow
  status: "pending" | "open" | "in_review" | "scheduled" | "completed" | "cancelled",
  statusHistory: [{from, to, changedAt, changedBy}],
  
  // Testers
  assignedTesters: [{
    testerId: string,
    role: "lead" | "member" | "reviewer",
    workStatus: "assigned" | "accepted" | "working" | "done" | "removed"
  }],
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔄 Common Workflows

### Create New Audit Request (Customer)
```
1. Login via Clerk
2. Navigate to /dashboard/customer/new-project
3. Fill multi-step form:
   - Step 1: Project name, category, target URL
   - Step 2: WCAG level, service package
   - Step 3: Devices, instructions, files
4. Submit
5. POST /api/audit-requests
6. Save to MongoDB
7. Status = "pending"
```

### Assign Tester (Admin)
```
1. Admin views project
2. Click "Assign Tester"
3. Select tester from list
4. Choose role: lead/member/reviewer
5. Set priority & due date
6. Submit
7. POST /api/admin/audit-requests/[id]
8. Update assignedTesters array
9. Send notification to tester
```

### Accept & Complete Task (Tester)
```
1. Tester sees task in "open" status
2. Click "Accept Task"
3. PATCH status: assigned → accepted
4. Perform manual testing
5. Document findings
6. Submit results
7. PATCH status: accepted → done
8. Admin reviews findings
9. Generate final report
```

---

## 🛠️ Tech Stack Highlights

### Frontend
- **Next.js 16** - React framework with Server Components
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Utility CSS
- **Radix UI** - Accessible components

### Backend
- **Next.js API Routes** - Serverless backend
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **Clerk** - Authentication

### Forms & Validation
- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **React Hook Form Resolvers** - Integration

### UI Components
- **Shadcn/ui** - Pre-built components
- **Radix UI** - Primitive accessible components
- **Lucide React** - Icons
- **Recharts** - Data visualization
- **Sonner** - Toast notifications

---

## 📱 Responsive Design Breakpoints

Using Tailwind CSS:
```
mobile      < 640px        // Default
sm          ≥ 640px
md          ≥ 768px
lg          ≥ 1024px       // Sidebar becomes static
xl          ≥ 1280px
2xl         ≥ 1536px
```

The dashboard uses:
- `fixed top-0 left-0` on mobile (overlay)
- `lg:static` on large screens (permanent sidebar)

---

## 🎨 Accessibility Features Already Built-In

✅ Semantic HTML
- `<main id="main-content">`
- Proper heading hierarchy
- `<header>`, `<footer>`, `<nav>`

✅ Keyboard Navigation
- All Radix UI components keyboard accessible
- Tab order correct
- Focus indicators visible

✅ Screen Reader Support
- ARIA labels where needed
- Descriptive button/link text
- Role attributes

✅ Color Contrast
- Tailwind utilities support WCAG AA
- Dark mode support
- User-selectable theme

✅ Responsive Design
- Mobile-first approach
- Touch-friendly targets (48x48px minimum)
- Flexible layouts

✅ Assistive Tech Compatible
- Voice control compatible
- Switch control compatible
- Zoom/magnification friendly

---

## 📡 API Endpoints Reference

### Public Routes
```
GET  /api/audit-requests                    # List (filtered by customerId)
GET  /api/audit-requests?customerId=xxx
POST /api/audit-requests                    # Create
GET  /api/audit-requests/[id]               # Get one
PATCH /api/audit-requests/[id]              # Update
DELETE /api/audit-requests/[id]             # Delete
```

### Admin Routes
```
GET  /api/admin/audit-requests              # All projects
POST /api/admin/audit-requests/[id]         # Assign tester
PATCH /api/admin/audit-requests/[id]/status # Update status
GET  /api/admin/audit-requests/[id]/report  # Generate report
```

### Debug Routes
```
GET  /api/debug/mongo                       # Test DB connection
```

---

## 🔐 Authentication Flow

### With Clerk
```
1. User visits /sign-up
2. Clerk handles signup (email verification, etc.)
3. User redirected to dashboard
4. useUser() hook retrieves Clerk user info
5. Create/link User in MongoDB
6. Store role in MongoDB (admin/tester/customer)
7. useUser() used for authorization on routes
8. Middleware can check roles

Protected routes:
- /dashboard/* requires authentication
- /sign-in & /sign-up redirect if already signed in
```

---

## 🎯 Service Packages Explained

### Automated Only 🤖 (~1-2 hours)
- AI scanning
- Issue detection
- No manual testing
- Fast, cheap
- ~40% issue coverage

### Hybrid 🤖 + 👤 (~3-7 days)
- AI scanning
- Manual testing (2-3 real users)
- Expert prioritization
- Balanced quality/cost
- ~90% issue coverage

### Full Expert 🤖 + 👤 + 👨‍💼 (~10-15 days)
- Everything above
- Professional analysis
- Remediation guide
- Strategic roadmap
- Training support
- ~100% issue coverage

---

## 📊 Status Workflow

```
pending          ← Customer submits
   ↓
open             ← Admin assigns testers
   ↓
in_review        ← Testers actively testing
   ↓
scheduled        ← Assigned, waiting to start (optional)
   ↓
completed        ← All testing done, report ready
   ↓
[archived]

[cancelled]      ← Can be cancelled at any point
```

---

## 🚨 Common Issues & Solutions

### Authentication Not Working
```
❌ Problem: useUser() returns null
✅ Solution:
   1. Check Clerk keys in .env.local
   2. Ensure ClerkProvider wraps app
   3. Check user is actually signed in
   4. Clear browser cache & cookies
```

### Database Connection Fails
```
❌ Problem: MongoDB connection timeout
✅ Solution:
   1. Check MONGODB_URI in .env.local
   2. Verify IP whitelist in MongoDB Atlas
   3. Check network connectivity
   4. Try connecting with MongoDB Compass
```

### Form Validation Not Working
```
❌ Problem: Errors not showing
✅ Solution:
   1. Check Zod schema matches form data
   2. Verify resolver is set in useForm
   3. Check error display JSX
   4. Look at browser console for schema errors
```

### UI Components Not Displaying
```
❌ Problem: Component not visible/styled
✅ Solution:
   1. Check component is imported correctly
   2. Verify Tailwind CSS is loaded
   3. Check className is applied
   4. Look for CSS conflicts
   5. Verify Shadcn/ui component installed
```

---

## 📚 Learn More

### WCAG & Accessibility
- 📘 [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- 📘 [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- 📘 [WebAIM Resources](https://webaim.org/)
- 📘 [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Technologies
- 📘 [Next.js Documentation](https://nextjs.org/docs)
- 📘 [React Documentation](https://react.dev)
- 📘 [Radix UI Components](https://www.radix-ui.com)
- 📘 [Tailwind CSS](https://tailwindcss.com)
- 📘 [MongoDB Documentation](https://docs.mongodb.com)
- 📘 [Clerk Documentation](https://clerk.com/docs)

### UI Components
- 📘 [Shadcn/ui](https://ui.shadcn.com)
- 📘 [Lucide Icons](https://lucide.dev)
- 📘 [React Hook Form](https://react-hook-form.com)
- 📘 [Zod Validation](https://zod.dev)

---

## 💡 Pro Tips

1. **For Dark Mode**
   - Used `next-themes` for persistence
   - Check `useTheme()` hook in components
   - Tailwind supports `dark:` prefix

2. **For Responsive Design**
   - Mobile-first: styles apply to all, then override with `lg:`
   - Use `hidden lg:block` for desktop-only content
   - Test on actual mobile devices

3. **For Accessibility Testing**
   - Always test keyboard-only navigation
   - Use NVDA (free screen reader) regularly
   - Check color contrast with tools like WebAIM
   - Validate HTML with W3C validator

4. **For Performance**
   - Use Server Components where possible (Next.js default)
   - Client components only when needed (`"use client"`)
   - Lazy load images and heavy components
   - Use Next.js Image component for optimization

5. **For Debugging**
   - Use React DevTools browser extension
   - Check MongoDB logs in Atlas dashboard
   - Use `console.log()` strategically
   - Use Next.js preview mode for testing

---

## ✅ Pre-Launch Checklist

- [ ] All dependencies installed (`pnpm install`)
- [ ] Environment variables configured (.env.local)
- [ ] MongoDB Atlas set up with collections
- [ ] Clerk configured with social providers
- [ ] Local development server runs without errors
- [ ] All pages accessible without auth errors
- [ ] Form submission works end-to-end
- [ ] Database saves data correctly
- [ ] API routes respond correctly
- [ ] Mobile responsive design tested
- [ ] Dark mode works properly
- [ ] Accessibility features tested (keyboard, screen reader)
- [ ] No console errors or warnings
- [ ] All links work correctly
- [ ] Images load properly

---

## 📞 Quick Support

For issues, check these files in order:
1. Console errors in browser DevTools
2. Server logs in terminal
3. MongoDB Atlas logs
4. Clerk logs in dashboard
5. [PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md) - Full documentation
6. [ARCHITECTURE.md](ARCHITECTURE.md) - System design
7. [WCAG_METHODOLOGY.md](WCAG_METHODOLOGY.md) - Accessibility details

---

**Happy Coding! 🚀**
