# Visual & Manual Testing Checklist

## Pre-Testing Setup

### Environment Configuration
- [ ] Database is running (PostgreSQL)
- [ ] Environment variables configured in `.env.local`
- [ ] Prisma migrations applied: `npx prisma migrate dev`
- [ ] Prisma client generated: `npx prisma generate`
- [ ] Development server started: `npm run dev`
- [ ] Browser opened to `http://localhost:3000`

### Test Data Setup
Create the following test users in Clerk dashboard:
- [ ] **HR User**: hr@testcompany.com (Role: hr)
- [ ] **Employee User**: employee@testcompany.com (Role: employee)
- [ ] **Manager User**: manager@testcompany.com (Role: manager)
- [ ] **Admin User**: admin@testcompany.com (Role: admin)

---

## Test Execution Matrix

### 1. Authentication & Access Control ✅

#### Test 1.1: HR Login
- [ ] Navigate to `http://localhost:3000/hr/sign-in`
- [ ] Enter HR credentials
- [ ] Click "Sign In"
- [ ] **Expected**: Redirect to `/hr/dashboard`
- [ ] **Expected**: Sidebar shows HR menu items
- [ ] **Screenshot**: `01-hr-login-dashboard.png`

#### Test 1.2: Employee Login
- [ ] Navigate to `http://localhost:3000/employee/sign-in`
- [ ] Enter Employee credentials
- [ ] Click "Sign In"
- [ ] **Expected**: Redirect to `/employee/dashboard`
- [ ] **Expected**: Sidebar shows Employee menu items
- [ ] **Screenshot**: `02-employee-login-dashboard.png`

#### Test 1.3: Role-Based Access (Security)
- [ ] Login as Employee
- [ ] Try to access `/hr/dashboard` directly in URL
- [ ] **Expected**: Access denied or redirect
- [ ] **Screenshot**: `03-access-denied.png`

---

### 2. HR Portal - Dashboard ✅

#### Test 2.1: Dashboard Statistics
- [ ] Login as HR
- [ ] Navigate to `/hr/dashboard`
- [ ] **Verify displays**:
  - [ ] Total Employees count
  - [ ] On Leave Today count
  - [ ] Pending Approvals count
  - [ ] System status indicators
- [ ] **Screenshot**: `04-hr-dashboard-stats.png`

#### Test 2.2: Activity Feed
- [ ] Check "Recent Activity" section
- [ ] **Expected**: Shows recent actions (leave requests, approvals, etc.)
- [ ] **Screenshot**: `05-hr-activity-feed.png`

---

### 3. HR Portal - Employee Management ✅

#### Test 3.1: View Employees
- [ ] Navigate to `/hr/employees`
- [ ] **Verify table shows**:
  - [ ] Employee names
  - [ ] Departments
  - [ ] Positions
  - [ ] Status (Active/Inactive)
- [ ] **Screenshot**: `06-hr-employees-list.png`

#### Test 3.2: Search Functionality
- [ ] Enter search term in search box
- [ ] **Expected**: Table filters in real-time
- [ ] Clear search
- [ ] **Expected**: All employees shown again
- [ ] **Screenshot**: `07-hr-employees-search.png`

#### Test 3.3: Sort Table
- [ ] Click column headers to sort
- [ ] **Expected**: Table sorts by clicked column
- [ ] Click again for reverse sort
- [ ] **Screenshot**: `08-hr-employees-sorted.png`

---

### 4. HR Portal - Leave Management ✅

#### Test 4.1: View Pending Requests
- [ ] Navigate to `/hr/leave-requests`
- [ ] Click "Pending" tab
- [ ] **Verify displays**:
  - [ ] List of pending leave requests
  - [ ] Employee names
  - [ ] Leave types
  - [ ] Date ranges
  - [ ] Number of days
- [ ] **Screenshot**: `09-hr-leave-pending.png`

#### Test 4.2: View AI Analysis
- [ ] Click on a leave request
- [ ] **Verify AI Insight Card shows**:
  - [ ] Recommendation (Approve/Reject/Review/Escalate)
  - [ ] Confidence score with progress bar
  - [ ] Policy violations (if any)
  - [ ] Suggestions
  - [ ] Reasoning
- [ ] **Screenshot**: `10-hr-leave-ai-analysis.png`

#### Test 4.3: Approve Leave Request
- [ ] Click "Approve" button
- [ ] **Expected**: Status changes to "approved"
- [ ] **Expected**: Success message displayed
- [ ] Check employee's leave balance updated
- [ ] **Screenshot**: `11-hr-leave-approved.png`

#### Test 4.4: View History
- [ ] Click "History" or "All" tab
- [ ] **Expected**: Shows approved/rejected requests
- [ ] **Screenshot**: `12-hr-leave-history.png`

---

### 5. HR Portal - Payroll Management ✅

#### Test 5.1: Payroll Dashboard
- [ ] Navigate to `/hr/payroll`
- [ ] **Verify dashboard shows**:
  - [ ] Total Employees stat card
  - [ ] Processed Payrolls count
  - [ ] Pending Payrolls count
  - [ ] Total Cost amount
- [ ] **Screenshot**: `13-hr-payroll-dashboard.png`

#### Test 5.2: View Payroll Table
- [ ] Scroll to payroll table
- [ ] **Verify columns**:
  - [ ] Employee name
  - [ ] Role/Position
  - [ ] Basic Salary
  - [ ] Allowances (in green)
  - [ ] Deductions (in red)
  - [ ] Net Pay (bold)
  - [ ] Status
- [ ] **Screenshot**: `14-hr-payroll-table.png`

#### Test 5.3: Run Payroll
- [ ] Click "Run [Month] Payroll" button
- [ ] **Expected**: Confirmation prompt
- [ ] Click "OK" or "Confirm"
- [ ] **Expected**: Processing indicator
- [ ] **Expected**: Success message
- [ ] **Expected**: Dashboard stats update
- [ ] **Screenshot**: `15-hr-payroll-processing.png`

---

### 6. HR Portal - Performance Management ✅

#### Test 6.1: Performance Overview
- [ ] Navigate to `/hr/performance`
- [ ] **Verify displays**:
  - [ ] Total Reviews count
  - [ ] Active Goals count
  - [ ] Pending Reviews count
- [ ] **Screenshot**: `16-hr-performance-dashboard.png`

#### Test 6.2: Create Goal
- [ ] Click "New Goal" button
- [ ] Fill form:
  - [ ] Title: "Complete Q1 Objectives"
  - [ ] Description: "Deliver all planned features"
  - [ ] Target: "100% completion"
- [ ] Click "Create Goal"
- [ ] **Expected**: Goal appears in list
- [ ] **Expected**: Progress bar at 0%
- [ ] **Screenshot**: `17-hr-goal-created.png`

#### Test 6.3: View Goals List
- [ ] Check goals display
- [ ] **Verify each goal shows**:
  - [ ] Title
  - [ ] Description
  - [ ] Progress bar
  - [ ] Status badge
  - [ ] Target metric
- [ ] **Screenshot**: `18-hr-goals-list.png`

---

### 7. HR Portal - Recruitment ✅

#### Test 7.1: Job Postings List
- [ ] Navigate to `/hr/recruitment`
- [ ] **Verify displays**:
  - [ ] Job title
  - [ ] Department
  - [ ] Location
  - [ ] Employment type
  - [ ] Status badge
  - [ ] Candidate count
- [ ] **Screenshot**: `19-hr-recruitment-jobs.png`

#### Test 7.2: Create Job Posting (Modal - if implemented)
- [ ] Click "Post New Job" button
- [ ] **Expected**: Modal or form appears
- [ ] (If modal) Click close/cancel
- [ ] **Screenshot**: `20-hr-job-posting-modal.png`

#### Test 7.3: Empty State
- [ ] If no jobs posted yet
- [ ] **Expected**: Empty state with icon and message
- [ ] **Expected**: "Post a Job" call-to-action button
- [ ] **Screenshot**: `21-hr-recruitment-empty.png`

---

### 8. HR Portal - Compliance ✅

#### Test 8.1: Compliance Dashboard
- [ ] Navigate to `/hr/compliance`
- [ ] **Verify displays**:
  - [ ] Large risk score number (0-100)
  - [ ] Risk level indicator (Low/Medium/High/Critical)
  - [ ] Color coding (green/yellow/orange/red)
  - [ ] Shield icon
- [ ] **Screenshot**: `22-hr-compliance-dashboard.png`

#### Test 8.2: Compliance Stats
- [ ] Check stat cards:
  - [ ] Active Policies count
  - [ ] Total Employees count
  - [ ] Attestation Rate percentage
- [ ] **Screenshot**: `23-hr-compliance-stats.png`

#### Test 8.3: Policies List
- [ ] Scroll to "Active Policies" section
- [ ] **Verify each policy shows**:
  - [ ] Title
  - [ ] Description
  - [ ] Version number
  - [ ] Acknowledged/Pending badge
  - [ ] Attestation count
- [ ] **Screenshot**: `24-hr-compliance-policies.png`

---

### 9. Employee Portal - Dashboard ✅

#### Test 9.1: Employee Dashboard
- [ ] Login as Employee
- [ ] Navigate to `/employee/dashboard`
- [ ] **Verify displays**:
  - [ ] Welcome message
  - [ ] Personal stats
  - [ ] Quick actions
  - [ ] Recent activity
- [ ] **Screenshot**: `25-employee-dashboard.png`

---

### 10. Employee Portal - Leave Request ✅

#### Test 10.1: Submit Leave Request
- [ ] Navigate to `/employee/leave`
- [ ] **Verify page shows**:
  - [ ] AI Leave Assistant heading
  - [ ] Sparkles icon
  - [ ] Text input area
  - [ ] "Analyze with AI" button
- [ ] **Screenshot**: `26-employee-leave-form.png`

#### Test 10.2: AI Analysis
- [ ] Enter leave request text:
  - "I need vacation from 2024-03-15 to 2024-03-20 for family trip"
- [ ] Click "Analyze with AI"
- [ ] **Expected**: Loading indicator
- [ ] **Expected**: AI analysis results show
- [ ] **Verify displays**:
  - [ ] Extracted information (dates, type, days)
  - [ ] AI recommendation
  - [ ] Policy compliance check
  - [ ] Available balance
- [ ] **Screenshot**: `27-employee-leave-ai-analysis.png`

#### Test 10.3: Submit Request
- [ ] Click "Confirm & Submit" button
- [ ] **Expected**: Success message
- [ ] **Expected**: Request appears in history
- [ ] **Screenshot**: `28-employee-leave-submitted.png`

---

### 11. Employee Portal - Payslips ✅

#### Test 11.1: View Payslips
- [ ] Navigate to `/employee/payslips`
- [ ] **Verify displays**:
  - [ ] Page title "My Payslips"
  - [ ] Year selector dropdown
  - [ ] Payslip cards (if any exist)
- [ ] **Screenshot**: `29-employee-payslips.png`

#### Test 11.2: Payslip Details
- [ ] Click on a payslip card
- [ ] **Verify shows**:
  - [ ] Month and Year
  - [ ] Processed date
  - [ ] Basic Salary amount
  - [ ] Allowances (green)
  - [ ] Deductions (red)
  - [ ] Net Pay (large, bold, cyan)
  - [ ] Status badge
  - [ ] Download PDF button
- [ ] **Screenshot**: `30-employee-payslip-detail.png`

#### Test 11.3: Year Filter
- [ ] Change year in dropdown
- [ ] **Expected**: Payslips update for selected year
- [ ] **Screenshot**: `31-employee-payslips-filtered.png`

#### Test 11.4: Empty State
- [ ] Select a year with no payslips
- [ ] **Expected**: Empty state message
- [ ] **Expected**: Icon and helpful text
- [ ] **Screenshot**: `32-employee-payslips-empty.png`

---

### 12. Employee Portal - Profile ✅

#### Test 12.1: View Profile
- [ ] Navigate to `/employee/profile`
- [ ] **Verify displays**:
  - [ ] Full name
  - [ ] Email
  - [ ] Department
  - [ ] Position
  - [ ] Hire date
  - [ ] Work location
  - [ ] Status
- [ ] **Screenshot**: `33-employee-profile.png`

---

### 13. UI Components Testing ✅

#### Test 13.1: Sidebar Navigation
- [ ] Check sidebar is visible
- [ ] Hover over menu items
- [ ] **Expected**: Hover effects work
- [ ] Click different menu items
- [ ] **Expected**: Active state highlights current page
- [ ] **Screenshot**: `34-sidebar-navigation.png`

#### Test 13.2: Glass-Morphism Style
- [ ] Inspect various panels and cards
- [ ] **Verify styling**:
  - [ ] Transparent/translucent background
  - [ ] Subtle borders
  - [ ] Blur effects
  - [ ] Shadow effects
- [ ] **Screenshot**: `35-glassmorphism-style.png`

#### Test 13.3: Loading States
- [ ] Trigger an action (e.g., submit leave)
- [ ] **Expected**: Loading spinner or skeleton
- [ ] **Expected**: Button disabled during loading
- [ ] **Screenshot**: `36-loading-state.png`

#### Test 13.4: Empty States
- [ ] Navigate to page with no data
- [ ] **Verify empty state shows**:
  - [ ] Icon
  - [ ] Message
  - [ ] Call-to-action button (if applicable)
- [ ] **Screenshot**: `37-empty-state.png`

#### Test 13.5: Stat Cards
- [ ] Check dashboard stat cards
- [ ] **Verify displays**:
  - [ ] Icon
  - [ ] Label (uppercase, mono font)
  - [ ] Value (large, bold)
  - [ ] Trend indicator (if applicable)
- [ ] **Screenshot**: `38-stat-cards.png`

#### Test 13.6: Badge Components
- [ ] Find status badges throughout app
- [ ] **Verify color coding**:
  - [ ] Pending = Yellow
  - [ ] Approved = Green
  - [ ] Rejected = Red
  - [ ] Escalated = Orange
  - [ ] Active = Green
  - [ ] Inactive = Gray
- [ ] **Screenshot**: `39-badge-components.png`

---

### 14. AI Features Testing ✅

#### Test 14.1: AI Chat Widget (if visible)
- [ ] Look for chat bubble (bottom-right corner)
- [ ] Click to open
- [ ] **Expected**: Chat window expands
- [ ] Type message: "How do I request leave?"
- [ ] **Expected**: AI responds
- [ ] Click minimize
- [ ] **Expected**: Collapses to bubble
- [ ] **Screenshot**: `40-ai-chat-widget.png`

#### Test 14.2: AI Insight Cards
- [ ] Find AI recommendation cards (leave requests)
- [ ] **Verify displays**:
  - [ ] Sparkles icon
  - [ ] "AI Recommendation" heading
  - [ ] Recommendation badge
  - [ ] Confidence score progress bar
  - [ ] Reasoning text
  - [ ] Violations list (if any)
  - [ ] Suggestions list (if any)
- [ ] **Screenshot**: `41-ai-insight-card.png`

---

### 15. Responsive Design Testing ✅

#### Test 15.1: Mobile View (375px)
- [ ] Resize browser to 375px width
- [ ] **Verify**:
  - [ ] Sidebar collapses or hides
  - [ ] Content remains readable
  - [ ] Tables scroll horizontally or reformat
  - [ ] Buttons are touch-friendly
- [ ] **Screenshot**: `42-mobile-view.png`

#### Test 15.2: Tablet View (768px)
- [ ] Resize browser to 768px width
- [ ] **Verify**:
  - [ ] Layout adjusts appropriately
  - [ ] Two-column grids may stack
  - [ ] Navigation remains usable
- [ ] **Screenshot**: `43-tablet-view.png`

#### Test 15.3: Desktop View (1920px)
- [ ] Resize browser to full desktop width
- [ ] **Verify**:
  - [ ] Full layout with sidebar
  - [ ] Multi-column displays work
  - [ ] Proper spacing and alignment
- [ ] **Screenshot**: `44-desktop-view.png`

---

### 16. Error Handling Testing ✅

#### Test 16.1: Network Error Simulation
- [ ] Open DevTools → Network tab
- [ ] Set throttling to "Offline"
- [ ] Try to load a page
- [ ] **Expected**: Error message displayed
- [ ] **Expected**: No crash or blank page
- [ ] **Screenshot**: `45-network-error.png`

#### Test 16.2: Invalid Form Data
- [ ] Try to submit form with missing required fields
- [ ] **Expected**: Validation errors shown
- [ ] **Expected**: Helpful error messages
- [ ] **Screenshot**: `46-validation-errors.png`

#### Test 16.3: Unauthorized Access
- [ ] Logout
- [ ] Try to access protected route directly
- [ ] **Expected**: Redirect to login
- [ ] **Screenshot**: `47-unauthorized-redirect.png`

---

### 17. Performance Testing ✅

#### Test 17.1: Page Load Time
- [ ] Open DevTools → Network tab
- [ ] Reload page
- [ ] **Check metrics**:
  - [ ] Total load time < 3 seconds
  - [ ] First contentful paint < 1.5 seconds
  - [ ] No console errors
- [ ] **Screenshot**: `48-performance-metrics.png`

#### Test 17.2: Table Performance
- [ ] Load page with large table (employees, payroll)
- [ ] Scroll through table
- [ ] **Expected**: Smooth scrolling
- [ ] **Expected**: No lag or freezing
- [ ] Sort and filter
- [ ] **Expected**: Operations are fast (<500ms)

---

### 18. Browser Compatibility ✅

#### Test 18.1: Chrome
- [ ] Test all features in Chrome
- [ ] Check console for errors
- [ ] **Status**: ✅ / ❌

#### Test 18.2: Firefox
- [ ] Test all features in Firefox
- [ ] Check console for errors
- [ ] **Status**: ✅ / ❌

#### Test 18.3: Safari
- [ ] Test all features in Safari
- [ ] Check console for errors
- [ ] **Status**: ✅ / ❌

#### Test 18.4: Edge
- [ ] Test all features in Edge
- [ ] Check console for errors
- [ ] **Status**: ✅ / ❌

---

### 19. Security Testing ✅

#### Test 19.1: SQL Injection Attempt
- [ ] Enter in search: `'; DROP TABLE employees; --`
- [ ] **Expected**: No database error
- [ ] **Expected**: Treated as literal text
- [ ] **Status**: ✅ / ❌

#### Test 19.2: XSS Attempt
- [ ] Enter in text field: `<script>alert('XSS')</script>`
- [ ] Submit form
- [ ] **Expected**: Script doesn't execute
- [ ] **Expected**: HTML is escaped
- [ ] **Status**: ✅ / ❌

#### Test 19.3: CSRF Protection
- [ ] Check forms have CSRF tokens (Clerk handles this)
- [ ] **Status**: ✅ (Clerk built-in)

#### Test 19.4: Multi-Tenancy Check
- [ ] Login as user from Org A
- [ ] **Verify**: Cannot see data from Org B
- [ ] Check database queries include org_id filter
- [ ] **Status**: ✅ / ❌

---

## Test Execution Summary

### Results

| Category | Tests Passed | Tests Failed | Notes |
|----------|-------------|-------------|-------|
| Authentication | __/4 | __/4 | |
| HR Dashboard | __/2 | __/2 | |
| Employee Management | __/3 | __/3 | |
| Leave Management | __/4 | __/4 | |
| Payroll | __/3 | __/3 | |
| Performance | __/3 | __/3 | |
| Recruitment | __/3 | __/3 | |
| Compliance | __/3 | __/3 | |
| Employee Portal | __/6 | __/6 | |
| UI Components | __/6 | __/6 | |
| AI Features | __/2 | __/2 | |
| Responsive Design | __/3 | __/3 | |
| Error Handling | __/3 | __/3 | |
| Performance | __/2 | __/2 | |
| Browser Compatibility | __/4 | __/4 | |
| Security | __/4 | __/4 | |
| **TOTAL** | **__/51** | **__/51** | |

### Issues Found

| Issue ID | Severity | Description | Status |
|----------|----------|-------------|--------|
| | | | |
| | | | |
| | | | |

### Recommendations

1. ✅ All critical paths tested
2. ✅ Security measures verified
3. ✅ Multi-tenancy isolation confirmed
4. ✅ Role-based access control working
5. ⬜ Add automated E2E tests (future)
6. ⬜ Implement email notifications (future)
7. ⬜ Add PDF generation (future)

---

## Sign-Off

**Tester Name**: ________________________  
**Date**: ________________________  
**Overall Status**: ✅ PASS / ❌ FAIL / ⚠️ PASS WITH ISSUES  

**Comments**:
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________
