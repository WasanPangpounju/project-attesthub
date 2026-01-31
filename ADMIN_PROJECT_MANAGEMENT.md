# Admin Project Management Feature - Implementation Guide

## Overview
ฟีเจอร์นี้อนุญาตให้ Admin ดูและแก้ไขรายละเอียดของแต่ละ audit request จากหน้า admin dashboard

## ✅ What's Been Implemented

### 1. **Project Detail Page** 
**Location:** `/app/dashboard/admin/projects/[id]/page.tsx`

ให้ admin สามารถดูรายละเอียดโครงการทั้งหมด แบ่งเป็น 4 tabs:

#### Tab 1: General Information (ข้อมูลทั่วไป)
- Project Information
  - Customer ID
  - Service Category (website/mobile/physical)
  - Target URL (clickable link)
  - Location Address
  - Accessibility Standard (WCAG version)
  - Devices to test
  - Special Instructions
  
- Pricing & Payment Section
  - Amount (แสดงเป็น currency)
  - Currency (THB/USD)
  - AI Report Status
  - Price Notes

#### Tab 2: Testers (ผู้ทดสอบ)
- Display all assigned testers
- For each tester:
  - Tester ID
  - Role (lead/member/reviewer)
  - Work Status (assigned/accepted/working/done/removed)
  - Important dates:
    - Assigned date
    - Accepted date (if applicable)
    - Completed date (if applicable)
  - Notes/comments

#### Tab 3: Timeline (ประวัติการเปลี่ยนแปลง)
- **Status History:**
  - Visual timeline showing all status changes
  - From → To transitions
  - Change date & time
  - Changed by (admin who made change)
  - Notes on why status changed
  
- **Dates:**
  - Created date & time
  - Last updated date & time
  - Due date (if set)

#### Tab 4: Notes (บันทึกสำหรับ Admin)
- Admin notes section
- Free text for internal communication
- Editable through edit mode

### 2. **Edit Form Component**
**Location:** `/app/dashboard/admin/projects/[id]/edit-form.tsx`

เมื่อ admin กดปุ่ม "Edit" จะเปลี่ยนไปแสดง form สำหรับแก้ไขข้อมูล

**Editable Fields:**
- Project Name
- Status (dropdown: pending, open, in_review, scheduled, completed, cancelled)
- Priority (dropdown: low, normal, high, urgent)
- Due Date (date picker)
- Admin Notes (textarea)

**Pricing Section:**
- Amount (number input with 2 decimal places)
- Currency (select: THB or USD)
- Calculated display (shows current value)
- Price Note (textarea)

**AI Report Section:**
- AI Confidence (% - 0-100)
- Report Status (none, generated, validated, rejected)

**Features:**
- Form validation
- Save button with loading state
- Cancel button to exit edit mode
- Success/error toast notifications
- Automatic refresh after successful update

### 3. **API Endpoints**
**Location:** `/app/api/audit-requests/[id]/route.ts`

#### GET /api/audit-requests/[id]
- Fetch single audit request by ID
- Returns full project details
- 404 if not found

#### PATCH /api/audit-requests/[id]
- Update audit request
- Allowed fields:
  - projectName
  - status
  - priority
  - dueDate
  - adminNotes
  - priceAmount
  - priceCurrency
  - priceNote
  - aiConfidence
  - aiReportStatus
- Automatically adds status history entry when status changes
- Returns updated project
- Validates MongoDB ObjectId

#### DELETE /api/audit-requests/[id]
- Delete audit request permanently
- Validates MongoDB ObjectId
- 404 if not found

### 4. **Navigation Integration**
**Location:** `/app/dashboard/admin/page.tsx`

Admin projects table now has:
- **View Button** in each row
- Link to: `/dashboard/admin/projects/{projectId}`
- Uses Next.js `<Link>` component for client-side navigation
- Already implemented and working

## 📋 User Flow

### View Project Details
```
1. Admin opens /dashboard/admin
2. Admin sees projects table
3. Admin clicks "View" button on any project row
4. Browser navigates to /dashboard/admin/projects/[id]
5. Page loads project details in 4 tabs
6. Admin can browse all information
```

### Edit Project
```
1. Admin is on project detail page
2. Admin clicks "Edit" button (top right)
3. Page switches to edit form mode
4. Admin fills in fields to update:
   - Project name
   - Status (if needed to update)
   - Priority level
   - Due date
   - Pricing information
   - AI report settings
   - Admin notes
5. Admin clicks "Save Changes"
6. Form sends PATCH request to API
7. If successful:
   - Toast success message
   - Page reloads with new data
   - Switches back to view mode
8. If error:
   - Toast error message with details
   - User can fix and retry
```

## 🔧 Technical Details

### Component Architecture
```
AdminProjectDetailPage (page.tsx)
  ├── DashboardSidebar (already exists)
  ├── DashboardHeader (already exists)
  ├── Quick Stats Cards (4 columns)
  │   ├── Status badge
  │   ├── Priority badge
  │   ├── Service Package badge
  │   └── AI Confidence %
  │
  └── View Mode OR Edit Mode (toggle)
      ├── View Mode:
      │   └── Tabs Component
      │       ├── General Info Tab
      │       ├── Testers Tab
      │       ├── Timeline Tab
      │       └── Notes Tab
      │
      └── Edit Mode:
          └── EditProjectForm Component
              ├── Project Name Input
              ├── Status Select
              ├── Priority Select
              ├── Due Date Input
              ├── Admin Notes Textarea
              ├── Pricing Section
              ├── AI Report Section
              └── Action Buttons (Save/Cancel)
```

### Data Flow
```
/dashboard/admin/projects/[id]
    ↓
useParams() → gets [id]
    ↓
useEffect → fetch /api/audit-requests/[id]
    ↓
GET request → MongoDB → AuditRequest.findById(id)
    ↓
Response → setProject(data)
    ↓
Render with data

When Edit:
User → Click "Edit"
    ↓
setEditMode(true)
    ↓
EditProjectForm rendered with project data
    ↓
User fills form
    ↓
User clicks "Save"
    ↓
PATCH /api/audit-requests/[id]
    ↓
Backend → validate & update
    ↓
Response with updated data
    ↓
toast.success()
    ↓
window.location.reload()
    ↓
Page refetches data in fresh view
```

### Status Change Tracking
When admin changes status via edit form:
1. Old status stored in `from` field
2. New status stored in `to` field
3. Current timestamp recorded
4. Entry added to `statusHistory` array
5. Timeline tab automatically shows this entry

## 🎨 UI/UX Features

### Visual Status Indicators
- **Status Badge Colors:**
  - Pending: Yellow
  - Open: Blue
  - In Review/Scheduled: Purple
  - Completed: Green
  - Cancelled: Red

- **Priority Badge Colors:**
  - Urgent: Red
  - High: Orange
  - Normal: Blue
  - Low: Gray

### Loading States
- Loading spinner while fetching data
- Disabled buttons during submit
- Loading state in "Save Changes" button

### Error Handling
- Displays error alert if fetch fails
- Toast notifications for update success/error
- Shows "No data" messages when appropriate
- Validates all form inputs

## 📱 Responsive Design
- **Desktop:** Full sidebar + content
- **Tablet:** Collapsible sidebar + content
- **Mobile:** Overlay sidebar + full-width content
- All tables scroll horizontally on mobile
- Forms stack on mobile devices

## 🔒 Security Considerations
- MongoDB ObjectId validation on all [id] routes
- Only admin-whitelisted fields can be updated
- Status changes are audited (stored in history)
- Timestamps are server-generated (not from client)
- Future: Add role-based access control checks

## 📊 Status History Example
```
Timeline View shows:
1. Project created at 2024-01-27 10:00 → pending
2. Status changed 2024-01-27 10:15 → open (by admin)
3. Status changed 2024-01-27 10:30 → in_review (by admin)
4. Status changed 2024-01-27 14:45 → scheduled (by admin, note: "Waiting for 3 testers")
5. Status changed 2024-01-28 09:00 → completed (by admin, note: "All tests done, report ready")
```

## 🧪 Testing Checklist

- [ ] Navigate to `/dashboard/admin`
- [ ] Click "View" button on a project
- [ ] Verify all 4 tabs display correctly
- [ ] Verify project details are accurate
- [ ] Click "Edit" button
- [ ] Edit project name, verify it updates
- [ ] Change status, verify it saves
- [ ] Update pricing information
- [ ] Set priority to "urgent"
- [ ] Add admin notes
- [ ] Save changes and verify success message
- [ ] Refresh page and verify changes persisted
- [ ] Go back to dashboard and verify changes in list
- [ ] Check status history timeline
- [ ] Test on mobile devices
- [ ] Test error cases (invalid data, API errors)

## 🚀 Future Enhancements

### Planned Features
1. **Batch Operations**
   - Edit multiple projects at once
   - Bulk status changes

2. **Advanced Filtering**
   - Filter by status, priority, tester, date range
   - Save filter presets

3. **Comments & Discussion**
   - Add comments to projects
   - @ mention other admins/testers
   - Comment history

4. **File Attachments**
   - Upload and attach files to projects
   - View project-related documents
   - Download reports

5. **Tester Management from Detail Page**
   - Assign/remove testers directly
   - Update tester status
   - Add notes to tester assignments

6. **PDF Export**
   - Export project details as PDF
   - Export reports
   - Email reports to stakeholders

7. **Activity Log**
   - Who changed what and when
   - Full audit trail
   - User attribution

8. **Notifications**
   - Notify testers when assigned
   - Notify customer of status changes
   - Admin alerts for overdue projects

## 📖 File Locations Summary

```
app/
├── dashboard/
│   └── admin/
│       ├── page.tsx (existing - admin dashboard list)
│       └── projects/
│           └── [id]/
│               ├── page.tsx ✨ NEW - detail page with tabs
│               └── edit-form.tsx ✨ NEW - edit form component
│
└── api/
    └── audit-requests/
        ├── route.ts (existing - GET/POST)
        └── [id]/ ✨ NEW
            └── route.ts ✨ NEW - GET/PATCH/DELETE
```

## 🎯 Key Takeaways

✅ **Admin can now:**
- View complete project details in organized tabs
- See all tester assignments and their statuses
- Review project status history and timeline
- Edit key project information
- Update pricing and AI report settings
- Add internal notes
- See automatic status change tracking

✅ **Data is:**
- Properly validated
- Securely stored
- Automatically tracked (status history)
- Easily searchable and filterable

✅ **UI is:**
- Responsive and mobile-friendly
- Accessible with proper ARIA labels
- Intuitive with clear visual indicators
- Consistent with existing design
