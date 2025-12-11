# Complete V1 API Endpoint Reference

> **Last Updated:** 2025-12-11
> **Audited against backend routes for accuracy**

---

## Quick Reference - Route Versioning

| Route Pattern | Version | API Client | Example |
|---------------|---------|------------|---------|
| `/api/auth/*` | None | `apiClientNoVersion` | `/api/auth/login` |
| `/api/currency/*` | None | `apiClientNoVersion` | `/api/currency/rates` |
| `/api/v1/bank-reconciliation/currency/*` | v1 | `apiClient` | `/api/v1/bank-reconciliation/currency/rates` |
| Everything else | v1 | `apiClient` | `/api/v1/dashboard/hero-stats` |

**Currency routes exist at BOTH paths** (for backwards compatibility):
- `/api/currency/*` (standalone, non-versioned)
- `/api/v1/bank-reconciliation/currency/*` (nested under bank-reconciliation)

---

## NON-VERSIONED Routes (`/api/*`)

### Authentication (`/api/auth/*`)
```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/check-availability
POST   /api/auth/send-otp
POST   /api/auth/verify-otp
POST   /api/auth/resend-otp
GET    /api/auth/otp-status
```

### Currency (`/api/currency/*`)
```
GET    /api/currency/settings
GET    /api/currency/rates
POST   /api/currency/convert
POST   /api/currency/rates          # Set manual rate
GET    /api/currency/supported
POST   /api/currency/update         # Update from external API
```

---

## VERSIONED Routes (`/api/v1/*`)

All endpoints below are prefixed with `/api/v1/`

---

### DASHBOARD
```
GET    /dashboard/hero-stats
GET    /dashboard/stats
GET    /dashboard/financial-summary
GET    /dashboard/today-events
GET    /dashboard/recent-messages
GET    /dashboard/activity
```

---

### CLIENTS
```
POST   /clients
GET    /clients
GET    /clients/search
GET    /clients/stats
GET    /clients/top-revenue
GET    /clients/:id
PUT    /clients/:id
DELETE /clients/:id
GET    /clients/:id/billing-info
GET    /clients/:id/cases
GET    /clients/:id/invoices
GET    /clients/:id/payments
POST   /clients/:id/verify/wathq
GET    /clients/:id/wathq/:dataType
POST   /clients/:id/attachments
DELETE /clients/:id/attachments/:attachmentId
POST   /clients/:id/conflict-check
PATCH  /clients/:id/status
PATCH  /clients/:id/flags
DELETE /clients/bulk
```

---

### CASES
```
GET    /cases/statistics
POST   /cases
GET    /cases
GET    /cases/:id
PATCH  /cases/:id                    # Note: PATCH not PUT
DELETE /cases/:id
PATCH  /cases/:id/progress
PATCH  /cases/:id/status
PATCH  /cases/:id/outcome
GET    /cases/:id/audit

# Notes
POST   /cases/:id/note
PATCH  /cases/:id/notes/:noteId
DELETE /cases/:id/notes/:noteId

# Documents
POST   /cases/:id/documents/upload-url
POST   /cases/:id/documents/confirm
GET    /cases/:id/documents/:docId/download
DELETE /cases/:id/documents/:docId
POST   /cases/:id/document
DELETE /cases/:id/document/:documentId

# Hearings
POST   /cases/:id/hearing
PATCH  /cases/:id/hearings/:hearingId
DELETE /cases/:id/hearings/:hearingId

# Timeline
POST   /cases/:id/timeline
PATCH  /cases/:id/timeline/:eventId
DELETE /cases/:id/timeline/:eventId

# Claims
POST   /cases/:id/claim
PATCH  /cases/:id/claims/:claimId
DELETE /cases/:id/claims/:claimId

# Rich Documents
POST   /cases/:id/rich-documents
GET    /cases/:id/rich-documents
GET    /cases/:id/rich-documents/:docId
PATCH  /cases/:id/rich-documents/:docId
DELETE /cases/:id/rich-documents/:docId
GET    /cases/:id/rich-documents/:docId/versions
POST   /cases/:id/rich-documents/:docId/versions/:versionNumber/restore
GET    /cases/:id/rich-documents/:docId/export/pdf
GET    /cases/:id/rich-documents/:docId/export/latex
GET    /cases/:id/rich-documents/:docId/export/markdown
GET    /cases/:id/rich-documents/:docId/preview
```

---

### TASKS
```
# Templates
GET    /tasks/templates
POST   /tasks/templates
GET    /tasks/templates/:templateId
PUT    /tasks/templates/:templateId
PATCH  /tasks/templates/:templateId
DELETE /tasks/templates/:templateId
POST   /tasks/templates/:templateId/create

# Statistics & Lists
GET    /tasks/stats
GET    /tasks/upcoming
GET    /tasks/overdue
GET    /tasks/due-today
GET    /tasks/case/:caseId

# Bulk Operations
PUT    /tasks/bulk
DELETE /tasks/bulk

# AI/Voice Features
POST   /tasks/parse                  # Natural language
POST   /tasks/voice                  # Voice input
GET    /tasks/smart-schedule
POST   /tasks/auto-schedule
POST   /tasks/voice-to-item
POST   /tasks/voice-to-item/batch

# CRUD
POST   /tasks
GET    /tasks
GET    /tasks/:id
PUT    /tasks/:id
PATCH  /tasks/:id
DELETE /tasks/:id
POST   /tasks/:id/complete
POST   /tasks/:id/save-as-template

# Status & Progress
PATCH  /tasks/:id/status
PATCH  /tasks/:id/progress
PATCH  /tasks/:id/outcome
PATCH  /tasks/:id/estimate

# Subtasks
POST   /tasks/:id/subtasks
PATCH  /tasks/:id/subtasks/:subtaskId
PATCH  /tasks/:id/subtasks/:subtaskId/toggle
DELETE /tasks/:id/subtasks/:subtaskId

# Timer
POST   /tasks/:id/timer/start
POST   /tasks/:id/timer/stop
POST   /tasks/:id/time               # Manual time

# Comments
POST   /tasks/:id/comments
PUT    /tasks/:id/comments/:commentId
DELETE /tasks/:id/comments/:commentId

# Attachments
POST   /tasks/:id/attachments
GET    /tasks/:id/attachments/:attachmentId/download-url
GET    /tasks/:id/attachments/:attachmentId/versions
DELETE /tasks/:id/attachments/:attachmentId

# Documents
POST   /tasks/:id/documents
GET    /tasks/:id/documents
GET    /tasks/:id/documents/:documentId
PATCH  /tasks/:id/documents/:documentId
GET    /tasks/:id/documents/:documentId/versions
GET    /tasks/:id/documents/:documentId/versions/:versionId
POST   /tasks/:id/documents/:documentId/versions/:versionId/restore

# Voice Memos
POST   /tasks/:id/voice-memos
PATCH  /tasks/:id/voice-memos/:memoId/transcription

# Dependencies
POST   /tasks/:id/dependencies
DELETE /tasks/:id/dependencies/:dependencyTaskId

# Workflow
POST   /tasks/:id/workflow-rules
GET    /tasks/:id/time-tracking/summary
```

---

### INVOICES
```
GET    /invoices/stats
GET    /invoices/overdue
GET    /invoices/billable-items
GET    /invoices/open/:clientId
PATCH  /invoices/confirm-payment

POST   /invoices
GET    /invoices
GET    /invoices/:id
PATCH  /invoices/:id
PUT    /invoices/:id
DELETE /invoices/:id

# Actions
POST   /invoices/:id/send
POST   /invoices/:id/record-payment
POST   /invoices/:id/payments
POST   /invoices/:id/payment
POST   /invoices/:id/void
POST   /invoices/:id/duplicate
POST   /invoices/:id/send-reminder
POST   /invoices/:id/convert-to-credit-note
POST   /invoices/:id/apply-retainer
POST   /invoices/:id/submit-for-approval
POST   /invoices/:id/approve
POST   /invoices/:id/reject

# ZATCA Integration
POST   /invoices/:id/zatca/submit
GET    /invoices/:id/zatca/status

# Export
GET    /invoices/:id/pdf
GET    /invoices/:id/xml
```

---

### BILLING RATES
```
POST   /billing-rates
GET    /billing-rates
GET    /billing-rates/stats
GET    /billing-rates/applicable
GET    /billing-rates/:id
PUT    /billing-rates/:id
DELETE /billing-rates/:id
POST   /billing-rates/standard       # Note: POST to SET standard rate

# Aliases
GET    /billing/rates
POST   /billing/rates
GET    /billing/rates/stats
GET    /billing/rates/applicable
GET    /billing/rates/:id
PUT    /billing/rates/:id
DELETE /billing/rates/:id
POST   /billing/rates/standard

# Rate Groups (via /billing/groups)
GET    /billing/groups
POST   /billing/groups
GET    /billing/groups/:id
PUT    /billing/groups/:id
DELETE /billing/groups/:id
GET    /billing/groups/default
```

---

### PAYMENTS
```
GET    /payments/new
GET    /payments/stats
GET    /payments/summary
GET    /payments/unreconciled
GET    /payments/pending-checks
DELETE /payments/bulk

POST   /payments
GET    /payments
GET    /payments/:id
PUT    /payments/:id
DELETE /payments/:id

# Actions
POST   /payments/:id/complete
POST   /payments/:id/fail
POST   /payments/:id/refund
POST   /payments/:id/reconcile
PUT    /payments/:id/apply
DELETE /payments/:id/unapply/:invoiceId
PUT    /payments/:id/check-status
POST   /payments/:id/send-receipt
POST   /payments/:id/receipt
```

---

### EXPENSES
```
GET    /expenses/new
POST   /expenses/suggest-category
GET    /expenses/categories
GET    /expenses/stats
GET    /expenses/by-category
POST   /expenses/bulk-approve

POST   /expenses
GET    /expenses
GET    /expenses/:id
PUT    /expenses/:id
DELETE /expenses/:id

# Actions
POST   /expenses/:id/submit
POST   /expenses/:id/approve
POST   /expenses/:id/reject
POST   /expenses/:id/reimburse
POST   /expenses/:id/receipt
```

---

### ACCOUNTS (Chart of Accounts)
```
GET    /accounts/types
GET    /accounts
GET    /accounts/:id
GET    /accounts/:id/balance
POST   /accounts
PATCH  /accounts/:id                 # Note: PATCH not PUT
DELETE /accounts/:id
```

---

### GENERAL LEDGER
```
GET    /general-ledger/stats
GET    /general-ledger/summary
GET    /general-ledger/trial-balance
GET    /general-ledger/profit-loss
GET    /general-ledger/balance-sheet
GET    /general-ledger/account-balance/:accountId
GET    /general-ledger/reference/:model/:id
GET    /general-ledger/entries
GET    /general-ledger
GET    /general-ledger/:id
POST   /general-ledger/:id/void
POST   /general-ledger/void/:id      # Alias
```

---

### JOURNAL ENTRIES
```
POST   /journal-entries/simple
GET    /journal-entries
GET    /journal-entries/:id
POST   /journal-entries
PATCH  /journal-entries/:id          # Note: PATCH not PUT
POST   /journal-entries/:id/post
POST   /journal-entries/:id/void
DELETE /journal-entries/:id
```

---

### FISCAL PERIODS
```
GET    /fiscal-periods
GET    /fiscal-periods/current
GET    /fiscal-periods/can-post
GET    /fiscal-periods/years-summary
POST   /fiscal-periods/create-year
GET    /fiscal-periods/:id
GET    /fiscal-periods/:id/balances
POST   /fiscal-periods/:id/open
POST   /fiscal-periods/:id/close
POST   /fiscal-periods/:id/reopen
POST   /fiscal-periods/:id/lock
POST   /fiscal-periods/:id/year-end-closing
```

---

### RECURRING TRANSACTIONS
```
GET    /recurring-transactions
GET    /recurring-transactions/upcoming
GET    /recurring-transactions/:id
POST   /recurring-transactions
PUT    /recurring-transactions/:id
DELETE /recurring-transactions/:id
POST   /recurring-transactions/:id/pause
POST   /recurring-transactions/:id/resume
POST   /recurring-transactions/:id/cancel
POST   /recurring-transactions/:id/generate
POST   /recurring-transactions/process-due
```

---

### RETAINERS
```
POST   /retainers
GET    /retainers
GET    /retainers/stats
GET    /retainers/low-balance
GET    /retainers/:id
PUT    /retainers/:id
POST   /retainers/:id/consume
POST   /retainers/:id/replenish      # Note: "replenish" not "deposit"
POST   /retainers/:id/refund
GET    /retainers/:id/history        # Note: "history" not "transactions"
```

---

### TRUST ACCOUNTS
```
GET    /trust-accounts
POST   /trust-accounts
GET    /trust-accounts/:id
PATCH  /trust-accounts/:id           # Note: PATCH not PUT
DELETE /trust-accounts/:id
GET    /trust-accounts/:id/summary
GET    /trust-accounts/:id/transactions
POST   /trust-accounts/:id/transactions
GET    /trust-accounts/:id/transactions/:transactionId
POST   /trust-accounts/:id/transactions/:transactionId/void
GET    /trust-accounts/:id/balances
GET    /trust-accounts/:id/balances/:clientId
POST   /trust-accounts/:id/transfer
GET    /trust-accounts/:id/reconciliations
POST   /trust-accounts/:id/reconciliations
GET    /trust-accounts/:id/three-way-reconciliations
POST   /trust-accounts/:id/three-way-reconciliations
```

---

### BILLS
```
GET    /bills/overdue
GET    /bills/summary
GET    /bills/recurring
GET    /bills/reports/aging
GET    /bills/export

POST   /bills
GET    /bills
GET    /bills/:id
PUT    /bills/:id
DELETE /bills/:id

# Actions
POST   /bills/:id/approve
POST   /bills/:id/pay
POST   /bills/:id/post-to-gl
POST   /bills/:id/receive
POST   /bills/:id/cancel
POST   /bills/:id/duplicate
POST   /bills/:id/attachments
DELETE /bills/:id/attachments/:attachmentId
POST   /bills/:id/stop-recurring
POST   /bills/:id/generate-next
```

---

### VENDORS
```
GET    /vendors
POST   /vendors
GET    /vendors/:id
PUT    /vendors/:id
DELETE /vendors/:id
```

---

### BANK RECONCILIATION (`/api/v1/bank-reconciliation/*`)
```
# Bank Feeds
GET    /bank-reconciliation/feeds
POST   /bank-reconciliation/feeds
PUT    /bank-reconciliation/feeds/:id
DELETE /bank-reconciliation/feeds/:id

# Import
POST   /bank-reconciliation/import/csv
POST   /bank-reconciliation/import/ofx
GET    /bank-reconciliation/import/template

# Matching
GET    /bank-reconciliation/suggestions/:accountId
POST   /bank-reconciliation/auto-match/:accountId
POST   /bank-reconciliation/match/confirm/:id
POST   /bank-reconciliation/match/reject/:id
POST   /bank-reconciliation/match/split
DELETE /bank-reconciliation/match/:id

# Rules
POST   /bank-reconciliation/rules
GET    /bank-reconciliation/rules
PUT    /bank-reconciliation/rules/:id
DELETE /bank-reconciliation/rules/:id

# Reconciliations
POST   /bank-reconciliation
GET    /bank-reconciliation
GET    /bank-reconciliation/:id
POST   /bank-reconciliation/:id/clear
POST   /bank-reconciliation/:id/unclear
POST   /bank-reconciliation/:id/complete
POST   /bank-reconciliation/:id/cancel

# Status & Reporting
GET    /bank-reconciliation/status/:accountId
GET    /bank-reconciliation/unmatched/:accountId
GET    /bank-reconciliation/statistics/matches
GET    /bank-reconciliation/statistics/rules

# Currency (also available at /api/currency/*)
GET    /bank-reconciliation/currency/rates
POST   /bank-reconciliation/currency/convert
POST   /bank-reconciliation/currency/rates
GET    /bank-reconciliation/currency/supported
POST   /bank-reconciliation/currency/update
```

---

### LEADS (CRM)
```
GET    /leads/stats
GET    /leads/follow-up
GET    /leads/pipeline/:pipelineId?

POST   /leads
GET    /leads
GET    /leads/:id
PUT    /leads/:id
DELETE /leads/:id

# Actions
POST   /leads/:id/status
POST   /leads/:id/move
GET    /leads/:id/conversion-preview
POST   /leads/:id/convert

# Activities
GET    /leads/:id/activities
POST   /leads/:id/activities
POST   /leads/:id/follow-up
```

---

### CRM ACTIVITIES
```
GET    /crm-activities/stats
GET    /crm-activities/tasks/upcoming
GET    /crm-activities/timeline/:entityType/:entityId

POST   /crm-activities
GET    /crm-activities
GET    /crm-activities/:id
PUT    /crm-activities/:id
DELETE /crm-activities/:id

# Log shortcuts
POST   /crm-activities/log/call
POST   /crm-activities/log/email
POST   /crm-activities/log/meeting
POST   /crm-activities/log/note
```

---

### CRM PIPELINES
```
GET    /crm-pipelines
POST   /crm-pipelines
GET    /crm-pipelines/:id
PUT    /crm-pipelines/:id
DELETE /crm-pipelines/:id
```

---

### DOCUMENTS
```
POST   /documents/upload
POST   /documents/confirm
GET    /documents/search
GET    /documents/stats
GET    /documents/recent
GET    /documents/case/:caseId
GET    /documents/client/:clientId
POST   /documents/bulk-delete

GET    /documents
GET    /documents/:id
PATCH  /documents/:id                # Note: PATCH not PUT
DELETE /documents/:id
GET    /documents/:id/download
GET    /documents/:id/versions
POST   /documents/:id/versions
POST   /documents/:id/versions/:versionId/restore
POST   /documents/:id/share
POST   /documents/:id/revoke-share
POST   /documents/:id/move
```

---

### CALENDAR
```
GET    /calendar
GET    /calendar/upcoming
GET    /calendar/overdue
GET    /calendar/stats
GET    /calendar/date/:date
GET    /calendar/month/:year/:month
```

---

### EVENTS
```
GET    /events/stats
GET    /events/calendar
GET    /events/upcoming
GET    /events/month/:year/:month
GET    /events/date/:date
POST   /events/availability
POST   /events/import/ics
POST   /events/parse                 # Natural language
POST   /events/voice                 # Voice input

POST   /events
GET    /events
GET    /events/:id
GET    /events/:id/export/ics
PUT    /events/:id
PATCH  /events/:id
DELETE /events/:id

# Actions
POST   /events/:id/complete
POST   /events/:id/cancel
POST   /events/:id/postpone

# Attendees
POST   /events/:id/attendees
DELETE /events/:id/attendees/:attendeeId
POST   /events/:id/rsvp

# Agenda
POST   /events/:id/agenda
PUT    /events/:id/agenda/:agendaId
DELETE /events/:id/agenda/:agendaId

# Action Items
POST   /events/:id/action-items
PUT    /events/:id/action-items/:itemId
```

---

### REMINDERS
```
# Location-based
GET    /reminders/location/summary
GET    /reminders/location/locations
POST   /reminders/location
POST   /reminders/location/check
POST   /reminders/location/nearby
POST   /reminders/location/save
POST   /reminders/location/distance
PUT    /reminders/location/locations/:locationId
DELETE /reminders/location/locations/:locationId
POST   /reminders/location/:reminderId/reset

# Statistics & Lists
GET    /reminders/stats
GET    /reminders/upcoming
GET    /reminders/overdue
GET    /reminders/snoozed-due
GET    /reminders/delegated

# AI/Voice
POST   /reminders/parse              # Natural language
POST   /reminders/voice              # Voice input

# Bulk
PUT    /reminders/bulk
DELETE /reminders/bulk

# CRUD
POST   /reminders
GET    /reminders
GET    /reminders/:id
PUT    /reminders/:id
PATCH  /reminders/:id
DELETE /reminders/:id

# Actions
POST   /reminders/:id/complete
POST   /reminders/:id/dismiss
POST   /reminders/:id/snooze
POST   /reminders/:id/delegate
```

---

### TIME TRACKING
```
POST   /time-tracking/timer/start
POST   /time-tracking/timer/pause
POST   /time-tracking/timer/resume
POST   /time-tracking/timer/stop
GET    /time-tracking/timer/status
GET    /time-tracking/weekly
GET    /time-tracking/stats
GET    /time-tracking/unbilled
GET    /time-tracking/activity-codes
DELETE /time-tracking/entries/bulk
POST   /time-tracking/entries/bulk-approve

POST   /time-tracking/entries
GET    /time-tracking/entries
GET    /time-tracking/entries/:id
PATCH  /time-tracking/entries/:id
PUT    /time-tracking/entries/:id
DELETE /time-tracking/entries/:id

# Actions
POST   /time-tracking/entries/:id/write-off
POST   /time-tracking/entries/:id/write-down
POST   /time-tracking/entries/:id/approve
POST   /time-tracking/entries/:id/reject
```

---

### STAFF
```
GET    /staff
GET    /staff/stats
GET    /staff/team
GET    /staff/:id
POST   /staff
PUT    /staff/:id
DELETE /staff/:id
```

---

### TEAM
```
GET    /team
GET    /team/options
GET    /team/stats
GET    /team/:id
POST   /team/invite
```

---

### FIRMS
```
GET    /firms
GET    /firms/roles
GET    /firms/my
GET    /firms/my/permissions
POST   /firms
GET    /firms/:id
PUT    /firms/:id
PATCH  /firms/:id
PATCH  /firms/:id/billing

# Team Management
GET    /firms/:id/team
GET    /firms/:id/members
GET    /firms/:id/departed
POST   /firms/:id/members/invite
POST   /firms/:id/members/:memberId/depart
POST   /firms/:id/members/:memberId/reinstate
PUT    /firms/:id/members/:memberId
DELETE /firms/:id/members/:memberId
POST   /firms/:id/leave
POST   /firms/:id/transfer-ownership

# Invitations
POST   /firms/:firmId/invitations
GET    /firms/:firmId/invitations
DELETE /firms/:firmId/invitations/:invitationId
POST   /firms/:firmId/invitations/:invitationId/resend

# Stats
GET    /firms/:id/stats

# Lawyer Management
POST   /firms/lawyer/add
POST   /firms/lawyer/remove
```

---

### PERMISSIONS
```
GET    /permissions/my-permissions
GET    /permissions/me/summary
POST   /permissions/check
POST   /permissions/check-batch
GET    /permissions/config
POST   /permissions/cache/clear
GET    /permissions/cache/stats
GET    /permissions/decisions
GET    /permissions/decisions/compliance-report
GET    /permissions/decisions/denied
GET    /permissions/decisions/stats

# Policies
GET    /permissions/policies
GET    /permissions/policies/:id
POST   /permissions/policies
PUT    /permissions/policies/:id
DELETE /permissions/policies/:id

# Relations
GET    /permissions/relations
POST   /permissions/relations
POST   /permissions/relations/bulk
DELETE /permissions/relations/:id
GET    /permissions/relations/check
GET    /permissions/relations/stats

# UI Permissions
POST   /permissions/ui/check-page
GET    /permissions/ui/config
GET    /permissions/ui/matrix
GET    /permissions/ui/overrides
GET    /permissions/ui/pages/all
GET    /permissions/ui/sidebar
GET    /permissions/ui/sidebar/all
```

---

### SETTINGS
```
# User Settings
GET    /settings                     # Get all user settings
PATCH  /settings/account             # Update account settings
PATCH  /settings/appearance          # Update appearance settings
PATCH  /settings/display             # Update display settings
PATCH  /settings/notifications       # Update notification settings

# Company Settings
GET    /settings/company
PUT    /settings/company
POST   /settings/company/logo        # Upload logo (multipart/form-data)

# Tax Settings
GET    /settings/taxes
POST   /settings/taxes
PUT    /settings/taxes/:id
DELETE /settings/taxes/:id
PATCH  /settings/taxes/:id/default   # Set default tax

# Payment Mode Settings
GET    /settings/payment-modes
POST   /settings/payment-modes
PUT    /settings/payment-modes/:id
DELETE /settings/payment-modes/:id
PATCH  /settings/payment-modes/:id/default

# Finance Settings
GET    /settings/finance
PUT    /settings/finance
```

---

### REPORTS
```
GET    /reports/profit-loss
GET    /reports/balance-sheet
GET    /reports/trial-balance
GET    /reports/ar-aging
GET    /reports/ap-aging
GET    /reports/accounts-aging
GET    /reports/case-profitability
GET    /reports/outstanding-invoices
GET    /reports/revenue-by-client
GET    /reports/time-entries
GET    /reports/budget-variance
GET    /reports/client-statement
GET    /reports/vendor-ledger
GET    /reports/gross-profit
GET    /reports/cost-center
POST   /reports/export
POST   /reports/generate
GET    /reports/templates
GET    /reports
GET    /reports/:id
DELETE /reports/:id
POST   /reports/:id/schedule
DELETE /reports/:id/schedule
```

---

### HR MODULE

#### HR Core (`/hr/*`)
```
GET    /hr/options
GET    /hr/employees/stats
POST   /hr/employees
GET    /hr/employees
GET    /hr/employees/:id
PUT    /hr/employees/:id
DELETE /hr/employees/:id
POST   /hr/employees/:id/allowances
DELETE /hr/employees/:id/allowances/:allowanceId
```

#### Attendance (`/attendance/*`)
```
GET    /attendance/today
GET    /attendance/violations
GET    /attendance/corrections/pending
GET    /attendance/report/monthly
GET    /attendance/stats/department
POST   /attendance/check-in
POST   /attendance/check-out
POST   /attendance/mark-absences
POST   /attendance/import
GET    /attendance/status/:employeeId
GET    /attendance/summary/:employeeId
GET    /attendance/employee/:employeeId/date/:date

GET    /attendance
POST   /attendance
GET    /attendance/:id
PUT    /attendance/:id
DELETE /attendance/:id

# Breaks
POST   /attendance/:id/break/start
POST   /attendance/:id/break/end
GET    /attendance/:id/breaks

# Corrections
POST   /attendance/:id/corrections
PUT    /attendance/:id/corrections/:correctionId

# Actions
POST   /attendance/:id/approve
POST   /attendance/:id/reject
POST   /attendance/:id/violations
PUT    /attendance/:id/violations/:violationIndex/resolve
POST   /attendance/:id/violations/:violationIndex/appeal
POST   /attendance/:id/overtime/approve
```

#### Leave Requests (`/leave-requests/*`)
> **IMPORTANT:** Path is `/leave-requests/*` NOT `/leave/*`

```
GET    /leave-requests/types
GET    /leave-requests/stats
GET    /leave-requests/calendar
GET    /leave-requests/pending-approvals
POST   /leave-requests/check-conflicts
GET    /leave-requests/balance/:employeeId    # Note: singular "balance"

GET    /leave-requests
POST   /leave-requests
GET    /leave-requests/:id
PATCH  /leave-requests/:id                    # Note: PATCH not PUT
DELETE /leave-requests/:id

# Actions
POST   /leave-requests/:id/submit
POST   /leave-requests/:id/approve
POST   /leave-requests/:id/reject
POST   /leave-requests/:id/cancel
POST   /leave-requests/:id/confirm-return
POST   /leave-requests/:id/request-extension
POST   /leave-requests/:id/complete-handover
POST   /leave-requests/:id/documents
```

#### Payroll (`/payroll/*` and `/payroll-runs/*`)
```
# Payroll Slips
GET    /payroll/stats
POST   /payroll/generate
POST   /payroll/approve
POST   /payroll/pay
POST   /payroll/wps/submit
GET    /payroll
POST   /payroll
GET    /payroll/:id
PUT    /payroll/:id
DELETE /payroll/:id
POST   /payroll/:id/approve
POST   /payroll/:id/pay

# Payroll Runs
GET    /payroll-runs/stats
GET    /payroll-runs
POST   /payroll-runs
GET    /payroll-runs/:id
PATCH  /payroll-runs/:id                     # Note: PATCH not PUT
DELETE /payroll-runs/:id
POST   /payroll-runs/:id/calculate
POST   /payroll-runs/:id/validate
POST   /payroll-runs/:id/approve
POST   /payroll-runs/:id/process-payments
POST   /payroll-runs/:id/cancel
POST   /payroll-runs/:id/generate-wps
POST   /payroll-runs/:id/send-notifications
POST   /payroll-runs/:id/employees/:empId/hold
POST   /payroll-runs/:id/employees/:empId/unhold
```

#### HR Advances (`/hr/advances/*`)
```
GET    /hr/advances/stats
GET    /hr/advances/pending-approvals
GET    /hr/advances/overdue-recoveries
GET    /hr/advances/emergency
POST   /hr/advances/check-eligibility
POST   /hr/advances/bulk-delete
GET    /hr/advances/by-employee/:employeeId

GET    /hr/advances
POST   /hr/advances
GET    /hr/advances/:advanceId              # Note: :advanceId not :id
PATCH  /hr/advances/:advanceId
DELETE /hr/advances/:advanceId

# Actions
POST   /hr/advances/:advanceId/approve
POST   /hr/advances/:advanceId/reject
POST   /hr/advances/:advanceId/cancel
POST   /hr/advances/:advanceId/disburse
POST   /hr/advances/:advanceId/recover
POST   /hr/advances/:advanceId/payroll-deduction
POST   /hr/advances/:advanceId/early-recovery
POST   /hr/advances/:advanceId/write-off
POST   /hr/advances/:advanceId/issue-clearance
POST   /hr/advances/:advanceId/documents
POST   /hr/advances/:advanceId/communications
```

#### HR Employee Loans (`/hr/employee-loans/*`)
```
GET    /hr/employee-loans/overdue-installments
GET    /hr/employee-loans/pending-approvals
GET    /hr/employee-loans/stats
POST   /hr/employee-loans/check-eligibility
POST   /hr/employee-loans/bulk-delete

GET    /hr/employee-loans
POST   /hr/employee-loans
GET    /hr/employee-loans/:id
PATCH  /hr/employee-loans/:id
DELETE /hr/employee-loans/:id
```

#### HR Benefits (`/hr/employee-benefits/*`)
```
GET    /hr/employee-benefits/cost-summary
GET    /hr/employee-benefits/export
GET    /hr/employee-benefits/stats
POST   /hr/employee-benefits/bulk-delete

GET    /hr/employee-benefits
POST   /hr/employee-benefits
GET    /hr/employee-benefits/:id
PATCH  /hr/employee-benefits/:id
DELETE /hr/employee-benefits/:id
```

#### HR Expense Claims (`/hr/expense-claims/*`)
```
GET    /hr/expense-claims/mileage-rates
GET    /hr/expense-claims/pending-approvals
GET    /hr/expense-claims/pending-payments
GET    /hr/expense-claims/policies
GET    /hr/expense-claims/stats
POST   /hr/expense-claims/bulk-delete

GET    /hr/expense-claims
POST   /hr/expense-claims
GET    /hr/expense-claims/:id
PATCH  /hr/expense-claims/:id
DELETE /hr/expense-claims/:id
```

#### HR Grievances (`/hr/grievances/*`)
```
GET    /hr/grievances/export
GET    /hr/grievances/overdue
GET    /hr/grievances/stats
POST   /hr/grievances/bulk-delete

GET    /hr/grievances
POST   /hr/grievances
GET    /hr/grievances/:id
PATCH  /hr/grievances/:id
DELETE /hr/grievances/:id
```

#### HR Job Positions (`/hr/job-positions/*`)
```
GET    /hr/job-positions/export
GET    /hr/job-positions/org-chart
GET    /hr/job-positions/stats
GET    /hr/job-positions/vacant
POST   /hr/job-positions/bulk-delete

GET    /hr/job-positions
POST   /hr/job-positions
GET    /hr/job-positions/:id
PATCH  /hr/job-positions/:id
DELETE /hr/job-positions/:id
```

#### HR Onboarding (`/hr/onboarding/*`)
```
GET    /hr/onboarding/stats
POST   /hr/onboarding/bulk-delete

GET    /hr/onboarding
POST   /hr/onboarding
GET    /hr/onboarding/:id
PATCH  /hr/onboarding/:id
DELETE /hr/onboarding/:id
```

#### HR Offboarding (`/hr/offboarding/*`)
```
GET    /hr/offboarding/pending-clearances
GET    /hr/offboarding/pending-settlements
GET    /hr/offboarding/stats
POST   /hr/offboarding/bulk-delete

GET    /hr/offboarding
POST   /hr/offboarding
GET    /hr/offboarding/:id
PATCH  /hr/offboarding/:id
DELETE /hr/offboarding/:id
```

#### HR Asset Assignments (`/hr/asset-assignments/*`)
```
GET    /hr/asset-assignments/by-employee/:employeeId
GET    /hr/asset-assignments/export
GET    /hr/asset-assignments/maintenance-due
GET    /hr/asset-assignments/overdue
GET    /hr/asset-assignments/policies
GET    /hr/asset-assignments/stats
GET    /hr/asset-assignments/warranty-expiring
POST   /hr/asset-assignments/bulk-delete

GET    /hr/asset-assignments
POST   /hr/asset-assignments
GET    /hr/asset-assignments/:id
PATCH  /hr/asset-assignments/:id
DELETE /hr/asset-assignments/:id

# Actions
POST   /hr/asset-assignments/:id/acknowledge
POST   /hr/asset-assignments/:id/clearance
POST   /hr/asset-assignments/:id/incident
POST   /hr/asset-assignments/:id/incidents/:incidentId/resolve
POST   /hr/asset-assignments/:id/maintenance
POST   /hr/asset-assignments/:id/repair
PUT    /hr/asset-assignments/:id/repair/:repairId
POST   /hr/asset-assignments/:id/return/complete
POST   /hr/asset-assignments/:id/return/initiate
PUT    /hr/asset-assignments/:id/status
POST   /hr/asset-assignments/:id/transfer
```

#### HR Compensation & Rewards (`/hr/compensation-rewards/*`)
```
GET    /hr/compensation-rewards/department-summary
GET    /hr/compensation-rewards/export
GET    /hr/compensation-rewards/pending-reviews
GET    /hr/compensation-rewards/stats
POST   /hr/compensation-rewards/bulk-delete

GET    /hr/compensation-rewards
POST   /hr/compensation-rewards
GET    /hr/compensation-rewards/:id
PATCH  /hr/compensation-rewards/:id
DELETE /hr/compensation-rewards/:id
```

#### HR Organizational Structure (`/hr/organizational-structure/*`)
```
GET    /hr/organizational-structure/export
POST   /hr/organizational-structure/merge
POST   /hr/organizational-structure/bulk-delete

GET    /hr/organizational-structure
POST   /hr/organizational-structure
GET    /hr/organizational-structure/:id
PATCH  /hr/organizational-structure/:id
DELETE /hr/organizational-structure/:id
```

#### Succession Plans (`/succession-plans/*`)
```
GET    /succession-plans/critical-without-successors
GET    /succession-plans/export
GET    /succession-plans/high-risk
GET    /succession-plans/review-due
GET    /succession-plans/stats
POST   /succession-plans/bulk-delete

GET    /succession-plans
POST   /succession-plans
GET    /succession-plans/:id
PATCH  /succession-plans/:id
DELETE /succession-plans/:id
```

#### HR Analytics (`/hr-analytics/*`)
```
GET    /hr-analytics/dashboard
GET    /hr-analytics/absenteeism
GET    /hr-analytics/attendance
GET    /hr-analytics/compensation
GET    /hr-analytics/demographics
GET    /hr-analytics/export
GET    /hr-analytics/leave
GET    /hr-analytics/performance
GET    /hr-analytics/recruitment
GET    /hr-analytics/saudization
GET    /hr-analytics/snapshot
GET    /hr-analytics/training
GET    /hr-analytics/trends
GET    /hr-analytics/turnover

# Predictions
GET    /hr-analytics/predictions/absence
GET    /hr-analytics/predictions/attrition
GET    /hr-analytics/predictions/engagement
GET    /hr-analytics/predictions/flight-risk
GET    /hr-analytics/predictions/high-potential
GET    /hr-analytics/predictions/workforce
```

---

### SAUDI BANKING (`/saudi-banking/*`)

#### SADAD
```
GET    /saudi-banking/sadad/billers
GET    /saudi-banking/sadad/billers/search
POST   /saudi-banking/sadad/bills/inquiry
POST   /saudi-banking/sadad/bills/pay
GET    /saudi-banking/sadad/payments/:transactionId/status
GET    /saudi-banking/sadad/payments/history
```

#### WPS
```
POST   /saudi-banking/wps/generate
POST   /saudi-banking/wps/download
POST   /saudi-banking/wps/validate
GET    /saudi-banking/wps/files
GET    /saudi-banking/wps/sarie-banks
```

#### MUDAD
```
POST   /saudi-banking/mudad/payroll/calculate
POST   /saudi-banking/mudad/payroll/submit
POST   /saudi-banking/mudad/gosi/calculate
POST   /saudi-banking/mudad/gosi/report          # Note: POST not GET
POST   /saudi-banking/mudad/wps/generate
GET    /saudi-banking/mudad/submissions/:submissionId/status
POST   /saudi-banking/mudad/compliance/nitaqat   # Note: POST not GET
POST   /saudi-banking/mudad/compliance/minimum-wage  # Note: POST not GET
```

#### Lean Tech
```
GET    /saudi-banking/lean/banks
GET    /saudi-banking/lean/customers
POST   /saudi-banking/lean/customers
GET    /saudi-banking/lean/customers/:customerId/token
GET    /saudi-banking/lean/customers/:customerId/entities
GET    /saudi-banking/lean/entities/:entityId/accounts
GET    /saudi-banking/lean/accounts/:accountId/balance
GET    /saudi-banking/lean/accounts/:accountId/transactions
GET    /saudi-banking/lean/entities/:entityId/identity
POST   /saudi-banking/lean/payments
DELETE /saudi-banking/lean/entities/:entityId
POST   /saudi-banking/lean/webhook
```

---

### OTHER ENDPOINTS

#### Activities
```
GET    /activities/summary
GET    /activities/overview
GET    /activities/:entityType/:entityId
GET    /activities
GET    /activities/:id
POST   /activities
```

#### Approvals
```
GET    /approvals/my-requests
GET    /approvals/pending
GET    /approvals/rules
PUT    /approvals/rules
POST   /approvals/rules
DELETE /approvals/rules/:id
GET    /approvals/stats
GET    /approvals/templates
GET    /approvals/:id
POST   /approvals/check
POST   /approvals/:id/approve
POST   /approvals/:id/reject
POST   /approvals/:id/cancel
```

#### Audit Logs
```
GET    /audit/export
GET    /audit/options
GET    /audit/stats
GET    /audit-logs
GET    /audit-logs/check-brute-force
GET    /audit-logs/export
GET    /audit-logs/failed-logins
GET    /audit-logs/security
GET    /audit-logs/suspicious
```

#### Conflict Checks
```
GET    /conflict-checks/stats
POST   /conflict-checks/quick

GET    /conflict-checks
POST   /conflict-checks
GET    /conflict-checks/:id
PUT    /conflict-checks/:id
DELETE /conflict-checks/:id
```

#### Followups
```
GET    /followups/overdue
GET    /followups/stats
GET    /followups/today
POST   /followups/bulk-complete
POST   /followups/bulk-delete

GET    /followups
POST   /followups
GET    /followups/:id
PUT    /followups/:id
DELETE /followups/:id
```

#### Gantt
```
GET    /gantt/data
GET    /gantt/data/filter
POST   /gantt/milestone
GET    /gantt/resources
GET    /gantt/resources/conflicts
POST   /gantt/resources/suggest
POST   /gantt/task/reorder
GET    /gantt/collaboration/presence
GET    /gantt/collaboration/stats
```

#### Health Checks
```
GET    /health
GET    /health/detailed
GET    /health/live
GET    /health/ping
GET    /health/ready
```

#### WhatsApp
```
GET    /whatsapp/analytics
GET    /whatsapp/broadcasts
GET    /whatsapp/conversations
POST   /whatsapp/messages/send
POST   /whatsapp/messages/send-template
POST   /whatsapp/send/location
POST   /whatsapp/send/media
POST   /whatsapp/send/template
POST   /whatsapp/send/text
GET    /whatsapp/stats
GET    /whatsapp/templates
```

---

## Summary Table

| Feature | Path | Version |
|---------|------|---------|
| Auth | `/api/auth/*` | None |
| Currency | `/api/currency/*` | None |
| Currency (alt) | `/api/v1/bank-reconciliation/currency/*` | v1 |
| Dashboard | `/api/v1/dashboard/*` | v1 |
| Clients | `/api/v1/clients/*` | v1 |
| Cases | `/api/v1/cases/*` | v1 |
| Tasks | `/api/v1/tasks/*` | v1 |
| Invoices | `/api/v1/invoices/*` | v1 |
| Payments | `/api/v1/payments/*` | v1 |
| Expenses | `/api/v1/expenses/*` | v1 |
| Bank Recon | `/api/v1/bank-reconciliation/*` | v1 |
| Leave | `/api/v1/leave-requests/*` | v1 |
| Settings | `/api/v1/settings/*` | v1 |
| HR | `/api/v1/hr/*` | v1 |
| Saudi Banking | `/api/v1/saudi-banking/*` | v1 |
| Everything else | `/api/v1/*` | v1 |

---

## Important Notes

1. **Leave requests use `/leave-requests/*` not `/leave/*`**
2. **Many CRUD operations use PATCH not PUT for updates**
3. **Bank reconciliation path is `/bank-reconciliation/*` (with hyphen)**
4. **Currency routes exist at both `/api/currency/*` and `/api/v1/bank-reconciliation/currency/*`**
5. **HR Advances use `:advanceId` parameter, not `:id`**
6. **Retainers use "replenish" not "deposit", "history" not "transactions"**
7. **MUDAD compliance routes use POST not GET**
