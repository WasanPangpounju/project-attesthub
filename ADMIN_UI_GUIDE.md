# Admin Project Management - Visual Guide & Screenshots

## 📺 User Interface Overview

### Screen 1: Admin Dashboard (List View)
```
┌─────────────────────────────────────────────────────────────────────┐
│ Admin Dashboard                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ [☰] Dashboard › Admin › Recent Projects    [🔍 Search projects...] │
│                                                                      │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐ │
│ │ Active Audits: 5   │ │ Pending: 2         │ │ Completed: 8       │ │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘ │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Project Table:                                                   │ │
│ ├──────────────┬───────────┬──────────┬─────────┬──────────┬─────┤ │
│ │ Name         │ Customer  │ Testers  │ AI %    │ Status   │ Act.│ │
│ ├──────────────┼───────────┼──────────┼─────────┼──────────┼─────┤ │
│ │ E-commerce   │ cust_001  │ tester1  │ 85%     │ In Rev.. │[View]│
│ │ Mobile App   │ cust_002  │ 2 + 1    │ 92%     │ Open     │[View]│ ← CLICK VIEW
│ │ Website A    │ cust_003  │ tester3  │ 78%     │ Done     │[View]│
│ └──────────────┴───────────┴──────────┴─────────┴──────────┴─────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Screen 2: Project Detail Page - View Mode (Top)
```
┌─────────────────────────────────────────────────────────────────────┐
│ [←] E-Commerce Website Audit                       [✎ Edit]        │
│     ID: 63f8a2b1c5d2e1f4a3b5c6d7                                    │
│                                                                      │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│ │Status: [Open]           │Priority: [High]                       │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘       │
│                                                                      │
│ [General] [Testers] [Timeline] [Notes]  ← TABS                     │
│                                                                      │
│ ╔═════════════════════════════════════════════════════════════════╗ │
│ ║ Project Information                                             ║ │
│ ╟─────────────────────────────────────────────────────────────────╢ │
│ ║ Customer ID: cust_001                                           ║ │
│ ║ Service Category: Website                                       ║ │
│ ║ Target URL: https://example-ecommerce.com                      ║ │
│ ║ Location: Bangkok, Thailand                                     ║ │
│ ║ Accessibility Standard: WCAG 2.1 AA                            ║ │
│ ║ Devices: Desktop, Tablet, Mobile                               ║ │
│ ║                                                                  ║ │
│ ║ Special Instructions:                                           ║ │
│ ║ Focus on checkout flow and payment form accessibility          ║ │
│ ║ Test with screen readers NVDA and JAWS                         ║ │
│ ╚═════════════════════════════════════════════════════════════════╝ │
│                                                                      │
│ ╔═════════════════════════════════════════════════════════════════╗ │
│ ║ Pricing & Payment                                               ║ │
│ ╟─────────────────────────────────────────────────────────────────╢ │
│ ║ Amount: 15,000.00 THB    Currency: THB    AI Status: Generated ║ │
│ ║ Price Note: Includes 5 days of manual testing                  ║ │
│ ╚═════════════════════════════════════════════════════════════════╝ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Screen 3: Testers Tab
```
┌─────────────────────────────────────────────────────────────────────┐
│ [General] [Testers] [Timeline] [Notes]                             │
│                                                                      │
│ ╔═════════════════════════════════════════════════════════════════╗ │
│ ║ Assigned Testers (3 assigned to this project)                   ║ │
│ ╟─────────────────────────────────────────────────────────────────╢ │
│ ║                                                                  ║ │
│ ║ Tester: tester_001                                              ║ │
│ ║ Role: [Lead]    Status: [Working]                              ║ │
│ ║ Note: Testing main flow and accessibility features             ║ │
│ ║ Assigned: 2024-01-25   Accepted: 2024-01-25   Completed: —     ║ │
│ ║                                                                  ║ │
│ ║ ─────────────────────────────────────────────────────────────── ║ │
│ ║                                                                  ║ │
│ ║ Tester: tester_002                                              ║ │
│ ║ Role: [Member]  Status: [Working]                              ║ │
│ ║ Note: Focusing on mobile responsiveness with screen reader    ║ │
│ ║ Assigned: 2024-01-25   Accepted: 2024-01-25   Completed: —     ║ │
│ ║                                                                  ║ │
│ ║ ─────────────────────────────────────────────────────────────── ║ │
│ ║                                                                  ║ │
│ ║ Tester: tester_003                                              ║ │
│ ║ Role: [Reviewer]  Status: [Done]                               ║ │
│ ║ Note: Reviewed initial findings                                 ║ │
│ ║ Assigned: 2024-01-26   Accepted: 2024-01-26   Completed: 2024-01-27 ║
│ ║                                                                  ║ │
│ ╚═════════════════════════════════════════════════════════════════╝ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Screen 4: Timeline Tab
```
┌─────────────────────────────────────────────────────────────────────┐
│ [General] [Testers] [Timeline] [Notes]                             │
│                                                                      │
│ ╔═════════════════════════════════════════════════════════════════╗ │
│ ║ Status History                                                  ║ │
│ ╟─────────────────────────────────────────────────────────────────╢ │
│ ║   ●                                                              ║ │
│ ║   │  pending                                                     ║ │
│ ║   │  2024-01-25 08:30 AM                                        ║ │
│ ║   │                                                              ║ │
│ ║   ├──────                                                        ║ │
│ ║   │                                                              ║ │
│ ║   ●  pending → open                                             ║ │
│ ║   │  2024-01-25 10:15 AM                                        ║ │
│ ║   │  Changed by: admin_user                                     ║ │
│ ║   │  Waiting for tester confirmation                            ║ │
│ ║   │                                                              ║ │
│ ║   ├──────                                                        ║ │
│ ║   │                                                              ║ │
│ ║   ●  open → in_review                                           ║ │
│ ║   │  2024-01-25 14:00 PM                                        ║ │
│ ║   │  Changed by: admin_user                                     ║ │
│ ║   │  Testing has started                                        ║ │
│ ║   │                                                              ║ │
│ ║   ├──────                                                        ║ │
│ ║   │                                                              ║ │
│ ║   ●  in_review → scheduled                                      ║ │
│ ║      2024-01-26 09:00 AM                                        ║ │
│ ║      Changed by: admin_user                                     ║ │
│ ║      Scheduled for final review                                 ║ │
│ ║                                                                  ║ │
│ ╠═════════════════════════════════════════════════════════════════╣ │
│ ║ Dates                                                           ║ │
│ ╟─────────────────────────────────────────────────────────────────╢ │
│ ║ Created: 2024-01-25 08:30 AM                                    ║ │
│ ║ Updated: 2024-01-26 09:00 AM                                    ║ │
│ ║ Due Date: 2024-02-01                                            ║ │
│ ╚═════════════════════════════════════════════════════════════════╝ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Screen 5: Edit Mode
```
┌─────────────────────────────────────────────────────────────────────┐
│ [←] E-Commerce Website Audit                [✗ Cancel Edit]        │
│     ID: 63f8a2b1c5d2e1f4a3b5c6d7                                    │
│                                                                      │
│ ╔═════════════════════════════════════════════════════════════════╗ │
│ ║ Edit Project Details                                            ║ │
│ ╟─────────────────────────────────────────────────────────────────╢ │
│ ║                                                                  ║ │
│ ║ Project Name:                                                   ║ │
│ ║ [E-Commerce Website Audit                              ]       ║ │
│ ║                                                                  ║ │
│ ║ Status:                          Priority:                      ║ │
│ ║ [v Open        ]                 [v High         ]              ║ │
│ ║                                                                  ║ │
│ ║ Due Date:                                                       ║ │
│ ║ [2024-02-01                                        ]            ║ │
│ ║                                                                  ║ │
│ ║ ┌───────────────────────────────────────────────────────────┐  ║ │
│ ║ │ Pricing Information                                       │  ║ │
│ ║ ├───────────────────────────────────────────────────────────┤  ║ │
│ ║ │ Amount: [15000.00]  Currency: [v THB]  Calculated: 15000  │  ║ │
│ ║ │                                                            │  ║ │
│ ║ │ Price Note:                                               │  ║ │
│ ║ │ [Includes 5 days of manual testing and expert review    ] │  ║ │
│ ║ └───────────────────────────────────────────────────────────┘  ║ │
│ ║                                                                  ║ │
│ ║ ┌───────────────────────────────────────────────────────────┐  ║ │
│ ║ │ AI Report Settings                                        │  ║ │
│ ║ ├───────────────────────────────────────────────────────────┤  ║ │
│ ║ │ AI Confidence (%): [85]  Status: [v Generated]            │  ║ │
│ ║ └───────────────────────────────────────────────────────────┘  ║ │
│ ║                                                                  ║ │
│ ║ Admin Notes:                                                    ║ │
│ ║ ┌───────────────────────────────────────────────────────────┐  ║ │
│ ║ │ Important: Focus on checkout accessibility               │  ║ │
│ ║ │ Testers should verify payment form with NVDA and JAWS    │  ║ │
│ ║ │ Customer requires final report by 2024-02-01             │  ║ │
│ ║ └───────────────────────────────────────────────────────────┘  ║ │
│ ║                                                                  ║ │
│ ║                        [Cancel]  [💾 Save Changes]              ║ │
│ ╚═════════════════════════════════════════════════════════════════╝ │
│                                                                      │
│ ✓ Project updated successfully (Toast notification)                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 🎨 Color Coding Reference

### Status Badges
```
Pending     → Yellow background, yellow text
Open        → Blue background, blue text
In Review   → Purple background, purple text
Scheduled   → Purple background, purple text
Completed   → Green background, green text
Cancelled   → Red background, red text
```

### Priority Badges
```
Urgent      → Red background, red text
High        → Orange background, orange text
Normal      → Blue background, blue text
Low         → Gray background, gray text
```

### Tester Status (in Testers tab)
```
assigned    → Gray
accepted    → Gray
working     → Blue
done        → Green
removed     → Red
```

## 🔄 Complete User Journey

### Step-by-Step: Admin Viewing and Editing a Project

```
START
  │
  ├─→ Admin logs in
  │
  ├─→ Navigate to Admin Dashboard
  │     /dashboard/admin
  │
  ├─→ See list of projects in table
  │
  ├─→ Find "Mobile App" project
  │
  ├─→ Click [View] button
  │     Navigation: /dashboard/admin/projects/63f8...
  │
  ├─→ Page loads with "Mobile App" details
  │     - Displays 4 tabs: General | Testers | Timeline | Notes
  │     - Shows quick stat cards
  │     - General tab is default
  │
  ├─→ Admin reviews project info
  │     - Reads target URL
  │     - Checks accessibility standard
  │     - Reviews special instructions
  │     - Sees pricing (5000 THB)
  │     - Checks AI confidence (92%)
  │
  ├─→ Admin clicks [Testers] tab
  │     - Sees 2 testers assigned
  │     - Notes one is "Lead", one is "Member"
  │     - Both are "Working"
  │     - Reviews their notes
  │
  ├─→ Admin clicks [Timeline] tab
  │     - Sees status history with dates
  │     - Status: pending → open → in_review → scheduled
  │     - Each change has timestamp and note
  │
  ├─→ Admin sees status needs updating
  │
  ├─→ Admin clicks [✎ Edit] button
  │     - Form appears
  │     - All fields are now editable
  │     - Current values pre-filled
  │
  ├─→ Admin makes changes:
  │     - Changes Status from "scheduled" to "in_review"
  │     - Changes Priority from "normal" to "urgent"
  │     - Updates Due Date to 2024-02-05
  │     - Adds note: "Testers reported critical issues - need fix & retest"
  │
  ├─→ Admin clicks [Save Changes]
  │     - Button shows loading spinner
  │     - Request sent: PATCH /api/audit-requests/63f8...
  │     - Backend validates and updates
  │     - Status history entry added automatically
  │
  ├─→ API responds with success
  │     - Toast notification: "Project updated successfully" ✓
  │
  ├─→ Page reloads
  │     - Data refreshed
  │     - Returns to View mode
  │     - Status card now shows "in_review"
  │     - Priority card shows "Urgent"
  │
  ├─→ Admin verifies changes look correct
  │
  ├─→ Admin checks [Timeline] tab
  │     - New entry added at top:
  │       "scheduled → in_review"
  │       "2024-01-27 3:45 PM"
  │       "Changed by: admin"
  │       "Testers reported critical issues - need fix & retest"
  │
  ├─→ Admin is satisfied
  │
  ├─→ Admin clicks [←] Back button
  │     - Returns to /dashboard/admin
  │
  ├─→ Checks projects list
  │     - "Mobile App" now shows "In Rev.." status
  │     - Updates are live in table
  │
  └─→ END

Note: If API error occurs at save step:
  - Toast error message displays
  - Form stays in edit mode
  - Admin can fix and retry
  - No data is lost
```

## 📱 Responsive Behavior

### Desktop (≥1024px)
- Sidebar is permanent on left
- All content visible, clean layout
- Table displays all columns
- Forms have side-by-side fields

### Tablet (768px - 1023px)
- Sidebar becomes collapsible
- Hamburger menu visible
- Content takes more space
- Some form fields stack

### Mobile (<768px)
- Sidebar is overlay/drawer
- Hamburger menu always visible
- Tables scroll horizontally
- Form fields stack vertically
- Touch-friendly button sizes
- Text scales for readability

## 🧪 Testing Scenarios

### Scenario 1: Happy Path
```
Admin views project → Reviews details in all tabs 
→ Clicks Edit → Changes multiple fields 
→ Saves successfully → Returns to dashboard
EXPECTED: All changes persisted, no errors
```

### Scenario 2: Status Change Audit
```
Admin changes status from "open" to "in_review"
EXPECTED: 
- Status history entry created automatically
- Old status "open" stored in "from" field
- New status "in_review" stored in "to" field
- Timestamp recorded
- Entry visible in Timeline tab
```

### Scenario 3: Error Handling
```
Admin tries to save with invalid data
OR API fails midway
EXPECTED:
- Error toast notification
- Form stays in edit mode
- User can retry
- No partial updates
```

### Scenario 4: Edit Cancellation
```
Admin clicks Edit → Makes some changes 
→ Clicks Cancel
EXPECTED:
- Returns to view mode
- Changes are discarded
- Original data still shows
```

## 🎯 Key Features Summary

✅ **View Multiple Tabs**
- General info with project details
- Testers with detailed status and dates
- Timeline with status history
- Notes section

✅ **Edit Major Fields**
- Project name
- Status with automatic history
- Priority level
- Due date
- Pricing details
- AI confidence
- Admin notes

✅ **Data Integrity**
- Read-only MongoDB ObjectId validation
- Status changes are tracked
- All edits timestamped
- No unauthorized field changes

✅ **User Experience**
- Smooth transitions between view/edit
- Toast notifications
- Loading states
- Clear navigation
- Mobile responsive
- Accessible UI components
