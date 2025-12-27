# CRM Frontend Specifications - Part 1

## Overview
This document provides detailed specifications for implementing the CRM frontend pages. All pages should follow the existing design system and support Arabic (RTL) and English layouts.

---

## 1. CRM Dashboard Page

**Route:** `/crm/dashboard`
**Component:** `CrmDashboard.jsx`
**API Endpoints:** `GET /api/analytics/dashboard`

### Layout
- 4-column grid layout for metric cards (responsive: 2 cols on tablet, 1 col on mobile)
- Charts section below cards (2 charts per row on desktop)
- Activity sidebar on right (collapses to bottom on mobile)

### Metric Cards
| Card | API Field | Format | Icon |
|------|-----------|--------|------|
| Total Leads | `leads.total` | Number | Users |
| Open Pipeline | `pipeline.totalValue` | Currency (SAR) | TrendingUp |
| Weighted Value | `pipeline.weightedValue` | Currency (SAR) | Target |
| Won This Month | `leads.won` | Number | CheckCircle |
| Lost This Month | `leads.lost` | Number | XCircle |
| Conversion Rate | `conversion.conversionRate` | Percentage | Percent |
| Avg Deal Size | `pipeline.avgDealSize` | Currency | DollarSign |
| Avg Sales Cycle | `conversion.avgSalesCycleDays` | Days | Clock |

### Charts
1. **Pipeline by Stage** (Bar Chart)
   - Data: `pipeline.byStage`
   - X-axis: Stage names
   - Y-axis: Value (SAR)
   - Color: Stage color coding

2. **Leads by Source** (Pie/Donut Chart)
   - Data: `leads.bySource`
   - Legend with percentages

3. **Monthly Trend** (Line Chart)
   - Data: `GET /api/analytics/revenue` (byPeriod)
   - Show revenue and deal count

4. **Conversion Funnel** (Funnel Chart)
   - Data: `GET /api/analytics/sales-funnel`
   - Show count and conversion % at each stage

### Activity Section
- Title: "Activities Due Today" / "الأنشطة المستحقة اليوم"
- List of upcoming activities (max 5)
- Each item shows: type icon, title, time, related entity
- "View All" link to Activities page

### Recent Leads Section
- Data: `leads.recent`
- Table with columns: Name, Company, Status, Created
- Clickable rows link to Lead detail

### Date Filter
- Dropdown: Today, Last 7 Days, Last 30 Days, This Quarter, Custom Range
- Updates all dashboard widgets when changed

---

## 2. Leads List Page

**Route:** `/crm/leads`
**Component:** `LeadsList.jsx`
**API Endpoint:** `GET /api/leads`

### Filter Bar
| Filter | Type | API Param |
|--------|------|-----------|
| Search | Text input | `search` |
| Status | Multi-select | `status` |
| Source | Dropdown | `source` |
| Assigned To | User picker | `assignedTo` |
| Team | Dropdown | `salesTeamId` |
| Territory | Dropdown | `territoryId` |
| Tags | Tag picker | `tags` |
| Date Range | Date range picker | `createdAfter`, `createdBefore` |

### Bulk Actions Toolbar (appears when rows selected)
- Assign to User
- Add Tags
- Change Status
- Delete (with confirmation)
- Export Selected

### Data Table Columns
| Column | Field | Sortable | Width |
|--------|-------|----------|-------|
| Checkbox | - | No | 40px |
| Lead ID | `leadId` | Yes | 120px |
| Name | `displayName` | Yes | 180px |
| Company | `companyName` | Yes | 150px |
| Email | `email` | Yes | 180px |
| Phone | `phone` | No | 120px |
| Status | `status` | Yes | 100px |
| Expected Revenue | `estimatedValue` | Yes | 130px |
| Probability | `probability` | Yes | 80px |
| Source | `source.type` | Yes | 100px |
| Assigned To | `assignedTo.firstName` | Yes | 120px |
| Created | `createdAt` | Yes | 100px |
| Tags | `tags` | No | 150px |
| Actions | - | No | 80px |

### Status Badge Colors
- `new`: Blue
- `contacted`: Yellow
- `qualified`: Purple
- `proposal`: Orange
- `negotiation`: Cyan
- `won`: Green
- `lost`: Red
- `dormant`: Gray

### Actions Menu (per row)
- View Details
- Edit
- Quick Log Activity
- Create Quote
- Convert to Client (if qualified+)
- Mark as Won/Lost
- Delete

### Pagination
- Default: 25 per page
- Options: 10, 25, 50, 100
- Show total count and current range

---

## 3. Lead Detail Page

**Route:** `/crm/leads/:id`
**Component:** `LeadDetail.jsx`
**API Endpoints:**
- `GET /api/leads/:id`
- `GET /api/crm-activities?entityType=lead&entityId=:id`

### Header Section
- Back button
- Lead name (large)
- Status badge with dropdown to change
- Action buttons: Edit, Create Quote, Convert, More...

### Quick Stats Row (horizontal cards)
| Stat | Field | Format |
|------|-------|--------|
| Expected Revenue | `estimatedValue` | Currency |
| Probability | `probability` | Percentage slider |
| Days in Stage | calculated | Number |
| Lead Score | `leadScore` | Score/150 with progress bar |
| Deal Health | `dealHealth.grade` | Letter grade (A-F) |

### Tab Navigation
1. **Overview** - Main lead information
2. **Activities** - Activity timeline
3. **Notes** - Notes section
4. **Documents** - File attachments
5. **History** - Audit log

### Overview Tab - Field Groups

**Basic Information**
| Field | Type | Required |
|-------|------|----------|
| Status | Dropdown | Yes |
| Type | Radio (Individual/Company) | Yes |
| First Name | Text | If Individual |
| Last Name | Text | If Individual |
| Arabic Name (4-part) | 4 Text fields | No |
| Company Name | Text | If Company |
| Company Name (Arabic) | Text | No |

**Contact Information**
| Field | Type | Required |
|-------|------|----------|
| Email | Email input | No |
| Phone | Phone input | No |
| Mobile | Phone input | No |
| WhatsApp | Phone input | No |
| Fax | Text | No |
| Website | URL input | No |

**Address**
| Field | Type |
|-------|------|
| Street | Text |
| City | Dropdown (Saudi cities) |
| State | Dropdown |
| Country | Dropdown |
| Postal Code | Text |
| National Address (7-part) | Special component |

**Company Profile**
| Field | Type |
|-------|------|
| Industry | Dropdown |
| Number of Employees | Dropdown |
| Annual Revenue | Number |
| CR Number | Text |
| VAT Number | Text |

**Deal Information**
| Field | Type |
|-------|------|
| Pipeline Stage | Stage selector |
| Probability | Slider 0-100% |
| Expected Revenue | Currency input |
| Weighted Revenue | Calculated (read-only) |
| Expected Close Date | Date picker |
| Currency | Dropdown |
| Recurring Revenue | Currency + Interval |

**Assignment**
| Field | Type |
|-------|------|
| Assigned To | User picker |
| Team Members | Multi-user picker |
| Sales Team | Dropdown |
| Territory | Dropdown |
| Campaign Source | Dropdown |

**BANT Qualification Section**
Collapsible section with:
- Budget: Dropdown + Amount + Notes
- Authority: Dropdown + Notes
- Need: Dropdown + Description
- Timeline: Dropdown + Notes
- Score breakdown visualization (radar chart)

**Deal Health Section**
- Health Score: Large number with grade
- Factor breakdown (6 factors as progress bars)
- AI Recommendations list

**Stakeholders Section**
- Table with: Contact, Role, Influence (1-10), Sentiment, Last Engagement
- Add Stakeholder button

**Competitors Section**
- List of competitor names
- Our advantages, Their advantages (text areas)

**Tags & Practice Area**
- Tag picker (multi-select with colors)
- Practice Area dropdown

**UTM Tracking (Collapsible)**
- Source, Medium, Campaign, Term, Content (read-only)

### Activities Tab
- Timeline view (vertical)
- Filter by activity type
- Add Activity button (floating action button)
- Each activity card shows:
  - Type icon with color
  - Title
  - Description preview
  - Date/time
  - Performed by user
  - Related entity link

### Notes Tab
- Rich text editor for new notes
- List of existing notes with:
  - Note content
  - Created by user
  - Timestamp
  - Edit/Delete actions

---

## 4. Lead Create/Edit Form

**Route:** `/crm/leads/new` and `/crm/leads/:id/edit`
**Component:** `LeadForm.jsx`
**API Endpoints:**
- `POST /api/leads` (create)
- `PUT /api/leads/:id` (update)

### Form Layout
- Multi-step wizard OR long scrollable form with section anchors
- Sticky header with Save/Cancel buttons
- Unsaved changes warning

### Validation Rules
| Field | Validation |
|-------|------------|
| Email | Valid email format |
| Phone | Valid phone format |
| Expected Revenue | Positive number |
| Probability | 0-100 |
| Expected Close Date | Future date for new leads |

### Auto-Save
- Debounced auto-save to draft after 3 seconds of inactivity
- Visual indicator showing save status

---

## 5. Pipeline Kanban Page

**Route:** `/crm/pipeline`
**Component:** `PipelineKanban.jsx`
**API Endpoints:**
- `GET /api/leads?view=kanban`
- `PATCH /api/leads/:id` (for drag-drop status update)

### Board Layout
- Horizontal scrollable board
- One column per stage
- Each column shows: Stage name, Count, Total value

### Card Design
- Drag handle area
- Lead name (bold)
- Company name
- Expected revenue
- Probability badge
- Assigned user avatar
- Days in stage indicator
- Color coding by deal health

### Card Quick Actions (on hover)
- Open detail
- Schedule activity
- Move to stage (submenu)

### Column Header
- Stage name
- Lead count badge
- Total value
- Collapse/Expand toggle

### Filters (Top bar)
- Pipeline selector (if multiple pipelines)
- Assigned to filter
- Team filter
- Territory filter
- Search

### Board Settings
- Toggle: Show/hide value on cards
- Toggle: Show/hide probability
- Color by: Deal Health, Age, Priority

### Drag and Drop
- Visual feedback during drag
- Drop zones highlight
- Confirm dialog when moving to Won/Lost
- Animate card movement

---

## 6. Contacts List Page

**Route:** `/crm/contacts`
**Component:** `ContactsList.jsx`
**API Endpoint:** `GET /api/contacts`

### Filter Bar
| Filter | Type |
|--------|------|
| Search | Text (name, email, phone, company) |
| Type | Dropdown (individual, organization, etc.) |
| Role | Dropdown (client_contact, witness, etc.) |
| Status | Dropdown |
| Conflict Status | Dropdown |
| VIP Only | Toggle |
| Tags | Tag picker |

### Data Table Columns
| Column | Field | Sortable |
|--------|-------|----------|
| Checkbox | - | No |
| Name | `fullName` | Yes |
| Company | `company` | Yes |
| Email | `email` | Yes |
| Phone | `phone` | No |
| Mobile | `mobile` | No |
| Type | `type` | Yes |
| Role | `primaryRole` | Yes |
| Conflict | `conflictCheckStatus` | Yes |
| Tags | `tags` | No |
| Last Activity | `lastActivityDate` | Yes |
| Actions | - | No |

### Conflict Status Badges
- `not_checked`: Gray "Not Checked"
- `clear`: Green "Clear"
- `potential_conflict`: Yellow "Potential"
- `confirmed_conflict`: Red "Conflict"

---

## 7. Contact Detail Page

**Route:** `/crm/contacts/:id`
**Component:** `ContactDetail.jsx`

### Header
- Avatar (initials or photo)
- Full name
- Company/Organization
- VIP badge (if applicable)
- Conflict status badge
- Action buttons: Edit, Link to Case, More...

### Quick Stats
- Total Cases Linked
- Last Activity Date
- Risk Level

### Tab Navigation
1. **Overview** - Contact information
2. **Cases** - Linked cases
3. **Activities** - Interaction history
4. **Documents** - Attachments

### Overview Tab Fields

**Identity Information**
- Salutation (dropdown)
- First Name, Middle Name, Last Name
- Arabic Name (4-part with auto-generate)
- Preferred Name
- Gender
- Date of Birth (Gregorian + Hijri)
- Nationality

**Identification Documents**
- Identity Type (dropdown)
- National ID (10 digits, starts with 1)
- Iqama Number (10 digits, starts with 2)
- GCC ID + Country
- Passport Number + Country + Expiry
- Identity Issue/Expiry Dates

**Contact Methods**
- Emails array (type, email, isPrimary, canContact)
- Phones array (type, number, isPrimary, canSMS, canWhatsApp)
- Preferred Contact Method
- Do Not Contact flags

**Employment**
- Company/Organization link
- Job Title
- Department
- Reports To (contact picker)
- Assistant Name/Phone

**National Address (Saudi)**
- Building Number (4 digits)
- Street Name (Arabic/English)
- District (Arabic/English)
- City
- Region (13 regions dropdown)
- Postal Code (5 digits)
- Additional Number (4 digits)
- Short Address

**Social Profiles**
- LinkedIn URL
- Twitter Handle
- Facebook URL

**Conflict Check Section**
- Status with colored badge
- Check Date
- Checked By
- Notes (long text)
- Run Conflict Check button

**Risk Assessment**
- Risk Level (low/medium/high)
- Blacklisted toggle
- Blacklist Reason

**Linked Entities**
- Cases table (case number, title, status)
- Clients table (client number, name)

---

## Shared Components Needed

### UserPicker
- Search users by name
- Show avatar + name
- Support multi-select option

### TagPicker
- Show existing tags with colors
- Create new tag inline
- Remove tags with X

### DateRangePicker
- Preset options (Today, Last 7 days, etc.)
- Custom range with calendar

### StatusBadge
- Color-coded by status
- Customizable label

### CurrencyInput
- Locale-aware formatting
- Currency symbol prefix
- Handles halalas (divide by 100)

### NationalAddressInput
- 7-field Saudi National Address
- Validation for each field format
- Short address auto-generation

### ArabicNameInput
- 4-part name structure
- Auto-concatenate to full name
- RTL text direction

### ActivityTimeline
- Vertical timeline with icons
- Filter by type
- Load more pagination

### DealHealthIndicator
- Letter grade (A-F) display
- Color coding
- Tooltip with factor breakdown

---

## RTL/Localization Notes

- All pages must support RTL layout for Arabic
- Use CSS logical properties (start/end vs left/right)
- Date formatting: Gregorian with Hijri option
- Currency: SAR with Arabic formatting option
- All labels need Arabic translations
- Form validation messages in current language
