# Requirements Document: Contractor CRM Enhancement

**Version:** 1.0
**Date:** January 19, 2026
**Priority Modules:** Vendor Management, Asset Management
**Deferred:** Sales & Customer Relationship (out of scope for this phase)

---

## Table of Contents

1. [Task Management Improvements](#1-task-management-improvements)
2. [Notification System](#2-notification-system)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Vendor Management](#4-vendor-management)
5. [Asset Management](#5-asset-management)
6. [Procurement & Inventory](#6-procurement--inventory)
7. [Technical Requirements](#7-technical-requirements)

---

## 1. Task Management Improvements

### 1.1 Task View Enhancement
- **Status:** DONE (tabular view with dependencies and quick edits)

### 1.2 Dependency Flow Visibility
- Improve visual signals for task dependencies in key areas
- Dependencies should be clearly visible in:
  - Task list view
  - Task detail view
  - Project overview

### 1.3 Task Budget Fields (Internal Only)
| Field | Type | Description |
|-------|------|-------------|
| Budget Amount | Currency (optional) | Planned spend for the task |
| Approved Amount | Currency (optional) | Actual approved spend |
| Cost Variance | Computed | `Budget Amount - Approved Amount` (auto-calculated) |

**Note:** These fields are internal only and NOT visible to vendors.

### 1.4 Task Payments
- Ability to add payments against the approved amount
- Each payment must include:
  - Payment amount
  - Reference number / Invoice number
  - Payment date
- Outstanding Balance: Computed as `Approved Amount - Sum(Payments)`

### 1.5 Task-Vendor Association
- Tasks can be assigned to a vendor
- Tasks can be associated with a contract

### 1.6 Task Escalation
- Add "Escalation" category/flag to tasks
- Escalated tasks trigger email notifications (see Section 2)

### 1.7 File Upload
- Add file upload capability to task details
- Support for multiple file attachments per task

---

## 2. Notification System

### 2.1 Notification Channels
- **In-app notifications** - displayed in notification section on home page
- **Email notifications** - sent to configured email addresses
- **Configuration:** Users should be able to configure which channels they receive notifications on

### 2.2 Due Date Notifications
| Trigger | Recipients | Channels |
|---------|------------|----------|
| 2 days before due date | Task assignee + Project manager | In-app + Email (configurable) |
| 1 day before due date | Task assignee + Project manager | In-app + Email (configurable) |
| Every day after due date (overdue) | Task assignee + Project manager | In-app + Email (configurable) |

### 2.3 Escalation Notifications
- When a task is marked as "Escalation", send email notification to:
  - Project manager
  - Configurable additional recipients

### 2.4 Home Page Notification Section
- Add dedicated notification center to the dashboard home page
- Display recent notifications with:
  - Notification type/icon
  - Message
  - Timestamp
  - Link to relevant item (task, project, etc.)
- Mark as read/unread functionality
- "Mark all as read" option

### 2.5 Email Service Configuration
- System requires email service setup (SendGrid, AWS SES, or similar)
- Admin configuration panel for:
  - Email service provider selection
  - API keys/credentials
  - Default sender email address
  - Email templates

---

## 3. User Roles & Permissions

### 3.1 Existing Roles (Enhancement)
The following roles already exist and require permission updates:

#### 3.1.1 Staff
- Can view tasks assigned to them
- Can view project details for assigned projects
- Can rate vendors
- Can record procurement/inventory usage
- Can update vendor status (audit function)

#### 3.1.2 Contractors
- Can view tasks assigned to them
- Limited project visibility (only assigned tasks)

**Note:** Staff and Contractor roles are mutually exclusive.

### 3.2 New Role: Vendor (External User)

#### 3.2.1 Vendor Portal Access
Vendors will have their own login and can view:
- Tasks assigned to them
- Contracts associated with them
- Payment history
- Their own ratings and performance reviews
- Progress updates

#### 3.2.2 Vendor Permissions
| Action | Allowed |
|--------|---------|
| View assigned tasks | Yes |
| Update task progress | Yes (manual entry) |
| View contracts | Yes |
| View payments received | Yes |
| View own ratings | Yes |
| Rate other vendors | No |
| Access internal budget fields | No |

---

## 4. Vendor Management

### 4.1 Vendor Profile

#### 4.1.1 Basic Information
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Vendor Name | Text | Yes | Company/individual name |
| Contact Person | Text | Yes | Primary contact |
| Email | Email | Yes | Used for vendor portal login |
| Phone | Text | No | Contact number |
| Address | Text | No | Business address |

#### 4.1.2 Vendor Classification
| Field | Type | Options | Description |
|-------|------|---------|-------------|
| Vendor Type | Dropdown | Supply and Installation, Supply Only, Installation Only | Type of services provided |
| Scope of Work | Text Area | Free text | Description of vendor's scope |

#### 4.1.3 Vendor Status (Audit)
| Status | Description |
|--------|-------------|
| Pending Verification | New vendor, not yet verified |
| Verified | Vendor has been verified and approved |
| Suspended | Temporarily suspended from new assignments |
| Blacklisted | Permanently blocked from assignments |
| Inactive | No longer active but not blacklisted |

- Staff members can update vendor status
- Status changes are logged with timestamp and user who made the change

### 4.2 Vendor Contracts

#### 4.2.1 Contract Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Contract Name/Number | Text | Yes | Unique identifier |
| Contract Type | Dropdown | Yes | Lump Sum, Remeasurable, Addendum |
| Total Sum | Currency | Yes | Total contract value |
| Contract Start Date | Date | Yes | When contract begins |
| Contract End Date | Date | Yes | When contract ends |
| Retention Amount | Currency | No | Amount retained |
| Warranty Period | Dropdown | No | 1-10 years |
| Associated Projects | Multi-select | Yes | One or more projects |

#### 4.2.2 Contract Types
| Type | Description |
|------|-------------|
| Lump Sum | Fixed total price for defined scope |
| Remeasurable | Price based on actual quantities measured |
| Addendum | Amendment to existing contract |

### 4.3 Vendor Budget & Cost Control

#### 4.3.1 Budget Overview (per Vendor)
- Aggregated from all tasks assigned to the vendor
- Shows:
  - Total Budget (sum of task budgets)
  - Total Approved (sum of approved amounts)
  - Total Cost Variance (sum of variances)
  - Total Payments Made
  - Outstanding Balance

#### 4.3.2 Cost Variance Report
- Filterable by:
  - Vendor
  - Project
  - Date range
  - Contract
- Columns:
  - Task name
  - Budget amount
  - Approved amount
  - Variance
  - Variance %
  - Status (over/under budget)

### 4.4 Vendor Performance & Ratings

#### 4.4.1 Rating System
- Any user in the company can rate vendors
- Rating scale: 1-5 stars
- Rating categories (suggested):
  - Quality of work
  - Timeliness
  - Communication
  - Value for money
- Optional comment with each rating

#### 4.4.2 Performance Dashboard (Vendor Profile)
- Average rating (overall and per category)
- Number of reviews
- Rating trend over time
- Recent reviews

### 4.5 Vendor Progress Tracking

- Leverage existing tasks flow
- Manual progress entry by vendors via their portal
- Progress visible on:
  - Vendor profile
  - Associated tasks
  - Project dashboard

### 4.6 Vendor-Project Assignment

- Vendors can be assigned to projects
- Once assigned, tasks within that project can be assigned to the vendor
- A vendor can be assigned to multiple projects
- A contract can span multiple projects

---

## 5. Asset Management

### 5.1 Asset Profile

#### 5.1.1 Asset Information
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Asset Name | Text | Yes | Name/description of asset |
| Asset Type | Dropdown | Yes | Vehicle, Equipment, Tool |
| Serial Number | Text | Yes | Unique identifier |
| Purchase Cost | Currency | No | Original purchase price |
| Purchase Date | Date | No | When asset was acquired |
| Warranty | Text/Date | No | Warranty information |
| Photos | File Upload | No | Multiple images supported |

#### 5.1.2 Asset Status
| Status | Description |
|--------|-------------|
| Available | Ready for assignment |
| In Use | Currently assigned and in use |
| Under Maintenance | Being serviced/repaired |
| Retired | No longer in service |
| Lost/Damaged | Missing or damaged beyond repair |

#### 5.1.3 Asset Assignment
| Field | Type | Description |
|-------|------|-------------|
| Assigned To | User Select | Current user responsible |
| Location (Site) | Project/Location Select | Where the asset is located |

### 5.2 Asset Request & Approval Flow

#### 5.2.1 Request Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Asset Requested | Asset Select or Text | Yes | Specific asset or type |
| Requested By | Auto (current user) | Yes | User making request |
| Justification | Text Area | Yes | Reason for request |
| Required From Date | Date | No | When asset is needed |
| Required Until Date | Date | No | Expected return date |

#### 5.2.2 Approval Status
| Status | Description |
|--------|-------------|
| Pending | Awaiting approval |
| Approved | Request approved |
| Rejected | Request denied |
| Partially Approved | Approved with modifications |

#### 5.2.3 Approval Flow
- **Type:** Parallel approval
- **Rule:** Any authorized user can approve
- Approval record includes:
  - Approver name
  - Approval date/time
  - Comments (optional)

### 5.3 Maintenance Management

#### 5.3.1 Maintenance Record
| Field | Type | Description |
|-------|------|-------------|
| Asset | Reference | Link to asset |
| Maintenance Type | Dropdown | Routine, Repair, Inspection |
| Description | Text | What was done |
| Date Performed | Date | When maintenance occurred |
| Performed By | Text | Who did the maintenance |
| Cost | Currency | Maintenance cost |
| Next Scheduled | Date | If recurring |

#### 5.3.2 Maintenance Schedule
- Support for both:
  - **One-time:** Specific scheduled date
  - **Recurring:** Interval-based (e.g., every 3 months, every 6 months, annually)
- For recurring schedules:
  - Define interval (days/weeks/months)
  - Auto-generate next maintenance date after completion

#### 5.3.3 Maintenance History
- Full history log per asset
- Sortable by date
- Shows:
  - All past maintenance records
  - Upcoming scheduled maintenance
  - Total maintenance cost over time

---

## 6. Procurement & Inventory

### 6.1 Overview
- Separate from Vendor Management
- Tracks consumables purchased for projects
- Monitors usage and remaining inventory

### 6.2 Procured Item Profile

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Item Name | Text | Yes | Name of consumable |
| Description | Text | No | Additional details |
| Category | Dropdown/Text | No | Type of consumable |
| Unit | Text | Yes | Unit of measure (kg, pieces, liters, etc.) |
| Unit Cost | Currency | Yes | Cost per unit |
| Quantity Purchased | Number | Yes | Amount bought |
| Total Cost | Computed | Auto | Unit Cost × Quantity |
| Purchase Date | Date | Yes | When purchased |
| Supplier | Text | No | Where it was bought |
| Project | Project Select | Yes | Which project it's for |
| Photos | File Upload | No | Images of item |
| Compliance Notes | Text | No | Any compliance/certification info |

### 6.3 Inventory Tracking

#### 6.3.1 Stock Levels
| Field | Type | Description |
|-------|------|-------------|
| Quantity Purchased | Number | Original amount bought |
| Quantity Used | Computed | Sum of all usage records |
| Quantity Remaining | Computed | Purchased - Used |

#### 6.3.2 Usage Recording
- Any staff member can record usage
- Usage record includes:
  - Item
  - Quantity used
  - Date
  - Used by (auto: current user)
  - Purpose/notes (optional)
  - Project/task (optional)

### 6.4 Price Comparison

- Ability to record multiple price quotes for items
- Compare prices from different suppliers
- Fields:
  - Supplier name
  - Unit price
  - Minimum order quantity
  - Notes
  - Date quoted

### 6.5 Low Inventory Alerts

#### 6.5.1 Threshold Configuration
- Per-item low stock threshold
- When `Quantity Remaining` falls below threshold, trigger alert

#### 6.5.2 Alert Configuration
- Select users to receive low inventory alerts
- Alert channels: In-app + Email (based on user preferences)

---

## 7. Technical Requirements

### 7.1 Email Service

#### 7.1.1 Setup Required
- Integration with email service provider needed
- Recommended options:
  - SendGrid
  - AWS SES
  - Mailgun
  - Resend

#### 7.1.2 Admin Configuration
- Email provider selection
- API credentials
- Sender email/domain
- Email templates for each notification type

### 7.2 Authentication

#### 7.2.1 Vendor Portal
- Separate login flow for vendors (external users)
- Email-based authentication
- Password reset functionality
- Session management

### 7.3 File Storage
- Support for file uploads (task attachments, asset photos, procurement photos)
- Recommended: Cloud storage (S3, Cloudinary, or similar)

### 7.4 Database Schema Updates
New entities required:
- Vendor
- VendorContract
- VendorRating
- VendorPayment
- Asset
- AssetRequest
- AssetApproval
- MaintenanceRecord
- MaintenanceSchedule
- ProcurementItem
- InventoryUsage
- PriceComparison
- Notification
- NotificationPreference

### 7.5 API Endpoints
Each module will require CRUD endpoints plus specialized endpoints for:
- Vendor portal authentication
- Approval workflows
- Report generation
- Alert triggers

---

## Appendix A: Module Priority

| Priority | Module | Complexity |
|----------|--------|------------|
| 1 | Vendor Management | High |
| 1 | Asset Management | High |
| 2 | Procurement & Inventory | Medium |
| 2 | Notification System | Medium |
| 3 | Task Improvements (remaining) | Low |

---

## Appendix B: Out of Scope (This Phase)

- Sales & Customer Relationship module
- Offer letter management
- Customer relationship tracking

---

## Appendix C: Open Questions / Future Considerations

1. Should vendor portal have mobile app support?
2. Integration with accounting software for payments?
3. Barcode/QR code scanning for asset and inventory tracking?
4. Offline capability for site-based usage recording?
5. Document generation (contracts, reports) as PDF?

---

*Document prepared based on client feedback session. Subject to revision based on further discussions.*
