# CRM Frontend Specifications - Part 2

## Overview
Continuation of frontend specifications covering Clients, Quotes, Products, Activities, Campaigns, and Settings pages.

---

## 8. Clients List Page

**Route:** `/crm/clients`
**Component:** `ClientsList.jsx`
**API Endpoint:** `GET /api/clients`

### Filter Bar
| Filter | Type | API Param |
|--------|------|-----------|
| Search | Text | `search` |
| Client Type | Dropdown | `clientType` |
| Status | Multi-select | `status` |
| Account Manager | User picker | `accountManagerId` |
| Territory | Dropdown | `territoryId` |
| Team | Dropdown | `salesTeamId` |
| Credit Status | Dropdown | `creditStatus` |
| Tags | Tag picker | `tags` |

### Data Table Columns
| Column | Field | Sortable |
|--------|-------|----------|
| Checkbox | - | No |
| Client Number | `clientNumber` | Yes |
| Name | `displayName` | Yes |
| Type | `clientType` | Yes |
| Email | `email` | Yes |
| Phone | `phone` | No |
| Status | `status` | Yes |
| Account Manager | `accountManagerId.firstName` | Yes |
| Lifetime Value | `lifetimeValue` | Yes |
| Open Balance | `totalOutstanding` | Yes |
| Credit Status | `creditStatus` | Yes |
| Tags | `tags` | No |
| Actions | - | No |

### Credit Status Badges
- `good`: Green
- `warning`: Yellow
- `hold`: Orange
- `blacklisted`: Red

### Quick Actions
- View Details
- Edit
- View Cases
- Create Invoice
- Log Activity
- Send Email

---

## 9. Client Detail Page

**Route:** `/crm/clients/:id`
**Component:** `ClientDetail.jsx`

### Header Section
- Client number badge
- Display name (large)
- Client type icon (individual/company)
- Status badge
- VIP indicator (star icon if VIP)
- Action buttons: Edit, Create Case, Create Invoice, More...

### Quick Stats Row
| Stat | Field | Format |
|------|-------|--------|
| Total Cases | `totalCases` | Number |
| Active Cases | `activeCases` | Number |
| Lifetime Value | `lifetimeValue` | Currency |
| Outstanding | `totalOutstanding` | Currency |
| Credit Status | `creditStatus` | Badge |
| Client Since | `createdAt` | Date |

### Tab Navigation
1. **Overview** - Client information
2. **Cases** - Linked cases
3. **Invoices** - Invoice history
4. **Quotes** - Quote history
5. **Activities** - Interaction history
6. **Documents** - File attachments
7. **Payments** - Payment history

### Overview Tab - Field Groups

**Basic Information**
- Same fields as Contact (identity, documents, addresses)
- Plus client-specific fields

**Billing Information**
| Field | Type |
|-------|------|
| Billing Type | Dropdown (hourly, flat_fee, contingency, retainer) |
| Hourly Rate | Currency |
| Currency | Dropdown |
| Payment Terms | Dropdown (immediate, net_15, net_30, net_45, net_60) |
| Credit Limit | Currency |
| Credit Used | Currency (read-only) |
| Credit Status | Dropdown with color |

**Discount Settings**
| Field | Type |
|-------|------|
| Has Discount | Toggle |
| Discount Percent | Number (0-100) |
| Discount Reason | Text |

**Invoice Preferences**
| Field | Type |
|-------|------|
| Invoice Delivery | Dropdown (email, mail, hand) |
| Invoice Language | Dropdown (ar, en, both) |

**VAT Registration**
| Field | Type |
|-------|------|
| Is Registered | Toggle |
| VAT Number | Text (15 digits) |

**Power of Attorney (for representation)**
| Field | Type |
|-------|------|
| Has POA | Toggle |
| POA Number | Text |
| Attorney Name | Text |
| Issue Date | Date |
| Expiry Date | Date |
| Powers | Multi-select |

**Relationship Info**
| Field | Type |
|-------|------|
| Client Source | Dropdown |
| Territory | Dropdown |
| Sales Team | Dropdown |
| Account Manager | User picker |
| Referred By | Text |
| Acquisition Cost | Currency |
| First Purchase Date | Date |

### Cases Tab
- Data table with: Case Number, Title, Type, Status, Assigned Lawyer, Created Date
- Filters: Status, Type, Date Range
- Create New Case button

### Invoices Tab
- Data table with: Invoice #, Date, Due Date, Amount, Status, Actions
- Filters: Status, Date Range
- Totals row showing: Total Invoiced, Total Paid, Total Outstanding
- Create Invoice button

### Quotes Tab
- Data table with: Quote ID, Title, Amount, Status, Valid Until, Actions
- Create Quote button

---

## 10. Quotes List Page

**Route:** `/crm/quotes`
**Component:** `QuotesList.jsx`
**API Endpoint:** `GET /api/quotes`

### Filter Bar
| Filter | Type |
|--------|------|
| Search | Text (quote ID, title, customer) |
| Status | Multi-select |
| Customer Type | Dropdown (lead, client) |
| Created By | User picker |
| Date Range | Date range picker |
| Valid Status | Dropdown (valid, expiring soon, expired) |

### Data Table Columns
| Column | Field | Sortable |
|--------|-------|----------|
| Checkbox | - | No |
| Quote ID | `quoteId` | Yes |
| Title | `title` | Yes |
| Customer | `customerName` | Yes |
| Status | `status` | Yes |
| Total Amount | `grandTotal` | Yes |
| Valid Until | `validUntil` | Yes |
| Created Date | `createdAt` | Yes |
| Created By | `createdBy.firstName` | Yes |
| Actions | - | No |

### Status Badges
- `draft`: Gray
- `sent`: Blue
- `viewed`: Purple
- `accepted`: Green
- `rejected`: Red
- `expired`: Orange
- `revised`: Cyan

### Actions
- View/Preview
- Edit (if draft)
- Duplicate
- Send to Customer
- Download PDF
- Convert to Invoice (if accepted)
- Delete (if draft)

---

## 11. Quote Detail Page

**Route:** `/crm/quotes/:id`
**Component:** `QuoteDetail.jsx`

### Header
- Quote ID badge
- Title
- Status badge
- Action buttons: Edit, Send, Download PDF, More...
- View count indicator

### Customer Section (Top card)
- Customer type icon
- Customer name (linked to lead/client)
- Email
- Phone
- Address

### Line Items Section
**Table Columns:**
| Column | Width |
|--------|-------|
| # | 40px |
| Item/Description | flex |
| Quantity | 80px |
| Unit Price | 120px |
| Discount | 100px |
| Tax | 80px |
| Total | 120px |

**Row Features:**
- Optional item indicator (checkbox styled)
- Expandable description
- Drag to reorder (in edit mode)

### Totals Section
| Row | Calculation |
|-----|-------------|
| Subtotal | Sum of line items |
| Discount | Global discount amount |
| Taxable Amount | Subtotal - Discount |
| VAT (15%) | Taxable × 0.15 |
| **Grand Total** | Taxable + VAT |

### Additional Sections
- **Payment Terms**: Display payment terms text
- **Terms & Conditions**: Collapsible section with T&C text
- **Internal Notes**: Only visible to staff

### Signatures Section (if enabled)
- Firm signature with date
- Customer signature area (if signed)
- E-sign button (if pending)

### View History
- Timeline showing: Created, Sent, Viewed (with counts), Accepted/Rejected

### Actions Panel (Sidebar)
- Send to Customer (opens email dialog)
- Download PDF (Arabic/English toggle)
- Duplicate Quote
- Create New Version
- Convert to Invoice
- Delete Quote

---

## 12. Quote Create/Edit Page

**Route:** `/crm/quotes/new` and `/crm/quotes/:id/edit`
**Component:** `QuoteForm.jsx`

### Step 1: Customer Selection
- Radio: New Lead / Existing Lead / Existing Client
- Search and select from list
- Quick create new lead option

### Step 2: Quote Details
| Field | Type | Required |
|-------|------|----------|
| Title | Text | Yes |
| Title (Arabic) | Text | No |
| Description | Rich text | No |
| Valid Until | Date picker | Yes |
| Currency | Dropdown | Yes |

### Step 3: Line Items Builder

**Add Item Options:**
- From Product Catalog (opens product picker)
- Custom Item

**Product Picker:**
- Search products by name/code
- Filter by category
- Show price and description
- Click to add with default qty

**Line Item Fields:**
| Field | Type |
|-------|------|
| Product/Service | Dropdown or text |
| Description | Textarea |
| Quantity | Number input |
| Unit | Dropdown |
| Unit Price | Currency input |
| Discount | Percentage or amount |
| Tax Rate | Percentage |
| Is Optional | Checkbox |

**Line Item Actions:**
- Drag handle to reorder
- Duplicate item
- Delete item

**Totals (Auto-calculated):**
- Subtotal
- Global Discount input
- Tax (15% VAT auto-calculated)
- Grand Total

### Step 4: Terms & Signatures
| Field | Type |
|-------|------|
| Payment Terms | Rich text or template select |
| Terms & Conditions | Template select or custom text |
| Require Signature | Toggle |
| Internal Notes | Textarea |

### Save Options
- Save as Draft
- Save and Send
- Preview before sending

---

## 13. Products/Services List Page

**Route:** `/crm/products`
**Component:** `ProductsList.jsx`
**API Endpoint:** `GET /api/products`

### Filter Bar
| Filter | Type |
|--------|------|
| Search | Text (name, code) |
| Type | Multi-select (service, product, subscription, retainer, hourly) |
| Category | Dropdown |
| Practice Area | Dropdown |
| Status | Toggle (active/all) |

### Data Table Columns
| Column | Field | Sortable |
|--------|-------|----------|
| Code | `code` | Yes |
| Name | `name` | Yes |
| Type | `type` | Yes |
| Category | `category` | Yes |
| Unit Price | `pricing.basePrice` | Yes |
| Unit | `unit` | No |
| Status | `isActive` | Yes |
| Times Sold | `statistics.timesSold` | Yes |
| Actions | - | No |

### Actions
- Edit
- Duplicate
- Toggle Active/Inactive
- Delete (if never used)

---

## 14. Product Form Page

**Route:** `/crm/products/new` and `/crm/products/:id`
**Component:** `ProductForm.jsx`

### Basic Information
| Field | Type | Required |
|-------|------|----------|
| Name | Text | Yes |
| Name (Arabic) | Text | No |
| Code/SKU | Text | Yes (auto-generate option) |
| Type | Dropdown | Yes |
| Category | Dropdown | No |
| Practice Area | Dropdown | No |

### Description
| Field | Type |
|-------|------|
| Description | Rich text |
| Description (Arabic) | Rich text |

### Pricing
| Field | Type |
|-------|------|
| Price Type | Radio (fixed, range, custom) |
| Base Price | Currency |
| Min Price | Currency (if range) |
| Max Price | Currency (if range) |
| Currency | Dropdown |
| Unit | Dropdown (hour, session, item, month, etc.) |

### Tax Settings
| Field | Type |
|-------|------|
| Tax Rate | Percentage (default 15%) |
| Tax Inclusive | Toggle |

### Recurring Settings (if type=subscription/retainer)
| Field | Type |
|-------|------|
| Billing Interval | Dropdown (monthly, quarterly, yearly) |
| Trial Days | Number |
| Setup Fee | Currency |

### Status & Tags
| Field | Type |
|-------|------|
| Active | Toggle |
| Tags | Tag picker |

---

## 15. Activities Calendar Page

**Route:** `/crm/activities/calendar`
**Component:** `ActivitiesCalendar.jsx`
**API Endpoint:** `GET /api/crm-activities?view=calendar`

### Calendar Views
- Month View (default)
- Week View
- Day View
- Agenda View (list)

### Activity Type Colors
| Type | Color |
|------|-------|
| call | Blue |
| email | Green |
| meeting | Purple |
| task | Orange |
| note | Gray |
| whatsapp | Green (WhatsApp) |

### Event Card Display
- Activity type icon
- Title (truncated)
- Time
- Related entity name

### Filter Sidebar
- Activity Type checkboxes
- Assigned To (user picker or "My Activities")
- Entity Type (lead, contact, client)
- Status (all, completed, pending, overdue)

### Create Activity
- Click on date/time slot
- Opens quick create modal
- Fields: Type, Title, Date/Time, Duration, Related Entity, Description, Reminder

### Drag & Drop
- Drag events to reschedule
- Confirm dialog for significant time changes

### Today Indicator
- Highlight current day
- Red line for current time (week/day views)

---

## 16. Tasks List Page

**Route:** `/crm/activities/tasks`
**Component:** `TasksList.jsx`
**API Endpoint:** `GET /api/crm-activities?type=task`

### View Toggle
- List View (default)
- Kanban by Status

### List View Columns
| Column | Field | Sortable |
|--------|-------|----------|
| Checkbox (complete) | `status` | No |
| Title | `title` | Yes |
| Related To | `entityName` | Yes |
| Due Date | `dueDate` | Yes |
| Priority | `priority` | Yes |
| Status | `status` | Yes |
| Assigned To | `assignedTo` | Yes |
| Actions | - | No |

### Kanban Columns
- To Do
- In Progress
- Completed
- Overdue (auto-populated)

### Priority Badges
- `low`: Gray
- `normal`: Blue
- `high`: Orange
- `urgent`: Red

### Quick Complete
- Checkbox click marks as completed
- Show completion animation

---

## 17. Campaigns List Page

**Route:** `/crm/campaigns`
**Component:** `CampaignsList.jsx`
**API Endpoint:** `GET /api/campaigns`

### Filter Bar
| Filter | Type |
|--------|------|
| Search | Text |
| Type | Dropdown |
| Channel | Dropdown |
| Status | Multi-select |
| Owner | User picker |
| Date Range | Date range picker |

### Data Table Columns
| Column | Field | Sortable |
|--------|-------|----------|
| Campaign Name | `name` | Yes |
| Type | `type` | Yes |
| Channel | `channel` | Yes |
| Status | `status` | Yes |
| Start Date | `schedule.startDate` | Yes |
| End Date | `schedule.endDate` | Yes |
| Budget | `budget.planned` | Yes |
| Leads Generated | `statistics.leadsGenerated` | Yes |
| Conversions | `statistics.leadsConverted` | Yes |
| ROI | calculated | Yes |
| Actions | - | No |

### Campaign Status Badges
- `draft`: Gray
- `scheduled`: Blue
- `active`: Green
- `paused`: Yellow
- `completed`: Purple
- `cancelled`: Red

### Actions
- View Details
- Edit (if draft/paused)
- Pause/Resume (if active)
- Duplicate
- View Analytics
- Delete (if draft)

---

## 18. Campaign Detail Page

**Route:** `/crm/campaigns/:id`
**Component:** `CampaignDetail.jsx`

### Header
- Campaign name
- Status badge with action buttons (Pause, Resume, Complete)
- Date range display
- Owner avatar

### Tab Navigation
1. **Overview** - Campaign details
2. **Leads** - Leads generated
3. **Statistics** - Performance metrics

### Overview Tab

**Campaign Information**
| Field | Type |
|-------|------|
| Name | Text |
| Type | Dropdown |
| Channel | Dropdown |
| Description | Rich text |
| UTM Parameters | UTM builder component |

**Schedule**
| Field | Type |
|-------|------|
| Start Date | Datetime |
| End Date | Datetime |
| Recurring | Toggle + settings |

**Budget**
| Field | Type |
|-------|------|
| Planned Budget | Currency |
| Actual Spent | Currency |
| Cost Per Lead | Calculated |

**Targets**
| Field | Type |
|-------|------|
| Target Leads | Number |
| Target Conversions | Number |
| Target Revenue | Currency |

**Target Audience**
| Field | Type |
|-------|------|
| Industries | Multi-select |
| Regions | Multi-select |
| Company Size | Multi-select |

### Leads Tab
- Data table of leads attributed to campaign
- Columns: Name, Status, Created, Revenue, Converted
- Link to lead detail

### Statistics Tab
**Metrics Cards:**
- Leads Generated vs Target
- Leads Converted
- Revenue Generated
- Cost per Lead
- ROI percentage

**Charts:**
- Leads over time (line)
- Conversion funnel
- Revenue by stage

**Email Stats (if email campaign):**
- Sent, Delivered, Opened, Clicked, Bounced, Unsubscribed
- Open rate, Click rate percentages

---

## 19. Settings Pages

### 19.1 Sales Teams Page
**Route:** `/crm/settings/teams`

- Card/grid view of teams
- Each card shows: Name, Member count, Lead count, Performance indicator
- Click card to manage members
- Create Team button

**Team Modal/Page:**
- Team name/description
- Members list with role assignment
- Capacity settings per member
- Assignment rules
- Targets

### 19.2 Territories Page
**Route:** `/crm/settings/territories`

- Tree view of territory hierarchy
- Expand/collapse nodes
- Drag to reorder/reparent
- Click to edit details

**Territory Form:**
- Name (Arabic/English)
- Code
- Parent territory
- Region criteria
- City criteria
- Assigned user or team
- Active toggle

### 19.3 Lost Reasons Page
**Route:** `/crm/settings/lost-reasons`

- Grouped by category
- Drag to reorder
- Usage count shown
- Add/Edit/Delete inline

### 19.4 Tags Page
**Route:** `/crm/settings/tags`

- Grid of tags with colors
- Filter by entity type
- Color picker on edit
- Merge tags function
- Usage count

### 19.5 Email Templates Page
**Route:** `/crm/settings/email-templates`

- List with preview thumbnails
- Filter by category/trigger
- Clone/Delete actions

**Template Editor:**
- Rich text editor
- Variable insertion buttons
- Preview with sample data
- Arabic/English tabs
- Save as active/draft

### 19.6 Competitors Page
**Route:** `/crm/settings/competitors`

- Table view
- Win/Loss stats per competitor
- SWOT-style notes

### 19.7 CRM Settings Page
**Route:** `/crm/settings`

**Sections:**
- Lead Settings (default status, auto-assignment rules)
- Opportunity Settings (probability by stage)
- Quote Settings (numbering, validity period, default terms)
- Activity Settings (reminders, working hours)
- Notification Settings (email triggers)

---

## Common UX Patterns

### Empty States
Each list page should have a meaningful empty state:
- Illustration
- Descriptive message
- Action button (Create first item)

### Loading States
- Skeleton loaders for tables
- Spinner for actions
- Progress bar for imports

### Error Handling
- Toast notifications for success/error
- Inline validation errors
- Full-page error with retry

### Responsive Breakpoints
- Desktop: 1200px+
- Tablet: 768px - 1199px
- Mobile: < 768px

### Keyboard Navigation
- Tab through form fields
- Enter to submit
- Escape to close modals
- Arrow keys in tables

### Confirmation Dialogs
Required for:
- Delete actions
- Status changes to Won/Lost
- Bulk actions
- Navigation away with unsaved changes
